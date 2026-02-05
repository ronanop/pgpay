import { useMemo } from 'react';
import { 
  Users, 
  DollarSign, 
  Ticket, 
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PaymentTicket, Profile } from '@/types/database';
import { format, isToday, startOfDay, subDays, isWithinInterval } from 'date-fns';

interface AdminDashboardProps {
  tickets: PaymentTicket[];
  users: Profile[];
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconClassName?: string;
}

function StatCard({ title, value, subtitle, icon: Icon, iconClassName }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconClassName || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard({ tickets, users, loading }: AdminDashboardProps) {
  const stats = useMemo(() => {
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const last7Days = subDays(today, 7);
    const last30Days = subDays(today, 30);

    // Today's approved tickets
    const todayApproved = tickets.filter(t => 
      t.status === 'approved' && 
      t.processed_at && 
      isToday(new Date(t.processed_at))
    );
    const todayCollection = todayApproved.reduce((sum, t) => sum + Number(t.amount), 0);

    // Yesterday's collection for comparison
    const yesterdayApproved = tickets.filter(t => 
      t.status === 'approved' && 
      t.processed_at && 
      isWithinInterval(new Date(t.processed_at), { start: yesterday, end: today })
    );
    const yesterdayCollection = yesterdayApproved.reduce((sum, t) => sum + Number(t.amount), 0);

    // Last 7 days collection
    const last7DaysApproved = tickets.filter(t => 
      t.status === 'approved' && 
      t.processed_at && 
      new Date(t.processed_at) >= last7Days
    );
    const last7DaysCollection = last7DaysApproved.reduce((sum, t) => sum + Number(t.amount), 0);

    // Last 30 days collection
    const last30DaysApproved = tickets.filter(t => 
      t.status === 'approved' && 
      t.processed_at && 
      new Date(t.processed_at) >= last30Days
    );
    const last30DaysCollection = last30DaysApproved.reduce((sum, t) => sum + Number(t.amount), 0);

    // Total collection (all time)
    const totalApproved = tickets.filter(t => t.status === 'approved');
    const totalCollection = totalApproved.reduce((sum, t) => sum + Number(t.amount), 0);

    // Ticket status counts
    const pendingTickets = tickets.filter(t => t.status === 'pending').length;
    const approvedTickets = tickets.filter(t => t.status === 'approved').length;
    const rejectedTickets = tickets.filter(t => t.status === 'rejected').length;
    const refundedTickets = tickets.filter(t => t.status === 'refunded').length;

    // Users stats
    const totalUsers = users.length;
    const todayUsers = users.filter(u => isToday(new Date(u.created_at))).length;
    const last7DaysUsers = users.filter(u => new Date(u.created_at) >= last7Days).length;

    return {
      todayCollection,
      yesterdayCollection,
      last7DaysCollection,
      last30DaysCollection,
      totalCollection,
      pendingTickets,
      approvedTickets,
      rejectedTickets,
      refundedTickets,
      totalTickets: tickets.length,
      totalUsers,
      todayUsers,
      last7DaysUsers,
    };
  }, [tickets, users]);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-24" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          subtitle={stats.todayUsers > 0 ? `+${stats.todayUsers} today` : 'No new users today'}
          icon={Users}
          iconClassName="text-primary"
        />
        <StatCard
          title="Today's Collection"
          value={`$${stats.todayCollection.toLocaleString()}`}
          subtitle="USDT from approved tickets"
          icon={DollarSign}
          iconClassName="text-success"
        />
        <StatCard
          title="Pending Tickets"
          value={stats.pendingTickets}
          subtitle="Awaiting review"
          icon={Clock}
          iconClassName="text-warning"
        />
        <StatCard
          title="Total Collection"
          value={`$${stats.totalCollection.toLocaleString()}`}
          subtitle="All time approved"
          icon={TrendingUp}
          iconClassName="text-primary"
        />
      </div>

      {/* Collection Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Collection Overview</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Yesterday
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${stats.yesterdayCollection.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">USDT collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${stats.last7DaysCollection.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">USDT collected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">${stats.last30DaysCollection.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">USDT collected</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Ticket Status Breakdown */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Ticket Status</h3>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/15">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingTickets}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/15">
                  <CheckCircle className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approvedTickets}</p>
                  <p className="text-xs text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-destructive/15">
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.rejectedTickets}</p>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-info/15">
                  <RefreshCcw className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.refundedTickets}</p>
                  <p className="text-xs text-muted-foreground">Refunded</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* User Stats */}
      <div>
        <h3 className="text-lg font-semibold mb-3">User Growth</h3>
        <div className="grid gap-4 grid-cols-2">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">New Users Today</p>
                  <p className="text-2xl font-bold">{stats.todayUsers}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Last 7 Days</p>
                  <p className="text-2xl font-bold">{stats.last7DaysUsers}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
