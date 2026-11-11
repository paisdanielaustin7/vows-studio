'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  getAuthenticatedUser,
  requirePermission,
  revokeUserSessions,
  checkAccountLockout,
  recordAuthAttempt,
} from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { generateSecureToken, hashToken } from '@/lib/utils';
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  inviteUserSchema,
  acceptInviteSchema,
  mfaVerifySchema,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  InviteUserInput,
  AcceptInviteInput,
  MfaVerifyInput,
} from '@/lib/validations/auth.schema';
import { ActionResult } from '@/types/auth';
import { UserRole } from '@/lib/constants/permissions';

function getRoleLandingPage(role: UserRole): string {
  switch (role) {
    case 'system_admin':
      return '/admin/dashboard';
    case 'business_owner':
    case 'manager':
    case 'accountant':
      return '/crm/dashboard';
    case 'staff':
      return '/crm/bookings';
    case 'crew_member':
      return '/crm/schedule';
    default:
      return '/login';
  }
}

/**
 * Login action: validates credentials, enforces rate limits and account lockout.
 */
export async function loginAction(
  input: LoginInput,
  clientIp = '127.0.0.1'
): Promise<ActionResult<{ redirectTo: string; needsMfa: boolean }>> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login details.',
        details: parsed.error.format(),
      },
    };
  }

  const { email, password } = parsed.data;

  // Rate limiting: 10 per 15 min per IP
  const rateLimit = await checkRateLimit('login', clientIp);
  if (!rateLimit.success) {
    return {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Please try again in 15 minutes.',
      },
    };
  }

  // Check lockout
  const lockout = await checkAccountLockout(email);
  if (lockout.isLocked) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Account is temporarily locked due to excessive failed attempts. Please try again later or contact an administrator.',
      },
    };
  }

  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    await recordAuthAttempt(email, clientIp, false);

    // Audit failed login
    const admin = getAdminClient();
    await admin.from('audit_log').insert({
      action: 'login_failure',
      table_name: 'auth',
      ip_address: clientIp,
      metadata: { email, reason: authError?.message || 'Invalid credentials' },
    });

    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid email or password.',
      },
    };
  }

  // Verify profile and active status
  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', authData.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return {
      error: {
        code: 'FORBIDDEN',
        message: 'Your account has been deactivated. Please contact an administrator.',
      },
    };
  }

  await recordAuthAttempt(email, clientIp, true);

  // Audit successful login
  await admin.from('audit_log').insert({
    actor_user_id: authData.user.id,
    actor_role: profile.role,
    action: 'login_success',
    table_name: 'auth',
    record_id: authData.user.id,
    ip_address: clientIp,
  });

  const role = profile.role as UserRole;
  const isMfaMandatory = role === 'system_admin' || role === 'business_owner';

  // Check user MFA factors
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = factors?.totp && factors.totp.length > 0;

  if (isMfaMandatory) {
    if (!hasTotp) {
      // Must enroll MFA first
      return { data: { redirectTo: '/mfa/enroll', needsMfa: true } };
    }
    // Must complete MFA challenge
    return { data: { redirectTo: '/mfa', needsMfa: true } };
  }

  const destination = getRoleLandingPage(role);
  return { data: { redirectTo: destination, needsMfa: false } };
}

/**
 * Logout action (POST).
 */
export async function logoutAction(): Promise<ActionResult<{ redirectTo: string }>> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return { data: { redirectTo: '/login' } };
}

/**
 * Forgot password action: generates recovery link (1 hour expiry).
 */
export async function forgotPasswordAction(
  input: ForgotPasswordInput,
  clientIp = '127.0.0.1'
): Promise<ActionResult<{ message: string; manualLink?: string }>> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please provide a valid email.',
      },
    };
  }

  const { email } = parsed.data;

  // Rate limit: 5 per hour per IP/email
  const rateLimit = await checkRateLimit('password_reset', `${clientIp}:${email}`);
  if (!rateLimit.success) {
    return {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many reset requests. Please try again later.',
      },
    };
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, is_active')
    .ilike('email', email)
    .maybeSingle();

  if (profile && profile.is_active) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: profile.email,
    });

    await admin.from('audit_log').insert({
      actor_user_id: profile.id,
      action: 'password_reset',
      table_name: 'auth',
      ip_address: clientIp,
      metadata: { reason: 'Password recovery requested' },
    });

    const recoveryLink = linkData?.properties?.action_link;
    if (recoveryLink) {
      try {
        const { getGmailStatus } = await import('@/lib/gmail/oauth');
        const gmailStatus = await getGmailStatus();
        if (gmailStatus.status === 'connected') {
          const { sendEmailService } = await import('@/server/services/email.service');
          const { wrapInBrandedEmailLayout } = await import('@/lib/email/template-renderer');
          const htmlBody = wrapInBrandedEmailLayout({
            title: 'Reset Your Password',
            bodyContent: `
              <p>Hello,</p>
              <p>You requested a password reset for your VOWS Studio account. Click the button below to set a new password:</p>
              <p>This link is valid for 1 hour.</p>
            `,
            actionButton: {
              label: 'Reset Password',
              url: recoveryLink,
            },
          });

          await sendEmailService(
            {
              to: email,
              subject: 'VOWS Studio — Password Reset Link',
              htmlBody,
              documentType: 'password_reset',
              idempotencyKey: `pwd-reset-${Date.now()}-${email}`,
            },
            '00000000-0000-0000-0000-000000000000'
          );
        }
      } catch (e) {
        console.warn('Gmail password reset send failed:', e);
      }
    }

    const isDev = process.env.NODE_ENV !== 'production' || process.env.APP_MODE === 'demo';
    return {
      data: {
        message: 'If an account exists with this email, a password recovery link has been generated.',
        manualLink: isDev ? recoveryLink : undefined,
      },
    };
  }

  // Consistent message to prevent enumeration
  return {
    data: {
      message: 'If an account exists with this email, a password recovery link has been generated.',
    },
  };
}

/**
 * Reset password action.
 */
export async function resetPasswordAction(
  input: ResetPasswordInput
): Promise<ActionResult<{ success: boolean }>> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid password provided.',
        details: parsed.error.format(),
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Your password reset session has expired. Please request a new link.',
      },
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: updateError.message,
      },
    };
  }

  // Revoke all existing sessions globally
  await revokeUserSessions(user.id);

  const admin = getAdminClient();
  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    action: 'password_reset',
    table_name: 'auth',
    record_id: user.id,
    metadata: { reason: 'Password reset successfully completed' },
  });

  return { data: { success: true } };
}

/**
 * Invite User action (SA only).
 * Creates an entry in invitations table with a 256-bit token valid for 72 hours.
 */
export async function inviteUserAction(
  input: InviteUserInput
): Promise<ActionResult<{ inviteLink: string; invitationId: string; emailSent?: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  if (process.env.APP_MODE === 'demo') {
    return {
      error: {
        code: 'FORBIDDEN',
        message: 'Team invitations are disabled in Demo Mode. Use the demo role credentials on the login page.',
      },
    };
  }

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid invitation payload.',
        details: parsed.error.format(),
      },
    };
  }

  const { email, fullName, role } = parsed.data;
  const admin = getAdminClient();

  // Check if active profile with email already exists
  const { data: existingUser } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (existingUser) {
    return {
      error: {
        code: 'CONFLICT',
        message: 'A user with this email address already exists.',
      },
    };
  }

  // Generate 256-bit token
  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  // Revoke any previous active invitation for this email
  await admin
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .ilike('email', email)
    .is('accepted_at', null)
    .is('revoked_at', null);

  const { data: invitation, error: insertError } = await admin
    .from('invitations')
    .insert({
      email,
      full_name: fullName,
      role,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertError || !invitation) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create invitation record.',
        details: insertError,
      },
    };
  }

  await admin.from('audit_log').insert({
    actor_user_id: user.id,
    actor_role: user.role,
    action: 'create',
    table_name: 'invitations',
    record_id: invitation.id,
    new_values: { email, full_name: fullName, role },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteLink = `${appUrl}/invite/${rawToken}`;

  let emailSent = false;
  try {
    const { getGmailStatus } = await import('@/lib/gmail/oauth');
    const gmailStatus = await getGmailStatus();
    if (gmailStatus.status === 'connected') {
      const { sendEmailService } = await import('@/server/services/email.service');
      const { wrapInBrandedEmailLayout } = await import('@/lib/email/template-renderer');
      const htmlBody = wrapInBrandedEmailLayout({
        title: 'VOWS Studio CRM Team Invitation',
        bodyContent: `
          <p>Hello ${fullName},</p>
          <p>You have been invited to join <strong>VOWS Studio CRM</strong> as a <strong>${role.replace('_', ' ')}</strong>.</p>
          <p>This invitation link is valid for 72 hours.</p>
        `,
        actionButton: {
          label: 'Accept Invitation & Set Password',
          url: inviteLink,
        },
      });

      await sendEmailService(
        {
          to: email,
          subject: 'You have been invited to VOWS Studio CRM',
          htmlBody,
          documentType: 'invitation',
          idempotencyKey: `invite-${invitation.id}`,
        },
        user.id
      );
      emailSent = true;
    }
  } catch (e) {
    console.warn('Gmail invite send failed, manual link provided:', e);
  }

  return {
    data: {
      inviteLink,
      invitationId: invitation.id,
      emailSent,
    },
  };
}

/**
 * Resend Invitation: refreshes token and extends 72-hour expiry.
 */
export async function resendInvitationAction(
  invitationId: string
): Promise<ActionResult<{ inviteLink: string }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  const admin = getAdminClient();
  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('id', invitationId)
    .single();

  if (!invitation || invitation.accepted_at) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: 'Invitation not found or already accepted.',
      },
    };
  }

  const rawToken = generateSecureToken(32);
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();

  await admin
    .from('invitations')
    .update({
      token_hash: tokenHash,
      expires_at: expiresAt,
      revoked_at: null,
    })
    .eq('id', invitationId);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteLink = `${appUrl}/invite/${rawToken}`;

  return { data: { inviteLink } };
}

/**
 * Revoke Invitation.
 */
export async function revokeInvitationAction(
  invitationId: string
): Promise<ActionResult<{ success: boolean }>> {
  const user = await getAuthenticatedUser();
  requirePermission(user, 'users:manage');

  const admin = getAdminClient();
  await admin
    .from('invitations')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', invitationId);

  return { data: { success: true } };
}

/**
 * Accept invitation action: verifies token, creates auth user and profile.
 */
export async function acceptInvitationAction(
  input: AcceptInviteInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration details.',
        details: parsed.error.format(),
      },
    };
  }

  const { token, fullName, password } = parsed.data;
  const tokenHash = hashToken(token);
  const admin = getAdminClient();

  const { data: invitation } = await admin
    .from('invitations')
    .select('*')
    .eq('token_hash', tokenHash)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invitation) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invitation link is invalid, expired, or already used.',
      },
    };
  }

  // Create auth user via admin API
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authUser.user) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: authError?.message || 'Failed to create user account.',
      },
    };
  }

  // Insert profile record
  const { error: profileError } = await admin.from('profiles').insert({
    id: authUser.user.id,
    email: invitation.email,
    full_name: fullName,
    role: invitation.role,
    is_active: true,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create user profile.',
      },
    };
  }

  // Mark invitation accepted
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id);

  // Sign in newly created user
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: invitation.email,
    password,
  });

  const destination = getRoleLandingPage(invitation.role as UserRole);
  return { data: { redirectTo: destination } };
}

/**
 * MFA Enrollment: initiates TOTP enrollment.
 */
export async function enrollMfaAction(): Promise<
  ActionResult<{ factorId: string; qrCode: string; secret: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Must be logged in to enroll MFA.',
      },
    };
  }

  const { data: enrollData, error: enrollError } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'VOWS Studio',
  });

  if (enrollError || !enrollData) {
    return {
      error: {
        code: 'INTERNAL_ERROR',
        message: enrollError?.message || 'Failed to initialize MFA enrollment.',
      },
    };
  }

  return {
    data: {
      factorId: enrollData.id,
      qrCode: enrollData.totp.qr_code,
      secret: enrollData.totp.secret,
    },
  };
}

/**
 * MFA Challenge & Verification.
 */
export async function verifyMfaChallengeAction(
  factorId: string,
  input: MfaVerifyInput
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = mfaVerifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please provide a valid 6-digit code.',
      },
    };
  }

  const supabase = await createClient();
  const { data: challengeData, error: challengeError } =
    await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code: parsed.data.code,
    });

  const user = await getAuthenticatedUser();
  const admin = getAdminClient();

  if (challengeError || !challengeData) {
    if (user) {
      await admin.from('audit_log').insert({
        actor_user_id: user.id,
        actor_role: user.role,
        action: 'mfa_failure',
        table_name: 'auth',
        metadata: { reason: challengeError?.message || 'Invalid TOTP code' },
      });
    }

    return {
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid MFA verification code.',
      },
    };
  }

  if (user) {
    await admin.from('audit_log').insert({
      actor_user_id: user.id,
      actor_role: user.role,
      action: 'mfa_success',
      table_name: 'auth',
    });
  }

  const landingPage = user ? getRoleLandingPage(user.role) : '/crm/dashboard';
  return { data: { redirectTo: landingPage } };
}
