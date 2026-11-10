import * as React from 'react';
import { getBusinessSettingsAction } from '@/server/actions/settings.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { BillingGstForm } from '@/components/settings/billing-gst-form';

export default async function SettingsBillingPage() {
  const user = await getAuthenticatedUser();
  if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
    redirect('/403');
  }

  const res = await getBusinessSettingsAction();
  if (res.error || !res.data) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30">
        <h2 className="text-sm font-semibold text-error">Failed to load billing configuration</h2>
        <p className="text-xs text-outline mt-1">{res.error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  return <BillingGstForm initialSettings={res.data} canEdit={true} />;
}
