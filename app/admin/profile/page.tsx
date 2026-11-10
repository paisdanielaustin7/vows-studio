import * as React from 'react';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileEditor } from '@/components/profile/profile-editor';

export default async function AdminProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== 'system_admin') {
    redirect('/403');
  }

  return <ProfileEditor profile={user.profile} aal={user.aal} />;
}
