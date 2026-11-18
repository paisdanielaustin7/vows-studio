import React from 'react';
import { notFound } from 'next/navigation';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCrewMemberAction, listCrewUnavailabilityAction } from '@/server/actions/crew.actions';
import { CrewProfileView } from '@/components/crew/crew-profile-view';

interface CrewProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params: _params }: CrewProfilePageProps) {
  return {
    title: `Crew Profile | VOWS CRM`,
  };
}

export default async function CrewProfilePage({ params }: CrewProfilePageProps) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  requirePermission(user, 'crew:view');

  const [crewRes, unavailRes] = await Promise.all([
    getCrewMemberAction(id),
    listCrewUnavailabilityAction(id),
  ]);

  if (crewRes.error || !crewRes.data) {
    notFound();
  }

  const crewMember = crewRes.data;
  const unavailabilities = unavailRes.data || [];

  // Fetch assigned events for this crew member
  const supabase = await createClient();
  const { data: assignmentsData } = await supabase
    .from('event_crew_assignments')
    .select('id, role, event_id')
    .eq('crew_member_id', id);

  const assignedEvents: Array<{
    id: string;
    role: string;
    eventDate: string;
    eventName: string;
    bookingNumber: string;
    bookingId: string;
    venueName: string | null;
  }> = [];

  if (assignmentsData && assignmentsData.length > 0) {
    const eventIds = assignmentsData.map((a) => a.event_id);
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, event_date, venue_name, booking_id, bookings(booking_number)')
      .in('id', eventIds)
      .is('deleted_at', null);

    const eventsMap = new Map((eventsData || []).map((e) => [e.id, e]));

    for (const a of assignmentsData) {
      const ev = eventsMap.get(a.event_id);
      if (ev) {
        assignedEvents.push({
          id: a.id,
          role: a.role,
          eventDate: ev.event_date,
          eventName: ev.name,
          bookingNumber: (ev as any).bookings?.booking_number || 'BK-PROD',
          bookingId: ev.booking_id,
          venueName: ev.venue_name,
        });
      }
    }
  }

  const canViewMoney = user.role !== 'staff' && user.role !== 'crew_member';
  const canManage =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'manager';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CrewProfileView
        crewMember={crewMember}
        unavailabilities={unavailabilities}
        assignedEvents={assignedEvents}
        canViewMoney={canViewMoney}
        canManage={canManage}
      />
    </div>
  );
}
