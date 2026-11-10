import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { ShieldCheck, Users, History, Activity, ArrowLeft } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user || user.role !== 'system_admin' || user.aal !== 'aal2') {
    redirect('/403');
  }

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-surface-container-low border-r border-outline-variant/30 hidden md:flex flex-col justify-between">
        <div>
          <div className="h-16 px-5 border-b border-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-error text-on-error flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-sm font-semibold tracking-wider text-on-surface uppercase">
                  VOWS ADMIN
                </span>
                <span className="text-[10px] tracking-widest text-error uppercase font-medium">
                  System Console
                </span>
              </div>
            </div>
          </div>

          <nav className="p-3 space-y-1 text-xs font-medium">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-outline">
              Administration
            </div>
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span>Overview</span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Users &amp; Roles</span>
            </Link>
            <Link
              href="/admin/audit-log"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              <History className="w-4 h-4" />
              <span>System Audit Log</span>
            </Link>
          </nav>
        </div>

        <div className="p-4 border-t border-outline-variant/20 space-y-2">
          <Link
            href="/crm/dashboard"
            className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Studio CRM</span>
          </Link>
          <div className="text-[11px] text-outline">
            SuperAdmin: {user.profile.fullName || user.email}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-xs font-medium text-outline">
            <span className="text-error font-semibold uppercase tracking-wider">
              System Admin Console
            </span>
            <span>/</span>
            <span className="text-on-surface">Zero-Trust Governance</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/profile"
              className="text-xs font-medium text-on-surface hover:text-primary transition-colors"
            >
              Profile &amp; Security
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
