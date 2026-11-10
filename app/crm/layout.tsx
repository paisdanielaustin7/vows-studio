import * as React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { CrmShell } from '@/components/crm/crm-shell';

export default async function CrmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login?redirectTo=/crm/dashboard');
  }

  return (
    <CrmShell
      userRole={user.role}
      userEmail={user.email}
      userName={user.profile.fullName || user.email}
    >
      {children}
    </CrmShell>
  );
}
