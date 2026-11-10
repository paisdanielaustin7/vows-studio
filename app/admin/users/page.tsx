import * as React from 'react';
import { listUsersAction } from '@/server/actions/user.actions';
import { getAuthenticatedUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsersClient } from './users-client';

export default async function AdminUsersPage() {
  const currentUser = await getAuthenticatedUser();
  if (!currentUser || currentUser.role !== 'system_admin') {
    redirect('/403');
  }

  const res = await listUsersAction();
  const users = res.data?.users || [];
  const invitations = res.data?.invitations || [];

  return (
    <UsersClient
      initialUsers={users}
      initialInvitations={invitations}
      currentUserId={currentUser.id}
    />
  );
}
