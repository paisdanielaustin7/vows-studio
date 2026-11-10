import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { getClientAction } from '@/server/actions/client.actions';
import { listQuotationsAction } from '@/server/actions/quotation.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { ClientProfileView } from '@/components/clients/client-profile-view';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const [clientRes, quoteRes] = await Promise.all([
    getClientAction(id),
    listQuotationsAction({ clientId: id }),
  ]);

  if (clientRes.error || !clientRes.data) {
    notFound();
  }

  const canManage = ['system_admin', 'business_owner', 'manager'].includes(user.role);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <ClientProfileView
        client={clientRes.data.client}
        activities={clientRes.data.activities}
        quotations={quoteRes.data || []}
        canManage={canManage}
      />
    </div>
  );
}
