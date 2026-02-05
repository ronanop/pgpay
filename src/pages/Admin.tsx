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
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { signOut } from '@/lib/auth';
import { PaymentTicket, Profile, TicketStatus } from '@/types/database';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Label } from '@/components/ui/label';

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
                />
              ))
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-3">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={exportUsersCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
            {users.map(user => (
              <div key={user.id} className="mobile-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{user.name || 'No name'}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-sm text-muted-foreground">{user.phone}</p>
                  </div>
                  <Badge variant="outline">
                    {format(new Date(user.created_at), 'MMM d, yyyy')}
                  </Badge>
                </div>
                {(user.bank_name || user.upi_id) && (
                  <div className="mt-3 pt-3 border-t border-border text-sm text-muted-foreground">
                    {user.bank_name && <p>Bank: {user.bank_name}</p>}
                    {user.upi_id && <p>UPI: {user.upi_id}</p>}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </main>

    </div>
  );
}

function TicketAdminCard({ ticket, onClick }: { ticket: TicketWithProfile; onClick: () => void }) {
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const profile = ticket.profiles as any;

  return (
    <button
      onClick={onClick}
      className="mobile-card w-full text-left transition-all hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
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
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <Badge className={cn("text-xs", status.className)}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </button>
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
