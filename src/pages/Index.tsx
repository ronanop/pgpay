import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Loader2 } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { WalletCard } from '@/components/tickets/WalletCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { SubmitTicketSheet } from '@/components/tickets/SubmitTicketSheet';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PaymentTicket } from '@/types/database';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<PaymentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true });
    } else if (!authLoading && user && isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [user, authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (user && !isAdmin) {
      fetchTickets();
    }
  }, [user, isAdmin]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data as PaymentTicket[]) || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Activity</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Wallet Card */}
        <WalletCard />

        {/* Tickets List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Tickets</h2>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No tickets yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tap the + button to submit your first payment proof
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard key={ticket.id} ticket={ticket} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setSubmitOpen(true)}
        className="fab"
        style={{ bottom: '5.5rem', right: '1.5rem' }}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Submit Sheet */}
      <SubmitTicketSheet
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSuccess={fetchTickets}
      />
    </MobileLayout>
  );
}
