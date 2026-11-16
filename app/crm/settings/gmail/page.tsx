import * as React from 'react';
import { getAuthenticatedUser } from '@/lib/auth';
import { getGmailStatusAction } from '@/server/actions/gmail.actions';
import { GmailSettingsCard } from '@/components/settings/gmail-settings-card';

export const metadata = {
  title: 'Gmail Integration | VOWS Studio CRM',
};

interface SettingsGmailPageProps {
  searchParams?: Promise<{ error?: string; gmail_connected?: string }>;
}

export default async function SettingsGmailPage({ searchParams }: SettingsGmailPageProps) {
  const [user, res, resolvedParams] = await Promise.all([
    getAuthenticatedUser(),
    getGmailStatusAction(),
    searchParams ? searchParams : Promise.resolve({} as { error?: string; gmail_connected?: string }),
  ]);

  const canManage = user?.role === 'system_admin' || user?.role === 'business_owner';
  const isConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_ID.trim() !== '' &&
    process.env.GOOGLE_CLIENT_ID !== 'mock-client-id' &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_SECRET.trim() !== ''
  );

  const status = res.data || {
    status: 'disconnected',
    googleEmail: null,
    fromName: null,
    replyTo: null,
    connectedAt: null,
    lastError: null,
  };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://vows-studio-one.vercel.app';

  return (
    <GmailSettingsCard
      initialStatus={status}
      canManage={canManage}
      isConfigured={isConfigured}
      queryError={resolvedParams?.error}
      justConnected={resolvedParams?.gmail_connected === 'true'}
      appUrl={appUrl}
    />
  );
}
