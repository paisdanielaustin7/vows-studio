import * as React from 'react';
import Link from 'next/link';
import { getAuthenticatedUser } from '@/lib/auth';
import { UserRole } from '@/lib/constants/permissions';
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export const dynamic = 'force-dynamic';

function getRoleReturnTarget(role: UserRole | null): { href: string; label: string } {
  switch (role) {
    case 'system_admin':
      return { href: '/admin/dashboard', label: 'Return to Admin Dashboard' };
    case 'business_owner':
    case 'manager':
    case 'accountant':
      return { href: '/crm/dashboard', label: 'Return to Dashboard' };
    case 'staff':
      return { href: '/crm/bookings', label: 'Return to Bookings' };
    case 'crew_member':
      return { href: '/crm/schedule', label: 'Return to Schedule' };
    default:
      return { href: '/login', label: 'Sign In' };
  }
}

export default async function ForbiddenPage() {
  let user = null;
  try {
    user = await getAuthenticatedUser();
  } catch {
    user = null;
  }

  const { href, label } = getRoleReturnTarget(user?.role ?? null);

  return (
    <div className="min-h-screen bg-surface flex flex-col justify-center items-center p-6 text-center">
      <div className="w-full max-w-md space-y-6 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-8 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
        <div className="w-14 h-14 mx-auto rounded-full bg-error-container/40 text-error flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-error" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold tracking-widest uppercase text-error">
            Error 403 &bull; Access Denied
          </span>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            Restricted Territory
          </h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">
            Your studio account role does not have authorization to view this section or modify these records.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild className="w-full">
            <Link href={href}>{label}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
