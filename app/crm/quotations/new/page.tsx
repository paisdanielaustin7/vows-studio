import React from 'react';
import { listClientsAction } from '@/server/actions/client.actions';
import { listServicesAction, listPackagesAction } from '@/server/actions/catalogue.actions';
import { getBusinessSettingsAction } from '@/server/actions/settings.actions';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';

export const metadata = {
  title: 'New Quotation | VOWS Studio CRM',
};

interface NewQuotationPageProps {
  searchParams: Promise<{
    clientId?: string;
    enquiryId?: string;
    eventDate?: string;
  }>;
}

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  const resolvedSearchParams = await searchParams;
  const [clientsRes, servicesRes, packagesRes, settingsRes] = await Promise.all([
    listClientsAction(),
    listServicesAction(),
    listPackagesAction(),
    getBusinessSettingsAction(),
  ]);

  const clients = clientsRes.data?.clients || [];
  const services = servicesRes.data || [];
  const packages = packagesRes.data || [];
  const settings = settingsRes.data || null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <QuotationBuilder
        clients={clients}
        services={services}
        packages={packages}
        settings={settings}
        initialClientId={resolvedSearchParams?.clientId}
        initialEnquiryId={resolvedSearchParams?.enquiryId}
        initialEventDate={resolvedSearchParams?.eventDate}
      />
    </div>
  );
}
