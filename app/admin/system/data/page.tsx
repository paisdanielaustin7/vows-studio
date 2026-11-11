import * as React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { getSetupStatusAction } from '@/server/actions/data-management.actions';
import { DataManagementView } from '@/components/admin/data-management-view';

export const metadata = {
  title: 'Data Management & Partition Governance | VOWS Admin',
};

export default async function DataManagementPage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'system_admin') {
    redirect('/403');
  }

  const res = await getSetupStatusAction();
  if (res.error || !res.data) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-6 rounded-xl bg-error-container text-on-error-container">
          <h2 className="text-base font-semibold">Failed to load Data Management state</h2>
          <p className="text-xs mt-1">{res.error?.message || 'Access denied or server error'}</p>
        </div>
      </div>
    );
  }

  return <DataManagementView initialStatus={res.data} />;
}
