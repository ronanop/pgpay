import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, RefreshCw, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentTicket, TicketStatus } from '@/types/database';

interface TicketCardProps {
  ticket: PaymentTicket;
  onClick?: () => void;
}

const statusConfig: Record<TicketStatus, { 
  icon: typeof Clock;
  label: string;
  className: string;
}> = {
  pending: {
    icon: Clock,
    label: 'Pending Approval',
    className: 'status-pending',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    className: 'status-approved',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    className: 'status-rejected',
  },
  refunded: {
    icon: RefreshCw,
    label: 'Refunded',
    className: 'status-refunded',
  },
  closed: {
    icon: Archive,
    label: 'Closed',
    className: 'status-closed',
  },
};

export function TicketCard({ ticket, onClick }: TicketCardProps) {
  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;

  return (
    <button
      onClick={onClick}
      className="mobile-card w-full text-left transition-all hover:shadow-md active:scale-[0.99] animate-slide-up"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-lg">
              ${ticket.amount.toLocaleString()}
            </span>
            <span className="text-muted-foreground text-sm">USDT</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
          </p>
          
          {ticket.notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {ticket.notes}
            </p>
          )}
        </div>
        
        <div className={cn(
          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium shrink-0",
          status.className
        )}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{status.label}</span>
        </div>
      </div>
    </button>
  );
}
