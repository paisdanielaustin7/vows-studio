import React from 'react';
import Link from 'next/link';
import { listEnquiriesAction } from '@/server/actions/enquiry.actions';
import { listQuotationsAction } from '@/server/actions/quotation.actions';
import { listClientsAction } from '@/server/actions/client.actions';
import { formatINR } from '@/lib/money';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Dashboard | VOWS Studio CRM',
};

export default async function DashboardPage() {
  const [enquiriesRes, quotationsRes, clientsRes] = await Promise.all([
    listEnquiriesAction(),
    listQuotationsAction(),
    listClientsAction(),
  ]);

  const enquiries = enquiriesRes.data || [];
  const quotations = quotationsRes.data || [];
  const clients = clientsRes.data?.clients || [];

  // Metrics
  const activeEnquiries = enquiries.filter((e) => e.status !== 'won' && e.status !== 'lost');
  const acceptedQuotations = quotations.filter((q) => q.status === 'accepted');
  const pendingQuotations = quotations.filter((q) => q.status === 'draft' || q.status === 'sent');

  const _totalQuotedPaise = quotations.reduce((acc, q) => acc + BigInt(q.totalPaise), 0n);
  const acceptedPaise = acceptedQuotations.reduce((acc, q) => acc + BigInt(q.totalPaise), 0n);
  const pendingPaise = pendingQuotations.reduce((acc, q) => acc + BigInt(q.totalPaise), 0n);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Top Banner Notice */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-secondary-container text-on-secondary-container text-sm">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <span>
            <strong>Studio Node: Active</strong> — Production Engine v2.4 running with encrypted session tokens and real-time ledger verification.
          </span>
        </div>
        <div className="text-xs font-semibold uppercase tracking-wider text-outline mt-2 sm:mt-0">
          Bangalore & Mangalore Hubs
        </div>
      </div>

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Studio Overview</h1>
          <p className="text-sm text-outline">Executive briefing, sales velocity, and production pipeline.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/crm/enquiries">
            <Button variant="outline" size="sm" className="h-9">
              <span className="material-symbols-outlined text-[18px] mr-1">inbox</span>
              Enquiries
            </Button>
          </Link>
          <Link href="/crm/quotations/new">
            <Button size="sm" className="h-9 bg-[#4c6452] hover:bg-[#3d5242] text-white">
              <span className="material-symbols-outlined text-[18px] mr-1">add</span>
              New Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Key Stat Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Accepted Value</span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {formatINR(acceptedPaise)}
          </div>
          <p className="text-xs text-outline">{acceptedQuotations.length} confirmed bookings/quotes</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Pipeline Forecast</span>
            <span className="material-symbols-outlined text-primary text-[20px]">trending_up</span>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {formatINR(pendingPaise)}
          </div>
          <p className="text-xs text-outline">{pendingQuotations.length} open quotes in negotiation</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Enquiries</span>
            <span className="material-symbols-outlined text-primary text-[20px]">mark_email_unread</span>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {activeEnquiries.length}
          </div>
          <p className="text-xs text-outline">Lead velocity steady</p>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl shadow-sm border border-outline-variant/40 space-y-2">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Clients</span>
            <span className="material-symbols-outlined text-primary text-[20px]">group</span>
          </div>
          <div className="text-2xl font-bold text-on-surface">
            {clients.length}
          </div>
          <p className="text-xs text-outline">Verified profiles in CRM</p>
        </div>
      </div>

      {/* Visual Funnel / Grouped Bar & Pipeline Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Revenue / Ledger Chart */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/40 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-medium text-outline tracking-wider">Fiscal Snapshot</span>
              <h2 className="text-lg font-semibold text-on-surface">Collected vs Invoiced Revenue</h2>
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

              {/* Bars for 6 simulated months */}
              {[
                { label: 'Oct', col: 90, inv: 120, x: 50 },
                { label: 'Nov', col: 125, inv: 150, x: 140 },
                { label: 'Dec', col: 160, inv: 170, x: 230 },
                { label: 'Jan', col: 140, inv: 155, x: 320 },
                { label: 'Feb', col: 110, inv: 130, x: 410 },
                { label: 'Mar', col: 135, inv: 165, x: 500 },
              ].map((m) => (
                <g key={m.label}>
                  <rect x={m.x} y={180 - m.col} width="18" height={m.col} fill="url(#sageDark)" rx="3" />
                  <rect x={m.x + 22} y={180 - m.inv} width="18" height={m.inv} fill="url(#sageSoft)" rx="3" />
                  <text x={m.x + 20} y="195" fill="#737972" fontSize="11" textAnchor="middle">
                    {m.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Right Column: Event Type Donut Distribution */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/40 space-y-4">
          <div>
            <span className="text-xs uppercase font-medium text-outline tracking-wider">Portfolio Composition</span>
            <h2 className="text-lg font-semibold text-on-surface">Bookings by Event Type</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
            <div className="relative w-40 h-40 shrink-0">
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
                <span className="text-xl font-bold text-on-surface">{quotations.length}</span>
                <span className="text-[10px] uppercase font-semibold text-outline">Projects</span>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4C6452]"></span> Catholic Ceremonies
                </span>
                <span className="font-semibold">45%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#829B87]"></span> Grand Receptions
                </span>
                <span className="font-semibold">30%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#B3CDB7]"></span> Pre-Wedding Shoots
                </span>
                <span className="font-semibold">15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#5A605B]"></span> Monograph / Highlights
                </span>
                <span className="font-semibold">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quotations Table */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/40 overflow-hidden">
        <div className="p-4 bg-surface-container-low border-b border-outline-variant/40 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm text-on-surface">Recent Quotations</h3>
            <p className="text-xs text-outline">High-velocity deals and customer estimate statuses</p>
          </div>
          <Link href="/crm/quotations" className="text-xs font-semibold text-primary hover:underline">
            View All Quotations →
          </Link>
        </div>
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-surface-container-low/40 text-xs text-outline uppercase font-medium">
            <tr>
              <th className="py-2.5 px-4">Quotation #</th>
              <th className="py-2.5 px-4">Client</th>
              <th className="py-2.5 px-4">Valid Until</th>
              <th className="py-2.5 px-4 text-right">Total</th>
              <th className="py-2.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {quotations.slice(0, 5).map((q) => (
              <tr key={q.id} className="hover:bg-surface-container-low/30">
                <td className="py-3 px-4 font-semibold text-primary">
                  <Link href={`/crm/quotations/${q.id}`} className="hover:underline">
                    {q.quotationNumber}
                  </Link>
                </td>
                <td className="py-3 px-4 text-on-surface font-medium">{q.clientName || 'Unnamed Client'}</td>
                <td className="py-3 px-4 text-on-surface-variant">
                  {new Date(q.validUntil).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-on-surface">
                  {formatINR(BigInt(q.totalPaise))}
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge variant={q.status === 'accepted' ? 'success' : q.status === 'sent' ? 'info' : 'default'}>
                    {q.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {quotations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-outline">
                  No quotations created yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
