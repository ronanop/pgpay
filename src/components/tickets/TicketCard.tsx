import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, RefreshCw, Archive, Shuffle, BarChart3, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentTicket, TicketStatus, UsdtType } from '@/types/database';

interface TicketCardProps {
  ticket: PaymentTicket;
  onClick?: () => void;
}

const usdtTypeConfig: Record<UsdtType, { icon: typeof Shuffle; label: string; colorClass: string }> = {
  mixed: { icon: Shuffle, label: 'Mixed', colorClass: 'text-primary' },
  stock: { icon: BarChart3, label: 'Stock', colorClass: 'text-blue-500' },
  game: { icon: Gamepad2, label: 'Game', colorClass: 'text-amber-500' },
};

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
            {ticket.usdt_type && (
              (() => {
                const typeConfig = usdtTypeConfig[ticket.usdt_type];
                const TypeIcon = typeConfig.icon;
                return (
                  <span className={cn("flex items-center gap-0.5 text-xs", typeConfig.colorClass)}>
                    <TypeIcon className="h-3 w-3" />
                    {typeConfig.label}
                  </span>
                );
              })()
            )}
          </div>
          
          {ticket.usdt_rate && (
            <p className="text-xs text-muted-foreground mb-1">
              Rate: ₹{ticket.usdt_rate}
            </p>
          )}
          
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
