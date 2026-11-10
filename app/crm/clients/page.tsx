import * as React from 'react';
import { listClientsAction } from '@/server/actions/client.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ClientsTable } from '@/components/clients/clients-table';

export default async function ClientsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const res = await listClientsAction('', 100, 0);
  const clients = res.data?.clients || [];

  const canCreate = ['system_admin', 'business_owner', 'manager'].includes(user.role);
  const canDelete = ['system_admin', 'business_owner'].includes(user.role);
  const canExport = ['system_admin', 'business_owner', 'manager', 'accountant'].includes(user.role);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-on-surface">
          Client Directory
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage studio client profiles, primary contacts, and multi-event booking records.
        </p>
      </div>

      <ClientsTable
        initialClients={clients}
        canCreate={canCreate}
        canDelete={canDelete}
        canExport={canExport}
      />
    </div>
  );
}
