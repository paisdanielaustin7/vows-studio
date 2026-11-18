import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { InvoiceBuilder } from '@/components/finance/invoice-builder';

export const metadata = {
  title: 'New Invoice | VOWS CRM',
};

export default async function NewInvoicePage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'invoices:create');

  const supabase = await createClient();
  const { data: bookingsData } = await supabase
    .from('bookings')
    .select('id, booking_number, client_id, clients(full_name), booking_line_items(*)')
    .neq('status', 'cancelled')
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const bookings = (bookingsData || []).map((b: any) => ({
    id: b.id,
    bookingNumber: b.booking_number,
    clientId: b.client_id,
    clientName: b.clients?.full_name || 'Client',
    lines: (b.booking_line_items || []).map((l: any) => ({
      description: l.description,
      quantity: l.quantity,
      unitPricePaise: l.unit_price_paise,
    })),
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <InvoiceBuilder bookings={bookings} />
    </div>
  );
}
