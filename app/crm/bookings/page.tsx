import React from 'react';
import { listBookingsAction } from '@/server/actions/booking.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { BookingsTable } from '@/components/bookings/bookings-table';

export const metadata = {
  title: 'Bookings | VOWS Studio CRM',
};

export default async function BookingsPage() {
  const [user, bookingsRes] = await Promise.all([
    getAuthenticatedUser(),
    listBookingsAction(),
  ]);

  const bookings = bookingsRes.data || [];
  const canViewMoney = user?.role !== 'staff' && user?.role !== 'crew_member';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <BookingsTable initialBookings={bookings} canViewMoney={canViewMoney} />
    </div>
  );
}
