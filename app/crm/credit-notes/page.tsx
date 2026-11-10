import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listCreditNotesAction } from '@/server/actions/finance.actions';
import { CreditNotesTable } from '@/components/finance/credit-notes-table';

export const metadata = {
  title: 'Credit Notes | VOWS Studio CRM',
};

export default async function CreditNotesPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'invoices:view');

  const cnRes = await listCreditNotesAction();
  const creditNotes = cnRes.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CreditNotesTable initialCreditNotes={creditNotes} />
    </div>
  );
}
