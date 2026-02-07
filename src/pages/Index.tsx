import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { WalletCard } from '@/components/tickets/WalletCard';
import { UsdtRatesCard } from '@/components/tickets/UsdtRatesCard';
import { TicketCard } from '@/components/tickets/TicketCard';
import { SubmitTicketSheet } from '@/components/tickets/SubmitTicketSheet';
import { TicketDetailDialog } from '@/components/tickets/TicketDetailDialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PaymentTicket } from '@/types/database';
import { toast } from 'sonner';
import { LoadingScreen, LoadingSpinner } from '@/components/ui/loading-screen';

export default function Index() {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [tickets, setTickets] = useState<PaymentTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<PaymentTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const previousTicketsRef = useRef<Map<string, PaymentTicket>>(new Map());

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

      // Subscribe to realtime updates for this user's tickets
      const channel = supabase
        .channel('user-tickets')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'payment_tickets',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedTicket = payload.new as PaymentTicket;
            const oldTicket = previousTicketsRef.current.get(updatedTicket.id);

            // Check if status changed to rejected
            if (oldTicket && oldTicket.status !== 'rejected' && updatedTicket.status === 'rejected') {
              // Show notification for rejected ticket
              toast.error(
                `Your ticket for $${updatedTicket.amount} USDT was rejected`,
                {
                  description: updatedTicket.admin_notes || 'Tap to view details',
                  duration: 10000,
                  action: {
                    label: 'View',
                    onClick: () => {
                      setSelectedTicket(updatedTicket);
                      setDetailOpen(true);
                    },
                  },
                }
              );
            } else if (oldTicket && oldTicket.status !== 'approved' && updatedTicket.status === 'approved') {
              // Show notification for approved ticket
              toast.success(
                `Your ticket for $${updatedTicket.amount} USDT was approved!`,
                {
                  duration: 5000,
                }
              );
            }

            // Update the ticket in state
            setTickets((prev) =>
              prev.map((t) => (t.id === updatedTicket.id ? updatedTicket : t))
            );

            // Update the reference
            previousTicketsRef.current.set(updatedTicket.id, updatedTicket);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, isAdmin]);

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const ticketsData = (data as PaymentTicket[]) || [];
      setTickets(ticketsData);
      
      // Store current tickets for comparison
      previousTicketsRef.current.clear();
      ticketsData.forEach((t) => previousTicketsRef.current.set(t.id, t));
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

  const handleTicketClick = (ticket: PaymentTicket) => {
    setSelectedTicket(ticket);
    setDetailOpen(true);
  };

  if (authLoading || !user) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <MobileLayout 
      showCenterAction={true} 
      onCenterAction={() => setSubmitOpen(true)}
    >
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

        {/* USDT Rates */}
        <UsdtRatesCard />

        {/* Tickets List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your Tickets</h2>
          
          {loading ? (
            <LoadingSpinner />
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
                <TicketCard 
                  key={ticket.id} 
                  ticket={ticket} 
                  onClick={() => handleTicketClick(ticket)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit Sheet */}
      <SubmitTicketSheet
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        onSuccess={fetchTickets}
      />

      {/* Ticket Detail Dialog */}
      <TicketDetailDialog
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </MobileLayout>
  );
}
