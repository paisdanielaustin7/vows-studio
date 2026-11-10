import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listReceiptsAction } from '@/server/actions/finance.actions';
import { ReceiptsTable } from '@/components/finance/receipts-table';

export const metadata = {
  title: 'Payment Receipts | VOWS Studio CRM',
};

export default async function ReceiptsPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'payments:record');

  const receiptsRes = await listReceiptsAction();
  const receipts = receiptsRes.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ReceiptsTable initialReceipts={receipts} />
    </div>
  );
}
