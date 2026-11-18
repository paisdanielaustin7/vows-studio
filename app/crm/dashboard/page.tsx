import * as React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { listEnquiriesAction } from '@/server/actions/enquiry.actions';
import { listQuotationsAction } from '@/server/actions/quotation.actions';
import { listClientsAction } from '@/server/actions/client.actions';
import { listBookingsAction } from '@/server/actions/booking.actions';
import { listInvoicesAction, listPaymentsAction } from '@/server/actions/finance.actions';
import { listEventsAction } from '@/server/actions/event.actions';
import { listDeliveryPipelinesAction } from '@/server/actions/delivery.actions';
import { DashboardView } from '@/components/crm/dashboard-view';

export const metadata = {
  title: 'Dashboard | VOWS CRM',
};

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?redirectTo=/crm/dashboard');
  }

  const hasFinancialAccess =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'accountant';

  // Parallel fetch core operations data
  const [
    enquiriesRes,
    quotationsRes,
    clientsRes,
    bookingsRes,
    eventsRes,
    deliveryPipelinesRes,
  ] = await Promise.all([
    listEnquiriesAction(),
    listQuotationsAction(),
    listClientsAction(),
    listBookingsAction(),
    listEventsAction(),
    listDeliveryPipelinesAction().catch(() => ({ data: [] })),
  ]);

  // Server-level defence-in-depth: If role is manager or crew, DO NOT fetch financial invoices/payments
  let invoices: any[] = [];
  let payments: any[] = [];

  if (hasFinancialAccess) {
    const [invRes, payRes] = await Promise.all([
      listInvoicesAction().catch(() => ({ data: [] })),
      listPaymentsAction().catch(() => ({ data: [] })),
    ]);
    invoices = invRes.data || [];
    payments = payRes.data || [];
  }

  // Extract raw data
  const rawEnquiries = enquiriesRes.data || [];
  const rawQuotations = quotationsRes.data || [];
  const rawClients = clientsRes.data?.clients || [];
  const rawBookings = bookingsRes.data || [];
  const rawEvents = eventsRes.data || [];
  const rawDeliveryStages: any[] = [];

  // Parse any delivery pipelines
  const pipelines = deliveryPipelinesRes.data || [];
  for (const pipe of pipelines) {
    if (pipe.has_blocked_stage) {
      rawDeliveryStages.push({
        id: pipe.id,
        pipelineId: pipe.id,
        bookingNumber: pipe.booking_number,
        clientName: pipe.client_name || 'Client',
        name: pipe.current_stage_code || 'Delivery Stage',
        status: 'blocked',
        notes: pipe.notes || 'Awaiting client approval or asset sync',
      });
    }
  }

  return (
    <DashboardView
      userRole={user.role}
      rawEnquiries={rawEnquiries}
      rawQuotations={rawQuotations}
      rawClients={rawClients}
      rawBookings={rawBookings}
      rawInvoices={invoices}
      rawPayments={payments}
      rawEvents={rawEvents}
      rawDeliveryStages={rawDeliveryStages}
    />
  );
}
