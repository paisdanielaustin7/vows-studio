import React from 'react';
import { notFound } from 'next/navigation';
import { getQuotationAction } from '@/server/actions/quotation.actions';
import { QuotationDetailView } from '@/components/quotations/quotation-detail-view';

export const metadata = {
  title: 'Quotation Detail | VOWS CRM',
};

interface QuotationDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const { id } = await params;
  const result = await getQuotationAction(id);

  if (result.error || !result.data) {
    notFound();
  }

  const { quotation, items, versions } = result.data;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <QuotationDetailView
        quotation={quotation}
        items={items}
        versions={versions}
      />
    </div>
  );
}
