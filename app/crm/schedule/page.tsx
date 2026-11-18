import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listScheduleEventsAction, listCrewMembersAction } from '@/server/actions/crew.actions';
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar';

export const metadata = {
  title: 'Production Schedule & Calendar | VOWS CRM',
};

export default async function SchedulePage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'events:view');

  const [eventsRes, crewRes] = await Promise.all([
    listScheduleEventsAction(),
    listCrewMembersAction({ isActive: true }),
  ]);

  const events = eventsRes.data || [];
  const crewMembers = crewRes.data || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ScheduleCalendar
        initialEvents={events}
        crewMembers={crewMembers}
        userRole={user.role}
      />
    </div>
  );
}
