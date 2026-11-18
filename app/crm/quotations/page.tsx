import React from 'react';
import { listQuotationsAction } from '@/server/actions/quotation.actions';
import { QuotationsTable } from '@/components/quotations/quotations-table';

export const metadata = {
  title: 'Quotations | VOWS CRM',
};

export default async function QuotationsPage() {
  const result = await listQuotationsAction();
  const quotations = result.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <QuotationsTable initialQuotations={quotations} />
    </div>
  );
}
