import * as React from 'react';
import { getAuthenticatedUser } from '@/lib/auth';
import { getGmailStatusAction } from '@/server/actions/gmail.actions';
import { GmailSettingsCard } from '@/components/settings/gmail-settings-card';

export const metadata = {
  title: 'Gmail Integration | VOWS Studio CRM',
};

export default async function SettingsGmailPage() {
  const user = await getAuthenticatedUser();
  const canManage = user?.role === 'system_admin' || user?.role === 'business_owner';

  const res = await getGmailStatusAction();
  const status = res.data || {
    status: 'disconnected',
    googleEmail: null,
    fromName: null,
    replyTo: null,
    connectedAt: null,
    lastError: null,
  };

  return <GmailSettingsCard initialStatus={status} canManage={canManage} />;
}
