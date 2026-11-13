import React from 'react';
import { notFound } from 'next/navigation';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { getInvoiceAction } from '@/server/actions/finance.actions';
import { listClientsAction } from '@/server/actions/client.actions';
import { InvoiceDetailView } from '@/components/finance/invoice-detail-view';

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params: _params }: InvoiceDetailPageProps) {
  return {
    title: `Invoice Detail | VOWS Studio CRM`,
  };
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  requirePermission(user, 'invoices:view');

  const [invRes, clientsRes] = await Promise.all([
    getInvoiceAction(id),
    listClientsAction('', 500, 0),
  ]);

  if (invRes.error || !invRes.data) {
    notFound();
  }

  const { invoice, items, payments, creditNotes } = invRes.data;
  const allClients = (clientsRes.data?.clients || []).map((c) => ({
    id: c.id,
    fullName: c.fullName,
  }));

  const canManage =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'manager' ||
    user.role === 'accountant';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <InvoiceDetailView
        invoice={invoice}
        items={items}
        payments={payments}
        creditNotes={creditNotes}
        allClients={allClients}
        canManage={canManage}
      />
    </div>
  );
}
