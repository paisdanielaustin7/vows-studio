import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listClientsAction } from '@/server/actions/client.actions';
import { BookingBuilder } from '@/components/bookings/booking-builder';

export const metadata = {
  title: 'New Booking | VOWS Studio CRM',
};

export default async function NewBookingPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'bookings:create');

  const clientsRes = await listClientsAction();
  const clientsList = clientsRes.data?.clients || [];
  const clients = clientsList.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    primaryPhone: c.phones.find((p) => p.isPrimary)?.phoneE164 || c.phones[0]?.phoneE164 || 'No phone',
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <BookingBuilder clients={clients} />
    </div>
  );
}
