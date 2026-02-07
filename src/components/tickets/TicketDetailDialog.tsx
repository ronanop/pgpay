import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, RefreshCw, Archive, AlertCircle, Shuffle, BarChart3, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentTicket, TicketStatus, UsdtType } from '@/types/database';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface TicketDetailDialogProps {
  ticket: PaymentTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const usdtTypeConfig: Record<UsdtType, { icon: typeof Shuffle; label: string; colorClass: string; bgClass: string }> = {
  mixed: { icon: Shuffle, label: 'Mixed', colorClass: 'text-primary', bgClass: 'bg-primary/10' },
  stock: { icon: BarChart3, label: 'Stock', colorClass: 'text-blue-500', bgClass: 'bg-blue-500/10' },
  game: { icon: Gamepad2, label: 'Game', colorClass: 'text-amber-500', bgClass: 'bg-amber-500/10' },
};

const statusConfig: Record<TicketStatus, { 
  icon: typeof Clock;
  label: string;
  className: string;
  bgClassName: string;
}> = {
  pending: {
    icon: Clock,
    label: 'Pending Approval',
    className: 'text-warning',
    bgClassName: 'bg-warning/15 text-warning',
  },
  approved: {
    icon: CheckCircle,
    label: 'Approved',
    className: 'text-success',
    bgClassName: 'bg-success/15 text-success',
  },
  rejected: {
    icon: XCircle,
    label: 'Rejected',
    className: 'text-destructive',
    bgClassName: 'bg-destructive/15 text-destructive',
  },
  refunded: {
    icon: RefreshCw,
    label: 'Refunded',
    className: 'text-info',
    bgClassName: 'bg-info/15 text-info',
  },
  closed: {
    icon: Archive,
    label: 'Closed',
    className: 'text-muted-foreground',
    bgClassName: 'bg-muted text-muted-foreground',
  },
};

export function TicketDetailDialog({ ticket, open, onOpenChange }: TicketDetailDialogProps) {
  if (!ticket) return null;

  const status = statusConfig[ticket.status];
  const StatusIcon = status.icon;
  const isRejected = ticket.status === 'rejected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", status.className)} />
            Ticket Details
          </DialogTitle>
          <DialogDescription>
            View your payment ticket information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold">${ticket.amount.toLocaleString()} <span className="text-base font-normal text-muted-foreground">USDT</span></p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(ticket.created_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
            <Badge className={status.bgClassName}>
              {status.label}
            </Badge>
          </div>

          {/* USDT Type & Rate */}
          {ticket.usdt_type && (
            <div className="flex items-center gap-3">
              {(() => {
                const typeConfig = usdtTypeConfig[ticket.usdt_type];
                const TypeIcon = typeConfig.icon;
                return (
                  <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", typeConfig.bgClass)}>
                    <TypeIcon className={cn("h-4 w-4", typeConfig.colorClass)} />
                    <span className={cn("font-medium", typeConfig.colorClass)}>{typeConfig.label}</span>
                  </div>
                );
              })()}
              {ticket.usdt_rate && (
                <div className="text-sm text-muted-foreground">
                  Rate: <span className="font-medium text-foreground">₹{ticket.usdt_rate}</span>
                </div>
              )}
            </div>
          )}

          {/* Rejection Reason - Highlighted for rejected tickets */}
          {isRejected && ticket.admin_notes && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive mb-1">Rejection Reason</p>
                  <p className="text-sm text-foreground">{ticket.admin_notes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Admin Notes for non-rejected tickets */}
          {!isRejected && ticket.admin_notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Admin Notes</p>
              <p className="text-sm">{ticket.admin_notes}</p>
            </div>
          )}

          {/* User Notes */}
          {ticket.notes && (
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">Your Notes</p>
              <p className="text-sm">{ticket.notes}</p>
            </div>
          )}

          {/* Processed Info */}
          {ticket.processed_at && (
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Processed on {format(new Date(ticket.processed_at), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
