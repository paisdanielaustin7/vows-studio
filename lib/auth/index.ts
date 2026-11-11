import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { ROLE_PERMISSIONS, UserRole, Permission } from '@/lib/constants/permissions';
import { AuthenticatedUser, UserProfile, ActionError } from '@/types/auth';

/**
 * Retrieves the currently authenticated user, profile, AAL level, and RBAC permissions.
 * Validates active status and account lockout.
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch user profile
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    return null;
  }

  // Deactivated users cannot authenticate
  if (!profileData.is_active) {
    return null;
  }

  // Locked accounts cannot authenticate
  if (profileData.locked_until && new Date(profileData.locked_until) > new Date()) {
    return null;
  }

  const role = profileData.role as UserRole;
  const permissions = ROLE_PERMISSIONS[role] || new Set<Permission>();

  // Get MFA assurance level
  let aal: 'aal1' | 'aal2' = 'aal1';
  try {
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.currentLevel === 'aal2') {
      aal = 'aal2';
    } else {
      const { data: claimsData } = await supabase.auth.getClaims();
      if ((claimsData?.claims as Record<string, unknown> | undefined)?.aal === 'aal2') {
        aal = 'aal2';
      }
    }
  } catch {
    aal = 'aal1';
  }

  const profile: UserProfile = {
    id: profileData.id,
    email: profileData.email,
    fullName: profileData.full_name,
    role,
    phone: profileData.phone,
    avatarPath: profileData.avatar_path,
    isActive: profileData.is_active,
    lockedUntil: profileData.locked_until,
    deactivatedAt: profileData.deactivated_at,
    lastSeenAt: profileData.last_seen_at,
    createdAt: profileData.created_at,
    updatedAt: profileData.updated_at,
  };

  return {
    id: user.id,
    email: user.email || profileData.email,
    role,
    profile,
    aal,
    permissions,
  };
}

/**
 * Asserts that the authenticated user possesses the required permission.
 * Throws a typed ActionError on failure.
 */
export function requirePermission(
  user: AuthenticatedUser | null,
  permission: Permission
): asserts user is AuthenticatedUser {
  if (!user) {
    const error: ActionError = {
      code: 'UNAUTHORIZED',
      message: 'Authentication required to perform this action.',
    };
    throw error;
  }

  if (!user.permissions.has(permission)) {
    const error: ActionError = {
      code: 'FORBIDDEN',
      message: `Forbidden: Missing required permission [${permission}].`,
    };
    throw error;
  }
}

/**
 * Immediately revokes all active sessions for a user (on role change, deactivation, password reset, MFA reset).
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const admin = getAdminClient();
  await admin.auth.admin.signOut(userId, 'global');
}

/**
 * Checks for account lockout based on 5 failures in 15 minutes.
 */
export async function checkAccountLockout(email: string): Promise<{
  isLocked: boolean;
  lockedUntil?: string | null;
}> {
  const admin = getAdminClient();
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

  // Query profile for existing locked_until
  const { data: profile } = await admin
    .from('profiles')
    .select('locked_until')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();

  if (profile?.locked_until && new Date(profile.locked_until) > new Date()) {
    return { isLocked: true, lockedUntil: profile.locked_until };
  }

  // Query app.auth_attempts via service_role-only public RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: countData } = await (admin as any).rpc('get_failed_auth_attempt_count', {
    p_email: email.trim().toLowerCase(),
    p_since: fifteenMinutesAgo,
  });
  const count = typeof countData === 'number' ? countData : 0;

  if (count >= 5) {
    // Lock for 30 minutes
    const lockExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await admin
      .from('profiles')
      .update({ locked_until: lockExpiry })
      .ilike('email', email.trim().toLowerCase());

    return { isLocked: true, lockedUntil: lockExpiry };
  }

  return { isLocked: false };
}

/**
 * Records an authentication attempt into app.auth_attempts via service_role-only RPC.
 */
export async function recordAuthAttempt(
  email: string,
  ip: string | null,
  succeeded: boolean
): Promise<void> {
  const admin = getAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin as any).rpc('record_auth_attempt', {
    p_email: email.trim().toLowerCase(),
    p_ip: ip || null,
    p_succeeded: succeeded,
  });
}
