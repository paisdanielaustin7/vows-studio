import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { listPaymentsAction } from '@/server/actions/finance.actions';
import { listClientsAction } from '@/server/actions/client.actions';
import { PaymentsTable } from '@/components/finance/payments-table';

export const metadata = {
  title: 'Payments & Receipts | VOWS Studio CRM',
};

export default async function PaymentsPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'payments:record');

  const [paymentsRes, clientsRes] = await Promise.all([
    listPaymentsAction(),
    listClientsAction('', 500, 0),
  ]);

  const payments = paymentsRes.data || [];
  const allClients = (clientsRes.data?.clients || []).map((c) => ({
    id: c.id,
    fullName: c.fullName,
  }));

  // Fetch all open invoices for allocation dialog
  const supabase = await createClient();
  const { data: openInvoicesData } = await supabase
    .from('invoices_v')
    .select('id, invoice_number, client_id, balance_paise')
    .gt('balance_paise', 0)
    .neq('status', 'cancelled');

  const allInvoices = (openInvoicesData || []).map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    clientId: inv.client_id,
    balancePaise: inv.balance_paise,
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PaymentsTable
        initialPayments={payments}
        allClients={allClients}
        allInvoices={allInvoices}
      />
    </div>
  );
}
