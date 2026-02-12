import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw,
  Archive,
  Download,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PaymentTicket, Profile, TicketStatus } from '@/types/database';
import { toast } from 'sonner';
import { format } from 'date-fns';

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

export default function AdminTicketDetail() {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user, loading: authLoading, isAdmin } = useAuth();
  
  const [ticket, setTicket] = useState<TicketWithProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [loadingProofImage, setLoadingProofImage] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth', { replace: true });
      } else if (!isAdmin) {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && isAdmin && ticketId) {
      fetchTicket();
    }
  }, [user, isAdmin, ticketId]);

  const fetchTicket = async () => {
    if (!ticketId) return;
    
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('payment_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;

      // Fetch profile for user
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', ticketData.user_id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile error:', profileError);
      }

      setTicket({
        ...ticketData,
        profiles: profileData || undefined,
      } as TicketWithProfile);
      setAdminNotes(ticketData.admin_notes || '');
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
      navigate('/admin');
    } finally {
      setLoading(false);
    }
  };

  // Generate signed URL when ticket is loaded
  useEffect(() => {
    const getSignedUrl = async () => {
      if (ticket?.proof_url) {
        setLoadingProofImage(true);
        try {
          const isFullUrl = ticket.proof_url.startsWith('http');
          
          if (isFullUrl) {
            const urlParts = ticket.proof_url.split('/payment-proofs/');
            if (urlParts.length > 1) {
              const path = urlParts[1];
              const { data, error } = await supabase.storage
                .from('payment-proofs')
                .createSignedUrl(path, 3600);
              
              if (!error && data?.signedUrl) {
                setProofImageUrl(data.signedUrl);
              } else {
                setProofImageUrl(ticket.proof_url);
              }
            } else {
              setProofImageUrl(ticket.proof_url);
            }
          } else {
            const { data, error } = await supabase.storage
              .from('payment-proofs')
              .createSignedUrl(ticket.proof_url, 3600);
            
            if (!error && data?.signedUrl) {
              setProofImageUrl(data.signedUrl);
            } else {
              console.error('Error creating signed URL:', error);
              setProofImageUrl(null);
            }
          }
        } catch (error) {
          console.error('Error getting signed URL:', error);
          setProofImageUrl(null);
        } finally {
          setLoadingProofImage(false);
        }
      } else {
        setProofImageUrl(null);
      }
    };

    getSignedUrl();
  }, [ticket]);

  const handleTicketAction = async (action: TicketStatus) => {
    if (!ticket || !user) return;
    
    setActionLoading(true);
    try {
      const { error: ticketError } = await supabase
        .from('payment_tickets')
        .update({
          status: action,
          admin_notes: adminNotes || null,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (ticketError) throw ticketError;

      // Create audit log
      await supabase
        .from('audit_logs')
        .insert({
          admin_id: user.id,
          action: `ticket_${action}`,
          target_type: 'payment_ticket',
          target_id: ticket.id,
          details: {
            previous_status: ticket.status,
            new_status: action,
            admin_notes: adminNotes,
          },
        });

      toast.success(`Ticket ${action} successfully!`);
      navigate('/admin');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update ticket');
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Ticket not found</p>
      </div>
    );
  }

  const profile = ticket.profiles as Profile | undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background safe-area-top">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-lg">
        <div className="flex h-14 items-center gap-3 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Ticket Details</h1>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-safe-area-bottom">
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Ticket Info */}
          <div className="mobile-card space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">${ticket.amount} <span className="text-base font-normal text-muted-foreground">USDT</span></span>
              <Badge className={statusConfig[ticket.status].className}>
                {statusConfig[ticket.status].label}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
            </div>
          </div>

          {/* User Info + Bank Details */}
          {profile && (
            <div className="mobile-card space-y-3">
              <Label className="text-xs text-muted-foreground">User</Label>
              <p className="font-medium">{profile.name || 'Unknown User'}</p>
              <p className="text-sm text-muted-foreground">{profile.email}</p>
              <p className="text-sm text-muted-foreground">{profile.phone}</p>

              {(profile.bank_name || profile.bank_account_number || profile.ifsc_code || profile.bank_account_holder_name) && (
                <>
                  <div className="border-t border-border pt-3" />
                  <BankDetailsSection profile={profile} />
                </>
              )}
            </div>
          )}

          {/* Proof Image */}
          {ticket.proof_url && (
            <div className="mobile-card">
              <Label className="mb-2 block">Payment Proof</Label>
              {loadingProofImage ? (
                <div className="h-48 flex items-center justify-center rounded-lg border bg-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : proofImageUrl ? (
                <a 
                  href={proofImageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={proofImageUrl} 
                    alt="Payment proof" 
                    className="w-full h-48 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                  />
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Download className="h-3 w-3" />
                    Tap to view full size
                  </p>
                </a>
              ) : (
                <div className="h-48 flex items-center justify-center rounded-lg border bg-muted text-muted-foreground">
                  <p className="text-sm">Failed to load image</p>
                </div>
              )}
            </div>
          )}

          {/* User Notes */}
          {ticket.notes && (
            <div className="mobile-card">
              <Label className="mb-2 block">User Notes</Label>
              <p className="text-sm text-muted-foreground">{ticket.notes}</p>
            </div>
          )}

          {/* Admin Notes */}
          <div className="mobile-card">
            <Label htmlFor="admin-notes" className="mb-2 block">Admin Notes</Label>
            <Textarea
              id="admin-notes"
              placeholder="Add notes about this ticket..."
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </main>

      {/* Fixed Action Buttons */}
      {ticket.status === 'pending' && (
        <div className="sticky bottom-0 border-t border-border bg-card p-4 pb-safe-area-bottom">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button 
              className="flex-1 bg-success hover:bg-success/90 h-12"
              onClick={() => handleTicketAction('approved')}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Approve'}
            </Button>
            <Button 
              variant="destructive"
              className="flex-1 h-12"
              onClick={() => handleTicketAction('rejected')}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject'}
            </Button>
          </div>
        </div>
      )}

      {ticket.status === 'approved' && (
        <div className="sticky bottom-0 border-t border-border bg-card p-4 pb-safe-area-bottom">
          <div className="flex gap-3 max-w-lg mx-auto">
            <Button 
              variant="outline"
              className="flex-1 h-12"
              onClick={() => handleTicketAction('refunded')}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refund'}
            </Button>
            <Button 
              variant="secondary"
              className="flex-1 h-12"
              onClick={() => handleTicketAction('closed')}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Close'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BankDetailsSection({ profile }: { profile: Profile }) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const CopyButton = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="p-1.5 rounded hover:bg-muted transition-colors"
    >
      {copiedField === field ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );

  return (
    <div className="space-y-3">
      <Label className="text-xs text-muted-foreground">Bank Details</Label>
      
      {profile.bank_account_holder_name && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Account Holder</p>
            <p className="text-sm font-medium">{profile.bank_account_holder_name}</p>
          </div>
          <CopyButton value={profile.bank_account_holder_name} field="holder" />
        </div>
      )}

      {profile.bank_name && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Bank Name</p>
            <p className="text-sm font-medium">{profile.bank_name}</p>
          </div>
          <CopyButton value={profile.bank_name} field="bank" />
        </div>
      )}
      
      {profile.bank_account_number && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Account Number</p>
            <p className="text-sm font-mono">{profile.bank_account_number}</p>
          </div>
          <CopyButton value={profile.bank_account_number} field="account" />
        </div>
      )}
      
      {profile.ifsc_code && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">IFSC Code</p>
            <p className="text-sm font-mono">{profile.ifsc_code}</p>
          </div>
          <CopyButton value={profile.ifsc_code} field="ifsc" />
        </div>
      )}
    </div>
  );
}
