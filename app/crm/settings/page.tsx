import * as React from 'react';
import { getBusinessSettingsAction } from '@/server/actions/settings.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { StudioProfileForm } from '@/components/settings/studio-profile-form';

export default async function SettingsStudioPage() {
  const user = await getAuthenticatedUser();
  const res = await getBusinessSettingsAction();

  if (res.error || !res.data) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30">
        <h2 className="text-sm font-semibold text-error">Failed to load settings</h2>
        <p className="text-xs text-outline mt-1">{res.error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  const canEdit = user?.role === 'system_admin' || user?.role === 'business_owner';

  return <StudioProfileForm initialSettings={res.data} canEdit={canEdit} />;
}
