'use server';

import { getAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission, revokeUserSessions, recordAuthAttempt } from '@/lib/auth';
import { UserRole } from '@/lib/constants/permissions';
import { ActionResult, UserProfile, Invitation } from '@/types/auth';
import { changePasswordSchema, ChangePasswordInput } from '@/lib/validations/auth.schema';
import { revalidatePath } from 'next/cache';

/**
 * List all user profiles and pending invitations (SA only).
 */
export async function listUsersAction(): Promise<
  ActionResult<{ users: UserProfile[]; invitations: Invitation[] }>
> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  const admin = getAdminClient();

  const { data: profilesData, error: profilesError } = await admin
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch user profiles.',
      },
    };
  }

  const { data: invitationsData, error: invitationsError } = await admin
    .from('invitations')
    .select('*')
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (invitationsError) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch pending invitations.',
      },
    };
  }

  const users: UserProfile[] = (profilesData || []).map((p) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    role: p.role as UserRole,
    phone: p.phone,
    avatarPath: p.avatar_path,
    isActive: p.is_active,
    lockedUntil: p.locked_until,
    deactivatedAt: p.deactivated_at,
    lastSeenAt: p.last_seen_at,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  }));

  const invitations: Invitation[] = (invitationsData || []).map((inv) => ({
    id: inv.id,
    email: inv.email,
    fullName: inv.full_name,
    role: inv.role as UserRole,
    tokenHash: inv.token_hash,
    invitedBy: inv.invited_by,
    expiresAt: inv.expires_at,
    acceptedAt: inv.accepted_at,
    revokedAt: inv.revoked_at,
    createdAt: inv.created_at,
  }));

  return { data: { users, invitations } };
}

/**
 * Update user role (SA only).
 * Self-change blocked; last owner guard enforced; session revoked immediately.
 */
export async function updateUserRoleAction(
  targetUserId: string,
  newRole: UserRole
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  if (user.id === targetUserId) {
    return {
      error: {
        code: 'FORBIDDEN',
        message: 'Self-role modification is strictly forbidden.',
      },
    };
  }

  if (newRole === 'system_admin') {
    return {
      error: {
        code: 'FORBIDDEN',
        message: 'System Administrator accounts can only be provisioned via server bootstrap.',
      },
    };
  }

  const admin = getAdminClient();

  const { data: targetProfile, error: fetchError } = await admin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (fetchError || !targetProfile) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: 'Target user profile not found.',
      },
    };
  }

  // Last business owner guard (permitted if an active System Administrator exists)
  if (targetProfile.role === 'business_owner' && newRole !== 'business_owner') {
    const { count: boCount } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'business_owner')
      .eq('is_active', true)
      .neq('id', targetUserId);

    if (!boCount || boCount < 1) {
      const { count: saCount } = await admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'system_admin')
        .eq('is_active', true);

      if (!saCount || saCount < 1) {
        return {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot demote the last active Business Owner when no active System Administrator exists.',
          },
        };
      }
    }
  }

  // Update role
  const { error: updateError } = await admin
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId);

  if (updateError) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: updateError.message,
      },
    };
  }

  // Revoke sessions immediately
  await revokeUserSessions(targetUserId);

  // Audit
  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'role_change',
    table_name: 'profiles',
    record_id: targetUserId,
    old_values: { role: targetProfile.role },
    new_values: { role: newRole },
  });

  revalidatePath('/admin/users');
  return { data: { success: true } };
}

/**
 * Toggle user active/deactivated status (SA only).
 */
export async function toggleUserActiveAction(
  targetUserId: string,
  isActive: boolean
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  if (user.id === targetUserId) {
    return {
      error: {
        code: 'FORBIDDEN',
        message: 'Self-deactivation is strictly forbidden.',
      },
    };
  }

  const admin = getAdminClient();
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', targetUserId)
    .single();

  if (!targetProfile) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: 'User not found.',
      },
    };
  }

  // Check last owner guard if deactivating
  if (!isActive) {
    if (targetProfile.role === 'system_admin') {
      const { count } = await admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'system_admin')
        .eq('is_active', true)
        .neq('id', targetUserId);

      if (!count || count < 1) {
        return {
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot deactivate the last active System Administrator.',
          },
        };
      }
    }

    if (targetProfile.role === 'business_owner') {
      const { count: boCount } = await admin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'business_owner')
        .eq('is_active', true)
        .neq('id', targetUserId);

      // Permitted if an active System Administrator exists to govern the studio
      if (!boCount || boCount < 1) {
        const { count: saCount } = await admin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'system_admin')
          .eq('is_active', true);

        if (!saCount || saCount < 1) {
          return {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot deactivate the last active Business Owner when no active System Administrator exists.',
            },
          };
        }
      }
    }
  }

  await admin
    .from('profiles')
    .update({
      is_active: isActive,
      deactivated_at: isActive ? null : new Date().toISOString(),
    })
    .eq('id', targetUserId);

  if (!isActive) {
    await revokeUserSessions(targetUserId);
  }

  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'update',
    table_name: 'profiles',
    record_id: targetUserId,
    new_values: { is_active: isActive },
    metadata: { reason: isActive ? 'Reactivated account' : 'Deactivated account' },
  });

  revalidatePath('/admin/users');
  return { data: { success: true } };
}

/**
 * Unlock locked user account (SA only).
 */
export async function unlockUserAction(
  targetUserId: string
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  const admin = getAdminClient();
  await admin
    .from('profiles')
    .update({ locked_until: null })
    .eq('id', targetUserId);

  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'unlock',
    table_name: 'profiles',
    record_id: targetUserId,
    metadata: { reason: 'Account unlocked by administrator' },
  });

  revalidatePath('/admin/users');
  return { data: { success: true } };
}

/**
 * Reset user MFA (SA only).
 */
export async function resetUserMfaAction(
  targetUserId: string
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  const admin = getAdminClient();

  // List user factors and unenroll
  const { data: factors } = await admin.auth.admin.mfa.listFactors({
    userId: targetUserId,
  });

  if (factors?.factors) {
    for (const factor of factors.factors) {
      await admin.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: targetUserId,
      });
    }
  }

  await revokeUserSessions(targetUserId);

  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'update',
    table_name: 'profiles',
    record_id: targetUserId,
    metadata: { reason: 'MFA factors reset by administrator' },
  });

  revalidatePath('/admin/users');
  return { data: { success: true } };
}

/**
 * Update Self Profile.
 */
export async function updateSelfProfileAction(input: {
  fullName: string;
  phone?: string | null;
  avatarPath?: string | null;
}): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to update profile.',
      },
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: input.fullName,
      phone: input.phone || null,
      avatar_path: input.avatarPath || null,
    })
    .eq('id', user.id);

  if (error) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }

  return { data: { success: true } };
}

/**
 * Change Password for self.
 */
export async function changePasswordAction(
  input: ChangePasswordInput
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to change password.',
      },
    };
  }

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid password details.',
        details: parsed.error.format(),
      },
    };
  }

  const supabase = await createClient();

  // Verify current password by signing in with normalized email
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email.trim().toLowerCase(),
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Current password is incorrect.',
      },
    };
  }

  // Update password authoritatively via Admin API directly in auth.users
  const admin = getAdminClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.newPassword,
  });

  if (updateError) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: updateError.message,
      },
    };
  }

  // Clear any failed attempts and reset locked_until
  await recordAuthAttempt(user.email, null, true);

  // Revoke sessions and audit
  await revokeUserSessions(user.id);

  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'password_change',
    table_name: 'auth',
    record_id: user.id,
  });

  return { data: { success: true } };
}
