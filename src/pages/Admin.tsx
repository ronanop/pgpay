import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  Settings, 
  LogOut,
  RefreshCw,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Archive,
  Download,
  Eye,
  Copy,
  Check,
  Trash2,
  Search,
  Shield,
  UserPlus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { signOut } from '@/lib/auth';
import { PaymentTicket, Profile, TicketStatus, AdminPermission } from '@/types/database';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface TicketWithProfile extends PaymentTicket {
  profiles?: Profile;
}

const statusConfig: Record<TicketStatus, { 
  icon: typeof Clock;
  label: string;
  className: string;
}> = {
  pending: { icon: Clock, label: 'Pending', className: 'bg-warning/15 text-warning' },
  approved: { icon: CheckCircle, label: 'Approved', className: 'bg-success/15 text-success' },
  rejected: { icon: XCircle, label: 'Rejected', className: 'bg-destructive/15 text-destructive' },
  refunded: { icon: RefreshCcw, label: 'Refunded', className: 'bg-info/15 text-info' },
  closed: { icon: Archive, label: 'Closed', className: 'bg-muted text-muted-foreground' },
};

export default function Admin() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketToDelete, setTicketToDelete] = useState<TicketWithProfile | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (!isAdmin) {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  const fetchTickets = useCallback(async () => {
    try {
      // Fetch tickets
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('payment_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;

      // Fetch profiles for all users
      const userIds = [...new Set(ticketsData?.map(t => t.user_id) || [])];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Combine tickets with profiles
      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const ticketsWithProfiles = ticketsData?.map(ticket => ({
        ...ticket,
        profiles: profilesMap.get(ticket.user_id),
      })) || [];

      setTickets(ticketsWithProfiles as TicketWithProfile[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as Profile[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    if (user && isAdmin) {
      fetchTickets();
      fetchUsers();
    }
  }, [user, isAdmin, fetchTickets, fetchUsers]);

  const handleDeleteTicket = async () => {
    if (!ticketToDelete || !user) return;
    
    setDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('payment_tickets')
        .delete()
        .eq('id', ticketToDelete.id);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'ticket_deleted',
          target_type: 'payment_ticket',
          target_id: ticketToDelete.id,
          details: {
            amount: ticketToDelete.amount,
            status: ticketToDelete.status,
            user_id: ticketToDelete.user_id,
          },
        });

      toast.success('Ticket deleted successfully');
      setTicketToDelete(null);
      fetchTickets();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete ticket');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete || !user) return;
    
    setDeleteLoading(true);
    try {
      // Delete user's profile (cascades to other related data)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userToDelete.user_id);

      if (error) throw error;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: 'user_deleted',
          target_type: 'profile',
          target_id: userToDelete.id,
          details: {
            email: userToDelete.email,
            name: userToDelete.name,
          },
        });

      toast.success('User deleted successfully');
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return true;
    const search = userSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u.phone.toLowerCase().includes(search)
    );
  });

  const exportUsersCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Bank Name', 'Account Number', 'IFSC', 'UPI ID', 'Created At'];
    const rows = users.map(u => [
      u.name || '',
      u.email,
      u.phone,
      u.bank_name || '',
      u.bank_account_number || '',
      u.ifsc_code || '',
      u.upi_id || '',
      format(new Date(u.created_at), 'yyyy-MM-dd HH:mm'),
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Users exported successfully!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth', { replace: true });
  };

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'all') return true;
    return t.status === activeTab;
  });

  const pendingCount = tickets.filter(t => t.status === 'pending').length;

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={fetchTickets}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="pending" className="relative">
              <Ticket className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Pending</span>
              {pendingCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">
              <Ticket className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">All</span>
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Tickets Tab */}
          <TabsContent value="pending" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No pending tickets
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <TicketAdminCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="all" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No tickets found
              </div>
            ) : (
              filteredTickets.map(ticket => (
                <TicketAdminCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => navigate(`/admin/ticket/${ticket.id}`)}
                  onDelete={() => setTicketToDelete(ticket)}
                  showDelete
                />
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={exportUsersCSV} className="h-10">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {userSearch ? 'No users found matching your search' : 'No users found'}
              </div>
            ) : (
              filteredUsers.map(u => (
                <div key={u.id} className="mobile-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{u.name || 'No name'}</p>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      <p className="text-sm text-muted-foreground">{u.phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </Badge>
                      <button 
                        onClick={() => setUserToDelete(u)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {(u.bank_name || u.upi_id) && (
                    <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                      {u.bank_name && <p>Bank: {u.bank_name}</p>}
                      {u.upi_id && <p>UPI: {u.upi_id}</p>}
                    </div>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!ticketToDelete} onOpenChange={() => setTicketToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket for ${ticketToDelete?.amount} USDT? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteTicket}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.name || userToDelete?.email}</strong>? This will remove their profile and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TicketAdminCard({ 
  ticket, 
  onClick, 
  onDelete, 
  showDelete = false 
}: { 
  ticket: TicketWithProfile; 
  onClick: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
}) {
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const profile = ticket.profiles as any;

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div className="mobile-card w-full transition-all hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={onClick}
          className="flex-1 min-w-0 text-left active:scale-[0.99]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">${ticket.amount}</span>
            <span className="text-muted-foreground text-sm">USDT</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {profile?.name || profile?.email || 'Unknown User'}
          </p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
          </p>
        </button>
        
        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("text-xs", status.className)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          <div className="flex items-center gap-2">
            {showDelete && (
              <button 
                onClick={handleDelete}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value');
      
      if (error) throw error;
      
      const settingsMap: Record<string, string> = {};
      data?.forEach(s => {
        settingsMap[s.key] = s.value || '';
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value, updated_by: user.id })
        .eq('key', key);

      if (error) throw error;
      
      setSettings(prev => ({ ...prev, [key]: value }));
      toast.success('Setting updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mobile-card space-y-4">
        <h3 className="font-semibold">App Settings</h3>
        
        <div className="space-y-2">
          <Label htmlFor="app_name">App Name</Label>
          <div className="flex gap-2">
            <input
              id="app_name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={settings.app_name || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, app_name: e.target.value }))}
            />
            <Button 
              size="sm" 
              onClick={() => updateSetting('app_name', settings.app_name || '')}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wallet_address">USDT Wallet Address</Label>
          <div className="flex gap-2">
            <input
              id="wallet_address"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
              value={settings.wallet_address || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, wallet_address: e.target.value }))}
            />
            <Button 
              size="sm" 
              onClick={() => updateSetting('wallet_address', settings.wallet_address || '')}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="primary_color">Primary Color</Label>
          <div className="flex gap-2">
            <input
              id="primary_color"
              type="color"
              className="h-10 w-20 rounded-md border border-input bg-background p-1"
              value={settings.primary_color || '#10B981'}
              onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
            />
            <Button 
              size="sm" 
              onClick={() => updateSetting('primary_color', settings.primary_color || '')}
              disabled={saving}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      {/* Admin Management Section */}
      <AdminManagement />
    </div>
  );
}

const PERMISSIONS: { key: AdminPermission; label: string; description: string }[] = [
  { key: 'manage_tickets', label: 'Manage Tickets', description: 'View and process payment tickets' },
  { key: 'manage_users', label: 'Manage Users', description: 'View and delete user accounts' },
  { key: 'manage_settings', label: 'Manage Settings', description: 'Change app settings' },
  { key: 'manage_admins', label: 'Manage Admins', description: 'Add or remove other admins (Super Admin)' },
];

interface AdminWithPermissions {
  user_id: string;
  profile: Profile | null;
  permissions: AdminPermission[];
  isSuperAdmin: boolean;
}

function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<AdminPermission[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [canManageAdmins, setCanManageAdmins] = useState(false);

  useEffect(() => {
    fetchAdmins();
    fetchUsers();
    checkPermission();
  }, []);

  const checkPermission = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.rpc('can_manage_admins', { _user_id: user.id });
      if (!error) {
        setCanManageAdmins(data || false);
      }
    } catch (error) {
      console.error('Error checking permission:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      // Get all admin users from user_roles
      const { data: adminRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      if (adminUserIds.length === 0) {
        setAdmins([]);
        setLoading(false);
        return;
      }

      // Get profiles for admins
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', adminUserIds);

      if (profilesError) throw profilesError;

      // Get permissions for admins
      const { data: permissions, error: permissionsError } = await supabase
        .from('admin_permissions')
        .select('*')
        .in('user_id', adminUserIds);

      if (permissionsError && permissionsError.code !== 'PGRST116') {
        console.error('Permissions error:', permissionsError);
      }

      // Build admin list
      const adminList: AdminWithPermissions[] = adminUserIds.map(userId => {
        const profile = profiles?.find(p => p.user_id === userId) || null;
        const userPerms = permissions?.filter(p => p.user_id === userId).map(p => p.permission as AdminPermission) || [];
        // Super admin = has no permissions set (original admin) or has manage_admins
        const isSuperAdmin = userPerms.length === 0 || userPerms.includes('manage_admins');
        
        return {
          user_id: userId,
          profile: profile as Profile | null,
          permissions: userPerms,
          isSuperAdmin,
        };
      });

      setAdmins(adminList);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as Profile[]) || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleAddAdmin = async () => {
    if (!selectedUser || !user || selectedPermissions.length === 0) return;

    setSaving(true);
    try {
      // First, add user to admin role if not already
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: selectedUser.user_id, role: 'admin' }, { onConflict: 'user_id' });

      if (roleError) throw roleError;

      // Then add permissions
      const permissionInserts = selectedPermissions.map(permission => ({
        user_id: selectedUser.user_id,
        permission,
        granted_by: user.id,
      }));

      const { error: permError } = await supabase
        .from('admin_permissions')
        .insert(permissionInserts);

      if (permError) throw permError;

      toast.success('Admin added successfully!');
      setShowAddDialog(false);
      setSelectedUser(null);
      setSelectedPermissions([]);
      setUserSearch('');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add admin');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAdmin = async (adminUserId: string) => {
    if (!user) return;

    setSaving(true);
    try {
      // Remove all permissions
      await supabase
        .from('admin_permissions')
        .delete()
        .eq('user_id', adminUserId);

      // Remove admin role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', adminUserId)
        .eq('role', 'admin');

      toast.success('Admin removed successfully!');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove admin');
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (!userSearch.trim()) return false;
    const search = userSearch.toLowerCase();
    const isAlreadyAdmin = admins.some(a => a.user_id === u.user_id);
    return !isAlreadyAdmin && (
      u.name?.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u.phone.toLowerCase().includes(search)
    );
  });

  if (!canManageAdmins) {
    return null;
  }

  return (
    <div className="mobile-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Admin Management</h3>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" />
          Add Admin
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No admins configured</p>
      ) : (
        <div className="space-y-3">
          {admins.map(admin => (
            <div key={admin.user_id} className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{admin.profile?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{admin.profile?.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {admin.isSuperAdmin && (
                    <Badge className="bg-primary/15 text-primary text-xs">Super Admin</Badge>
                  )}
                  {admin.user_id !== user?.id && (
                    <button 
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={saving}
                      className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {!admin.isSuperAdmin && admin.permissions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {admin.permissions.map(perm => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {PERMISSIONS.find(p => p.key === perm)?.label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Admin Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Add Child Admin</h3>
              <button onClick={() => setShowAddDialog(false)} className="p-1 hover:bg-muted rounded">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* User Search */}
            <div className="space-y-3 mb-4">
              <Label>Select User</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm"
                />
              </div>
              
              {filteredUsers.length > 0 && (
                <div className="border rounded-lg max-h-40 overflow-y-auto">
                  {filteredUsers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setSelectedUser(u);
                        setUserSearch(u.name || u.email);
                      }}
                      className={cn(
                        "w-full p-2 text-left hover:bg-muted transition-colors",
                        selectedUser?.id === u.id && "bg-primary/10"
                      )}
                    >
                      <p className="font-medium text-sm">{u.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </button>
                  ))}
                </div>
              )}

              {selectedUser && (
                <div className="p-2 rounded-lg bg-primary/10 text-sm">
                  Selected: <strong>{selectedUser.name || selectedUser.email}</strong>
                </div>
              )}
            </div>

            {/* Permission Selection */}
            <div className="space-y-3 mb-6">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {PERMISSIONS.map(perm => (
                  <label key={perm.key} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                    <Checkbox
                      checked={selectedPermissions.includes(perm.key)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedPermissions([...selectedPermissions, perm.key]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter(p => p !== perm.key));
                        }
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium">{perm.label}</p>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleAddAdmin}
                disabled={!selectedUser || selectedPermissions.length === 0 || saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Admin'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Copyable field component
function CopyableField({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!value) return null;

  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={handleCopy}
      >
        {copied ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

// Bank details section
function BankDetailsSection({ profile }: { profile: Profile }) {
  const hasBankDetails = profile.bank_name || profile.bank_account_number || profile.ifsc_code || profile.upi_id;

  if (!hasBankDetails) {
    return (
      <div className="p-3 rounded-lg border border-dashed border-border">
        <p className="text-sm text-muted-foreground text-center">No bank details provided</p>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border border-border space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Bank Details</p>
      <CopyableField label="Bank Name" value={profile.bank_name} />
      <CopyableField label="Account Number" value={profile.bank_account_number} />
      <CopyableField label="IFSC Code" value={profile.ifsc_code} />
      <CopyableField label="UPI ID" value={profile.upi_id} />
    </div>
  );
}
