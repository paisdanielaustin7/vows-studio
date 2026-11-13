'use client';

import * as React from 'react';
import { UserProfile, Invitation } from '@/types/auth';
import { UserRole } from '@/lib/constants/permissions';
import {
  updateUserRoleAction,
  toggleUserActiveAction,
  unlockUserAction,
  resetUserMfaAction,
} from '@/server/actions/user.actions';
import {
  inviteUserAction,
  resendInvitationAction,
  revokeInvitationAction,
} from '@/server/actions/auth.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/feedback';
import {
  UserPlus,
  Shield,
  RotateCw,
  Unlock,
  KeyRound,
  UserX,
  UserCheck,
  X,
  Copy,
  Check,
} from 'lucide-react';

interface UsersClientProps {
  initialUsers: UserProfile[];
  initialInvitations: Invitation[];
  currentUserId: string;
}

const ROLES = [
  'business_owner',
  'manager',
  'accountant',
  'staff',
  'crew_member',
] as const;
type AssignableRole = (typeof ROLES)[number];

export function UsersClient({
  initialUsers,
  initialInvitations,
  currentUserId,
}: UsersClientProps) {
  const [users, setUsers] = React.useState<UserProfile[]>(initialUsers);
  const [invitations, setInvitations] = React.useState<Invitation[]>(initialInvitations);

  React.useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  React.useEffect(() => {
    setInvitations(initialInvitations);
  }, [initialInvitations]);

  const [isInviteOpen, setIsInviteOpen] = React.useState(false);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteFullName, setInviteFullName] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<AssignableRole>('staff');
  const [createdInviteLink, setCreatedInviteLink] = React.useState<string | null>(null);

  const [statusMessage, setStatusMessage] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  // Invite user handler
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('invite');
    setStatusMessage(null);
    setCreatedInviteLink(null);

    try {
      const res = await inviteUserAction({
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
        setLoadingAction(null);
        return;
      }

      if (res.data) {
        setCreatedInviteLink(res.data.inviteLink);
        setStatusMessage({
          type: 'success',
          text: `Invitation successfully created for ${inviteEmail}.`,
        });
        setInvitations((prev) => [
          {
            id: res.data!.invitationId,
            email: inviteEmail,
            fullName: inviteFullName,
            role: inviteRole,
            tokenHash: '',
            invitedBy: currentUserId,
            expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        setInviteEmail('');
        setInviteFullName('');
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to create invitation.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Role change handler
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setLoadingAction(`role-${userId}`);
    setStatusMessage(null);

    try {
      const res = await updateUserRoleAction(userId, newRole);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        setStatusMessage({
          type: 'success',
          text: 'User role updated successfully. User sessions have been revoked.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to change role.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Toggle active handler
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setLoadingAction(`active-${userId}`);
    setStatusMessage(null);

    try {
      const res = await toggleUserActiveAction(userId, nextStatus);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isActive: nextStatus } : u))
        );
        setStatusMessage({
          type: 'success',
          text: `User ${nextStatus ? 'reactivated' : 'deactivated'} successfully.`,
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to update active state.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Unlock account handler
  const handleUnlock = async (userId: string) => {
    setLoadingAction(`unlock-${userId}`);
    setStatusMessage(null);

    try {
      const res = await unlockUserAction(userId);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, lockedUntil: null } : u))
        );
        setStatusMessage({
          type: 'success',
          text: 'Account unlocked successfully.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to unlock user.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Reset MFA handler
  const handleResetMfa = async (userId: string) => {
    if (!confirm('Are you sure you want to reset MFA for this user? All existing factors will be unenrolled.')) {
      return;
    }

    setLoadingAction(`mfa-${userId}`);
    setStatusMessage(null);

    try {
      const res = await resetUserMfaAction(userId);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else {
        setStatusMessage({
          type: 'success',
          text: 'MFA factors cleared and sessions revoked for this user.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to reset MFA.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Resend invitation handler
  const handleResendInvite = async (invitationId: string) => {
    setLoadingAction(`resend-${invitationId}`);
    setStatusMessage(null);

    try {
      const res = await resendInvitationAction(invitationId);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else if (res.data) {
        setCreatedInviteLink(res.data.inviteLink);
        setStatusMessage({
          type: 'success',
          text: 'Invitation refreshed with a new 72-hour token.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to resend invitation.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Revoke invitation handler
  const handleRevokeInvite = async (invitationId: string) => {
    setLoadingAction(`revoke-${invitationId}`);
    setStatusMessage(null);

    try {
      const res = await revokeInvitationAction(invitationId);
      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error.message });
      } else {
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
        setStatusMessage({
          type: 'success',
          text: 'Invitation revoked.',
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to revoke invitation.' });
    } finally {
      setLoadingAction(null);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <div className="text-xs uppercase tracking-widest text-outline font-semibold mb-1">
            Zero-Trust Governance &bull; Identity Management
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-on-surface">
            Team &amp; Role Governance
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Manage user provisioning, permissions, MFA enforcement, and account lifecycle.
          </p>
        </div>

        <div>
          <Button onClick={() => setIsInviteOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <Banner
          variant={statusMessage.type === 'error' ? 'error' : 'info'}
          title={statusMessage.type === 'error' ? 'Operation Failed' : 'Success'}
        >
          {statusMessage.text}
        </Banner>
      )}

      {/* Created Invite Link Drawer / Display */}
      {createdInviteLink && (
        <div className="p-4 bg-secondary-container/50 border border-secondary-container rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-on-secondary-container">
              Manual Shareable Invitation Link (72 Hours)
            </span>
            <button
              type="button"
              onClick={() => copyLink(createdInviteLink)}
              className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>
          <p className="font-mono text-xs text-on-surface bg-surface-container-lowest p-2 rounded border border-outline-variant/30 break-all select-all">
            {createdInviteLink}
          </p>
        </div>
      )}

      {/* Invite Modal / Drawer */}
      {isInviteOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <h3 className="text-base font-semibold text-on-surface">Invite New Team Member</h3>
              <button
                type="button"
                onClick={() => setIsInviteOpen(false)}
                className="text-outline hover:text-on-surface"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="inv-name">
                  Full Name
                </label>
                <Input
                  id="inv-name"
                  required
                  placeholder="Melvin Dias"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="inv-email">
                  Email Address
                </label>
                <Input
                  id="inv-email"
                  type="email"
                  required
                  placeholder="melvin@vowsstudio.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-outline" htmlFor="inv-role">
                  Assigned Role
                </label>
                <select
                  id="inv-role"
                  className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface text-on-surface text-xs focus:outline-none"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AssignableRole)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-outline">
                  System Administrator role cannot be provisioned via invitation.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loadingAction === 'invite'}
                >
                  {loadingAction === 'invite' ? 'Generating...' : 'Create Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-on-surface">Registered Users ({users.length})</h2>
        <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-outline uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Role Governance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Security &amp; Lock</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isLocked = u.lockedUntil && new Date(u.lockedUntil) > new Date();

                  return (
                    <tr key={u.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">
                            {u.fullName} {isSelf && <span className="text-primary text-[10px]">(You)</span>}
                          </span>
                          <span className="text-[11px] text-outline font-mono">{u.email}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {u.role === 'system_admin' || isSelf ? (
                          <Badge variant="default" className="capitalize font-mono">
                            <Shield className="w-3 h-3 mr-1 inline" />
                            {u.role.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <select
                            className="h-8 px-2 rounded border border-outline-variant bg-surface text-on-surface text-xs focus:outline-none"
                            value={u.role}
                            disabled={loadingAction === `role-${u.id}`}
                            onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.replace('_', ' ')}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {u.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Deactivated</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isLocked ? (
                          <div className="flex items-center gap-1.5 text-error font-medium">
                            <span>Locked</span>
                            <button
                              type="button"
                              onClick={() => handleUnlock(u.id)}
                              disabled={loadingAction === `unlock-${u.id}`}
                              className="text-primary hover:underline text-[11px] inline-flex items-center gap-0.5"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Unlock</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-secondary text-[11px]">Normal</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!isSelf && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleActive(u.id, u.isActive)}
                                disabled={loadingAction === `active-${u.id}`}
                                title={u.isActive ? 'Deactivate user' : 'Reactivate user'}
                              >
                                {u.isActive ? (
                                  <UserX className="w-3.5 h-3.5 text-error" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5 text-secondary" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetMfa(u.id)}
                                disabled={loadingAction === `mfa-${u.id}`}
                                title="Reset MFA factors"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-outline" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invitations Table */}
      {invitations.length > 0 && (
        <div className="space-y-3 pt-4">
          <h2 className="text-base font-semibold text-on-surface">
            Pending Invitations ({invitations.length})
          </h2>
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container/60 border-b border-outline-variant/30 text-outline uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {invitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-container/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{inv.fullName}</span>
                          <span className="text-[11px] text-outline font-mono">{inv.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize font-medium text-on-surface-variant">
                        {inv.role.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-outline font-mono">
                        {new Date(inv.expiresAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvite(inv.id)}
                            disabled={loadingAction === `resend-${inv.id}`}
                            className="gap-1 text-[11px] h-7"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Refresh Link</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvite(inv.id)}
                            disabled={loadingAction === `revoke-${inv.id}`}
                            className="text-error hover:bg-error-container/20 text-[11px] h-7"
                          >
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
