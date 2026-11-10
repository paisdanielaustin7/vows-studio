import * as React from 'react';
import { listEnquiriesAction } from '@/server/actions/enquiry.actions';
import { listClientsAction } from '@/server/actions/client.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EnquiriesBoard } from '@/components/enquiries/enquiries-board';

export default async function EnquiriesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const [enqRes, clientsRes] = await Promise.all([
    listEnquiriesAction(),
    listClientsAction('', 100, 0),
  ]);

  const enquiries = enqRes.data || [];
  const clients = clientsRes.data?.clients || [];
  const canCreate = ['system_admin', 'business_owner', 'manager', 'staff'].includes(user.role);

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-on-surface">
          Enquiries Pipeline
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Manage incoming wedding cinema and photography enquiries, track pipeline velocity, and schedule follow-ups.
        </p>
      </div>

      <EnquiriesBoard
        initialEnquiries={enquiries}
        clients={clients}
        canCreate={canCreate}
      />
    </div>
  );
}
