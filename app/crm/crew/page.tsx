import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { listCrewMembersAction } from '@/server/actions/crew.actions';
import { CrewDirectory } from '@/components/crew/crew-directory';

export const metadata = {
  title: 'Crew Directory | VOWS Studio CRM',
};

export default async function CrewDirectoryPage() {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'crew:view');

  const crewRes = await listCrewMembersAction();
  const crew = crewRes.data || [];

  const canViewMoney = user.role !== 'staff' && user.role !== 'crew_member';
  const canManage =
    user.role === 'system_admin' ||
    user.role === 'business_owner' ||
    user.role === 'manager';

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CrewDirectory initialCrew={crew} canViewMoney={canViewMoney} canManage={canManage} />
    </div>
  );
}
