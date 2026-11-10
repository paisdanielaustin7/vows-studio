import React from 'react';
import { notFound } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { getBookingAction } from '@/server/actions/booking.actions';
import { listCrewMembersAction } from '@/server/actions/crew.actions';
import { BookingDetailView } from '@/components/bookings/booking-detail-view';

interface BookingDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params: _params }: BookingDetailPageProps) {
  return {
    title: `Booking Detail | VOWS Studio CRM`,
  };
}

export default async function BookingDetailPage({ params }: BookingDetailPageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();

  const [bookingRes, crewRes] = await Promise.all([
    getBookingAction(id),
    listCrewMembersAction({ isActive: true }),
  ]);

  if (bookingRes.error || !bookingRes.data) {
    notFound();
  }

  const { booking, lines, events, deliveryStages } = bookingRes.data;
  const availableCrew = crewRes.data || [];

  const canViewMoney = user?.role !== 'staff' && user?.role !== 'crew_member';
  const canManage =
    user?.role === 'system_admin' ||
    user?.role === 'business_owner' ||
    user?.role === 'manager';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <BookingDetailView
        booking={booking}
        lines={lines}
        events={events}
        deliveryStages={deliveryStages}
        availableCrew={availableCrew}
        canViewMoney={canViewMoney}
        canManage={canManage}
        userRole={user?.role}
        userId={user?.id}
      />
    </div>
  );
}
