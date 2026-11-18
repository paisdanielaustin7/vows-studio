import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { listClientsAction } from '@/server/actions/client.actions';
import { listServicesAction, listPackagesAction } from '@/server/actions/catalogue.actions';
import { getBusinessSettingsAction } from '@/server/actions/settings.actions';
import { QuotationBuilder } from '@/components/quotations/quotation-builder';

export const metadata = {
  title: 'New Quotation | VOWS CRM',
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
    listClientsAction('', 500, 0),
    listServicesAction(),
    listPackagesAction(),
    getBusinessSettingsAction(),
  ]);

  const clients = clientsRes.data?.clients || [];
  const services = servicesRes.data || [];
  const packages = packagesRes.data || [];
  const settings = settingsRes.data || null;

  let initialClientId = resolvedSearchParams?.clientId;
  let initialEventDate = resolvedSearchParams?.eventDate;

  // If enquiryId was provided, resolve linked client and event details
  if (resolvedSearchParams?.enquiryId) {
    try {
      const supabase = await createClient();
      const { data: enq } = await supabase
        .from('enquiries')
        .select('client_id, event_date')
        .eq('id', resolvedSearchParams.enquiryId)
        .maybeSingle();

      if (enq) {
        if (!initialClientId && enq.client_id) {
          initialClientId = enq.client_id;
        }
        if (!initialEventDate && enq.event_date) {
          initialEventDate = enq.event_date;
        }
      }
    } catch (err) {
      console.warn('[NewQuotationPage] Failed to fetch enquiry context:', err);
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <QuotationBuilder
        clients={clients}
        services={services}
        packages={packages}
        settings={settings}
        initialClientId={initialClientId}
        initialEnquiryId={resolvedSearchParams?.enquiryId}
        initialEventDate={initialEventDate}
      />
    </div>
  );
}
