import * as React from 'react';
import { getEmailTemplatesAction } from '@/server/actions/settings.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { EmailTemplatesEditor } from '@/components/settings/email-templates-editor';

export default async function SettingsEmailTemplatesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  const res = await getEmailTemplatesAction();
  if (res.error || !res.data) {
    return (
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/30">
        <h2 className="text-sm font-semibold text-error">Failed to load email templates</h2>
        <p className="text-xs text-outline mt-1">{res.error?.message || 'Unknown error'}</p>
      </div>
    );
  }

  const canEdit = user.role === 'system_admin' || user.role === 'business_owner';

  return <EmailTemplatesEditor initialTemplates={res.data} canEdit={canEdit} />;
}
