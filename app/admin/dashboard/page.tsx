import * as React from 'react';
import Link from 'next/link';
import { getAdminClient } from '@/lib/supabase/admin';
import { Users, ShieldCheck, Mail, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default async function AdminDashboardPage() {
  const admin = getAdminClient();

  // Query counts
  const { count: totalUsers } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: activeUsers } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const { count: pendingInvites } = await admin
    .from('invitations')
    .select('*', { count: 'exact', head: true })
    .is('accepted_at', null)
    .is('revoked_at', null);

  const { count: lockedAccounts } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .not('locked_until', 'is', null)
    .gt('locked_until', new Date().toISOString());

  // Recent audit activities
  const { data: recentAudits } = await admin
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-outline-variant/30">
        <div>
          <div className="text-xs uppercase tracking-widest text-outline font-semibold mb-1">
            System Administration &bull; Security Tier 1
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            Governance Dashboard
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Studio-wide user provisioning, MFA compliance, and audit monitoring.
          </p>
        </div>
        <div>
          <Button asChild>
            <Link href="/admin/users">Manage Team Members</Link>
          </Button>
        </div>
      </div>

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase font-medium tracking-wider">Total Users</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="text-3xl font-serif font-bold text-on-surface">
            {totalUsers || 0}
          </div>
          <div className="text-xs text-secondary font-medium">
            {activeUsers || 0} currently active
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase font-medium tracking-wider">Security State</span>
            <ShieldCheck className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-3xl font-serif font-bold text-on-surface">
            MFA Active
          </div>
          <div className="text-xs text-secondary font-medium">
            Enforced on SA &amp; BO
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-outline">
            <span className="text-xs uppercase font-medium tracking-wider">Pending Invites</span>
            <Mail className="w-5 h-5 text-on-surface-variant" />
          </div>
          <div className="text-3xl font-serif font-bold text-on-surface">
            {pendingInvites || 0}
          </div>
          <div className="text-xs text-outline">
            Awaiting registration
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant/40 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-error">
            <span className="text-xs uppercase font-medium tracking-wider">Locked Accounts</span>
            <AlertTriangle className="w-5 h-5 text-error" />
          </div>
          <div className="text-3xl font-serif font-bold text-error">
            {lockedAccounts || 0}
          </div>
          <div className="text-xs text-error">
            {lockedAccounts ? 'Security intervention needed' : 'Zero locked accounts'}
          </div>
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-on-surface">Recent Security Events</h2>
          <Link
            href="/admin/audit-log"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            <span>Full Audit Log</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-outline uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Actor Role</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {(!recentAudits || recentAudits.length === 0) ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-outline">
                    No recent audit events found.
                  </td>
                </tr>
              ) : (
                recentAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-surface-container/30 transition-colors">
                    <td className="px-4 py-3 text-on-surface font-mono">
                      {new Date(a.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary capitalize">
                      {a.action.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant font-mono">
                      {a.table_name || 'auth'}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant capitalize">
                      {a.actor_role?.replace('_', ' ') || 'system'}
                    </td>
                    <td className="px-4 py-3 text-outline font-mono">
                      {a.ip_address || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
