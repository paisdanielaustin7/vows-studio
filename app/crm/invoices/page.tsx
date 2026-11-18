import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listInvoicesAction } from '@/server/actions/finance.actions';
import { InvoicesTable } from '@/components/finance/invoices-table';

export const metadata = {
  title: 'Invoices | VOWS CRM',
};

export default async function InvoicesPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'invoices:view');

  const invoicesRes = await listInvoicesAction();
  const invoices = invoicesRes.data || [];

  const canManage =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'manager' ||
    user.role === 'accountant';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <InvoicesTable initialInvoices={invoices} canManage={canManage} />
    </div>
  );
}
