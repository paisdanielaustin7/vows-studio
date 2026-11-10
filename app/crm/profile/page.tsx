import * as React from 'react';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ProfileEditor } from '@/components/profile/profile-editor';

export default async function CrmProfilePage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login');
  }

  return <ProfileEditor profile={user.profile} aal={user.aal} />;
}
