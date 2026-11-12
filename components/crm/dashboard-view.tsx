'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  formatINR,
} from '@/lib/money';
import {
  IndianFYOption,
  getIndianFinancialYearOptions,
  computeDashboardMetrics,
  DashboardMetricsResult,
} from '@/lib/dashboard/metrics';
import { UserRole } from '@/lib/constants/permissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  RotateCcw,
  Plus,
  Inbox,
  AlertTriangle,
  TrendingUp,
  Receipt,
  Users,
  CheckCircle2,
  CalendarDays,
  Truck,
  ChevronRight,
  ShieldAlert,
  Info,
  IndianRupee,
} from 'lucide-react';

interface DashboardViewProps {
  userRole: UserRole;
  rawEnquiries: any[];
  rawQuotations: any[];
  rawClients: any[];
  rawBookings: any[];
  rawInvoices: any[];
  rawPayments: any[];
  rawEvents: any[];
  rawDeliveryStages: any[];
}

export function DashboardView({
  userRole,
  rawEnquiries,
  rawQuotations,
  rawClients,
  rawBookings,
  rawInvoices,
  rawPayments,
  rawEvents,
  rawDeliveryStages,
}: DashboardViewProps) {
  const router = useRouter();

  const fyOptions = React.useMemo(() => getIndianFinancialYearOptions(), []);
  const [selectedFYKey, setSelectedFYKey] = React.useState<string>(
    fyOptions[1]?.key || fyOptions[0]?.key || 'all'
  );
  const [lastRefreshed, setLastRefreshed] = React.useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Selected FY
  const selectedFY = React.useMemo(
    () => fyOptions.find((f) => f.key === selectedFYKey),
    [fyOptions, selectedFYKey]
  );

  // Compute metrics based on selected FY and role
  const metrics: DashboardMetricsResult = React.useMemo(() => {
    return computeDashboardMetrics({
      userRole,
      enquiries: rawEnquiries,
      quotations: rawQuotations,
      clients: rawClients,
      bookings: rawBookings,
      invoices: rawInvoices,
      payments: rawPayments,
      events: rawEvents,
      deliveryStages: rawDeliveryStages,
      selectedFY,
    });
  }, [
    userRole,
    rawEnquiries,
    rawQuotations,
    rawClients,
    rawBookings,
    rawInvoices,
    rawPayments,
    rawEvents,
    rawDeliveryStages,
    selectedFY,
  ]);

  // 5-minute auto-refresh interval
  React.useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
      setLastRefreshed(new Date());
    }, 5 * 60 * 1000); // 300,000 ms

    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setLastRefreshed(new Date());
      setIsRefreshing(false);
    }, 600);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Banner Notice */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-secondary-container text-on-secondary-container text-xs sm:text-sm gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            <strong>Studio Node: Active</strong> — Production Engine v2.4 running
            with real-time ledger verification.
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-outline font-medium">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Last synced: {lastRefreshed.toLocaleTimeString('en-IN', { hour12: true })}
          </span>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <RotateCcw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Header Block & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-on-surface">
            Studio Overview
          </h1>
          <p className="text-xs sm:text-sm text-outline mt-0.5">
            {metrics.hasFinancialAccess
              ? 'Executive briefing, sales velocity, and production pipeline.'
              : 'Production operations, schedule velocity, and delivery pipelines.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Indian FY Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/40 rounded-lg px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-outline" />
            <select
              value={selectedFYKey}
              onChange={(e) => setSelectedFYKey(e.target.value)}
              className="bg-transparent font-medium text-on-surface focus:outline-none cursor-pointer"
            >
              {fyOptions.map((fy) => (
                <option key={fy.key} value={fy.key}>
                  {fy.label}
                </option>
              ))}
              <option value="all">All Time</option>
            </select>
          </div>

          <Link href="/crm/enquiries">
            <Button variant="outline" size="sm" className="h-9 text-xs">
              <Inbox className="w-4 h-4 mr-1.5" />
              Enquiries
            </Button>
          </Link>

          {userRole !== 'staff' && userRole !== 'crew_member' && (
            <Link href="/crm/quotations/new">
              <Button
                size="sm"
                className="h-9 text-xs bg-[#4c6452] hover:bg-[#3d5242] text-white"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Quotation
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Role-Filtered KPI Tiles */}
      {metrics.hasFinancialAccess ? (
        /* SA, Business Owner, Accountant Financial KPI Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-outline">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Accepted Value
              </span>
              <IndianRupee className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-on-surface">
              {formatINR(metrics.acceptedRevenuePaise ?? 0n)}
            </div>
            <p className="text-xs text-outline">{metrics.selectedFYLabel} confirmed bookings</p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-outline">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Pipeline Forecast
              </span>
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-on-surface">
              {formatINR(metrics.pipelineForecastPaise ?? 0n)}
            </div>
            <p className="text-xs text-outline">In open quotes / negotiations</p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-outline">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Collected Revenue
              </span>
              <Receipt className="w-5 h-5 text-secondary" />
            </div>
            <div className="text-2xl font-bold text-secondary">
              {formatINR(metrics.collectedRevenuePaise ?? 0n)}
            </div>
            <p className="text-xs text-outline">Verified receipts in ledger</p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
            <div className="flex items-center justify-between text-outline">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Active Enquiries
              </span>
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.activeEnquiriesCount}
            </div>
            <p className="text-xs text-outline">Active sales conversations</p>
          </div>
        </div>
      ) : (
        /* Manager & Staff Operations KPI Grid (STRICTLY ZERO FINANCIAL METRICS per RBAC R3) */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <Link
            href="/crm/enquiries"
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40 space-y-1 hover:border-primary/50 transition-all block"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Active Enquiries
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.activeEnquiriesCount}
            </div>
            <span className="text-[11px] text-primary font-medium">In Pipeline →</span>
          </Link>

          <Link
            href="/crm/bookings"
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40 space-y-1 hover:border-primary/50 transition-all block"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Confirmed Bookings
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.activeBookingsCount}
            </div>
            <span className="text-[11px] text-secondary font-medium">Active Roster →</span>
          </Link>

          <Link
            href="/crm/schedule"
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40 space-y-1 hover:border-primary/50 transition-all block"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Upcoming Events
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.upcomingEventsCount}
            </div>
            <span className="text-[11px] text-primary font-medium">Schedule →</span>
          </Link>

          <Link
            href="/crm/delivery"
            className={`p-4 rounded-xl shadow-sm border space-y-1 block transition-all ${
              metrics.blockedDeliveryStagesCount > 0
                ? 'bg-error-container/20 border-error/30 hover:border-error'
                : 'bg-surface-container-lowest border-outline-variant/40 hover:border-primary/50'
            }`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Blocked Stages
            </span>
            <div
              className={`text-2xl font-bold ${
                metrics.blockedDeliveryStagesCount > 0 ? 'text-error' : 'text-on-surface'
              }`}
            >
              {metrics.blockedDeliveryStagesCount}
            </div>
            <span
              className={`text-[11px] font-medium ${
                metrics.blockedDeliveryStagesCount > 0 ? 'text-error' : 'text-outline'
              }`}
            >
              {metrics.blockedDeliveryStagesCount > 0 ? 'Action Needed →' : 'Clear'}
            </span>
          </Link>

          <Link
            href="/crm/clients"
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40 space-y-1 hover:border-primary/50 transition-all block"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Total Clients
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.totalClientsCount}
            </div>
            <span className="text-[11px] text-outline font-medium">CRM Profiles →</span>
          </Link>

          <Link
            href="/crm/enquiries"
            className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant/40 space-y-1 hover:border-primary/50 transition-all block"
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-outline block">
              Follow-ups Due
            </span>
            <div className="text-2xl font-bold text-on-surface">
              {metrics.pendingFollowupsCount}
            </div>
            <span className="text-[11px] text-primary font-medium">Review Leads →</span>
          </Link>
        </div>
      )}

      {/* Visual Charts: Financial vs Operations Filtering */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Revenue Chart (Rendered ONLY if hasFinancialAccess) */}
        {metrics.hasFinancialAccess && metrics.monthlyRevenueChart ? (
          <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-medium text-outline tracking-wider">
                  Fiscal Snapshot
                </span>
                <h2 className="text-lg font-semibold text-on-surface">
                  Collected vs Invoiced Revenue
                </h2>
              </div>
              <div className="flex items-center gap-3 text-xs text-outline">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4C6452]"></span> Collected
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#829B87]"></span> Invoiced
                </span>
              </div>
            </div>

            <div className="w-full h-60 relative flex items-end pt-4">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200">
                <defs>
                  <linearGradient id="sageDark" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4C6452" />
                    <stop offset="100%" stopColor="#3D5041" />
                  </linearGradient>
                  <linearGradient id="sageSoft" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#829B87" />
                    <stop offset="100%" stopColor="#9CB3A1" />
                  </linearGradient>
                </defs>
                <line stroke="#E4EAE3" strokeDasharray="3 3" x1="30" x2="590" y1="20" y2="20" />
                <line stroke="#E4EAE3" strokeDasharray="3 3" x1="30" x2="590" y1="70" y2="70" />
                <line stroke="#E4EAE3" strokeDasharray="3 3" x1="30" x2="590" y1="120" y2="120" />
                <line stroke="#E4EAE3" strokeDasharray="3 3" x1="30" x2="590" y1="170" y2="170" />

                {metrics.monthlyRevenueChart.map((m, idx) => {
                  const x = 50 + idx * 90;
                  return (
                    <g key={m.month}>
                      <rect
                        x={x}
                        y={180 - m.collected}
                        width="18"
                        height={m.collected}
                        fill="url(#sageDark)"
                        rx="3"
                      />
                      <rect
                        x={x + 22}
                        y={180 - m.invoiced}
                        width="18"
                        height={m.invoiced}
                        fill="url(#sageSoft)"
                        rx="3"
                      />
                      <text
                        x={x + 20}
                        y="195"
                        fill="#737972"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {m.month}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        ) : (
          /* Operational Upcoming Events Block for Manager */
          <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-medium text-outline tracking-wider">
                  Production Schedule
                </span>
                <h2 className="text-lg font-semibold text-on-surface">Upcoming Events</h2>
              </div>
              <Link href="/crm/schedule" className="text-xs font-semibold text-primary hover:underline">
                View Full Calendar →
              </Link>
            </div>

            <div className="divide-y divide-outline-variant/20">
              {metrics.upcomingEvents.map((ev) => (
                <div key={ev.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-on-surface">{ev.name}</div>
                    <div className="text-outline flex items-center gap-2">
                      <span>{ev.eventType}</span>
                      <span>•</span>
                      <span>{ev.location}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-on-surface">
                      {new Date(ev.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <Badge variant="default" className="ml-2">
                      {ev.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {metrics.upcomingEvents.length === 0 && (
                <div className="py-8 text-center text-outline text-xs">
                  No upcoming events scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Event Composition Donut (Shown to all roles) */}
        <div
          className={`${
            metrics.hasFinancialAccess ? 'lg:col-span-5' : 'lg:col-span-5'
          } bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/40 space-y-4`}
        >
          <div>
            <span className="text-xs uppercase font-medium text-outline tracking-wider">
              Portfolio Composition
            </span>
            <h2 className="text-lg font-semibold text-on-surface">Bookings by Event Type</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            <div className="relative w-36 h-36 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="60" fill="none" stroke="#EAEDE8" strokeWidth="18" />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#4C6452"
                  strokeWidth="18"
                  strokeDasharray="170 377"
                  strokeDashoffset="0"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#829B87"
                  strokeWidth="18"
                  strokeDasharray="113 377"
                  strokeDashoffset="-175"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#B3CDB7"
                  strokeWidth="18"
                  strokeDasharray="56 377"
                  strokeDashoffset="-293"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  fill="none"
                  stroke="#5A605B"
                  strokeWidth="18"
                  strokeDasharray="38 377"
                  strokeDashoffset="-354"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-on-surface">
                  {rawBookings.length || rawQuotations.length}
                </span>
                <span className="text-[10px] uppercase font-semibold text-outline">
                  Projects
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              {metrics.bookingComposition.map((item, idx) => {
                const colors = ['#4C6452', '#829B87', '#B3CDB7', '#5A605B'];
                const color = colors[idx % colors.length];
                return (
                  <div key={item.eventType} className="flex justify-between items-center">
                    <span className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      ></span>
                      <span className="truncate">{item.eventType}</span>
                    </span>
                    <span className="font-semibold ml-2">{item.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Blocked Stages Alert (If any) */}
      {metrics.blockedStages.length > 0 && (
        <div className="p-4 rounded-xl bg-error-container/20 border border-error/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-error uppercase tracking-wider">
              {metrics.blockedStages.length} Delivery Stage(s) Blocked
            </div>
            <div className="text-xs text-on-surface mt-1 space-y-1">
              {metrics.blockedStages.map((st) => (
                <div key={st.id} className="flex items-center justify-between">
                  <span>
                    <strong>{st.bookingNumber}</strong> ({st.clientName}) — {st.stageName}: {st.blockerReason}
                  </span>
                  <Link
                    href={`/crm/delivery`}
                    className="text-xs text-primary font-semibold hover:underline ml-2"
                  >
                    Open Pipeline →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Widget 1: Recent Quotations */}
        <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
          <div className="p-4 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-on-surface">Recent Quotations</h3>
              <p className="text-xs text-outline">Latest client proposals and deal statuses</p>
            </div>
            <Link href="/crm/quotations" className="text-xs font-semibold text-primary hover:underline">
              View All →
            </Link>
          </div>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-surface-container-low/40 text-[11px] text-outline uppercase font-semibold">
              <tr>
                <th className="py-2.5 px-4">Quotation #</th>
                <th className="py-2.5 px-4">Client</th>
                {metrics.hasFinancialAccess && (
                  <th className="py-2.5 px-4 text-right">Total</th>
                )}
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {metrics.recentQuotations.map((q) => (
                <tr key={q.id} className="hover:bg-surface-container-low/30">
                  <td className="py-3 px-4 font-semibold text-primary">
                    <Link href={`/crm/quotations/${q.id}`} className="hover:underline">
                      {q.quotationNumber}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-on-surface font-medium">{q.clientName}</td>
                  {metrics.hasFinancialAccess && (
                    <td className="py-3 px-4 text-right font-semibold text-on-surface">
                      {q.totalPaise !== null ? formatINR(q.totalPaise) : '—'}
                    </td>
                  )}
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant={
                        q.status === 'accepted'
                          ? 'success'
                          : q.status === 'sent'
                          ? 'info'
                          : 'default'
                      }
                    >
                      {q.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {metrics.recentQuotations.length === 0 && (
                <tr>
                  <td colSpan={metrics.hasFinancialAccess ? 4 : 3} className="py-6 text-center text-outline">
                    No quotations available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Widget 2: Overdue Invoices (if financial) OR Recent Enquiries (if manager) */}
        {metrics.hasFinancialAccess && metrics.overdueInvoices !== null ? (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Overdue Invoices</h3>
                <p className="text-xs text-outline">Pending receivables past client due date</p>
              </div>
              <Link href="/crm/invoices" className="text-xs font-semibold text-primary hover:underline">
                View Ledger →
              </Link>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/40 text-[11px] text-outline uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Client</th>
                  <th className="py-2.5 px-4 text-right">Balance Due</th>
                  <th className="py-2.5 px-4 text-center">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {metrics.overdueInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3 px-4 font-semibold text-primary">
                      <Link href={`/crm/invoices`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-on-surface font-medium">{inv.clientName}</td>
                    <td className="py-3 px-4 text-right font-semibold text-error">
                      {formatINR(inv.balancePaise)}
                    </td>
                    <td className="py-3 px-4 text-center text-outline font-medium">
                      {new Date(inv.dueDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </td>
                  </tr>
                ))}
                {metrics.overdueInvoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-outline">
                      <div className="flex items-center justify-center gap-1.5 text-secondary">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>All invoices settled or within payment terms.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
            <div className="p-4 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-on-surface">Recent Enquiries</h3>
                <p className="text-xs text-outline">High-velocity prospective weddings</p>
              </div>
              <Link href="/crm/enquiries" className="text-xs font-semibold text-primary hover:underline">
                View All Enquiries →
              </Link>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/40 text-[11px] text-outline uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Contact</th>
                  <th className="py-2.5 px-4">Event Type</th>
                  <th className="py-2.5 px-4">Event Date</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {metrics.recentEnquiries.map((e) => (
                  <tr key={e.id} className="hover:bg-surface-container-low/30">
                    <td className="py-3 px-4 font-semibold text-on-surface">{e.clientName}</td>
                    <td className="py-3 px-4 text-outline">{e.eventType}</td>
                    <td className="py-3 px-4 text-outline">
                      {e.eventDate
                        ? new Date(e.eventDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'TBD'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={e.status === 'won' ? 'success' : 'default'}>
                        {e.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {metrics.recentEnquiries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-outline">
                      No enquiries logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
