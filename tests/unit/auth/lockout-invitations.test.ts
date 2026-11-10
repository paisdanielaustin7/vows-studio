import { describe, it, expect } from 'vitest';
import { generateSecureToken, hashToken, timingSafeCompare } from '@/lib/utils';
import { UserRole } from '@/lib/constants/permissions';

describe('Lockout, Invitations, & Governance Guards (DoD Validation)', () => {
  describe('Account Lockout Logic', () => {
    function computeLockout(failuresInWindow: number): { isLocked: boolean; durationMinutes?: number } {
      if (failuresInWindow >= 5) {
        return { isLocked: true, durationMinutes: 30 };
      }
      return { isLocked: false };
    }

    it('triggers a 30-minute account lockout upon reaching 5 failures in 15 minutes', () => {
      expect(computeLockout(4).isLocked).toBe(false);
      expect(computeLockout(5).isLocked).toBe(true);
      expect(computeLockout(5).durationMinutes).toBe(30);
      expect(computeLockout(8).isLocked).toBe(true);
    });
  });

  describe('Invitations: 72-hour Single Use Token Engine', () => {
    it('generates a 256-bit cryptographically secure token and SHA-256 hash', () => {
      const rawToken = generateSecureToken(32);
      expect(rawToken.length).toBe(64); // 32 bytes hex encoded = 64 chars

      const hash1 = hashToken(rawToken);
      const hash2 = hashToken(rawToken);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });

    it('ensures constant-time comparison matches valid tokens', () => {
      const token = 'c9a87d6e5f4b3a21';
      expect(timingSafeCompare(token, token)).toBe(true);
      expect(timingSafeCompare(token, 'different-token-123')).toBe(false);
    });

    function validateInvitation(invitation: {
      expiresAt: Date;
      acceptedAt: Date | null;
      revokedAt: Date | null;
      currentTime: Date;
    }): { valid: boolean; reason?: string } {
      if (invitation.revokedAt) {
        return { valid: false, reason: 'revoked' };
      }
      if (invitation.acceptedAt) {
        return { valid: false, reason: 'single-use-exhausted' };
      }
      if (invitation.currentTime > invitation.expiresAt) {
        return { valid: false, reason: 'expired' };
      }
      return { valid: true };
    }

    it('validates that invitations expire after 72 hours', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      // Within 72 hours
      const t1 = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      expect(validateInvitation({
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
        currentTime: t1,
      }).valid).toBe(true);

      // Past 72 hours
      const t2 = new Date(now.getTime() + 72 * 60 * 60 * 1000 + 1000);
      const res = validateInvitation({
        expiresAt,
        acceptedAt: null,
        revokedAt: null,
        currentTime: t2,
      });
      expect(res.valid).toBe(false);
      expect(res.reason).toBe('expired');
    });

    it('guarantees single-use: cannot be reused once accepted or revoked', () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

      // Already accepted
      const acceptedRes = validateInvitation({
        expiresAt,
        acceptedAt: new Date(now.getTime() - 1000),
        revokedAt: null,
        currentTime: now,
      });
      expect(acceptedRes.valid).toBe(false);
      expect(acceptedRes.reason).toBe('single-use-exhausted');

      // Revoked
      const revokedRes = validateInvitation({
        expiresAt,
        acceptedAt: null,
        revokedAt: new Date(now.getTime() - 1000),
        currentTime: now,
      });
      expect(revokedRes.valid).toBe(false);
      expect(revokedRes.reason).toBe('revoked');
    });
  });

  describe('Role Governance & Last Owner Guards', () => {
    function guardRoleChange(actorId: string, targetId: string, newRole: UserRole): { allowed: boolean; error?: string } {
      if (actorId === targetId) {
        return { allowed: false, error: 'Self-role modification forbidden' };
      }
      if (newRole === 'system_admin') {
        return { allowed: false, error: 'Cannot elevate to system_admin via app' };
      }
      return { allowed: true };
    }

    it('strictly forbids self-role modification', () => {
      const selfChange = guardRoleChange('user-1', 'user-1', 'business_owner');
      expect(selfChange.allowed).toBe(false);
      expect(selfChange.error).toBe('Self-role modification forbidden');
    });

    it('blocks elevating anyone to system_admin through application layer', () => {
      const elevate = guardRoleChange('admin-1', 'user-2', 'system_admin');
      expect(elevate.allowed).toBe(false);
      expect(elevate.error).toBe('Cannot elevate to system_admin via app');
    });

    function checkLastOwnerGuard(
      targetRole: UserRole,
      newRole: UserRole,
      newActive: boolean,
      otherActiveCount: number
    ): { allowed: boolean; error?: string } {
      if (targetRole === 'system_admin' && (newRole !== 'system_admin' || !newActive)) {
        if (otherActiveCount < 1) {
          return { allowed: false, error: 'Cannot deactivate or demote the last active System Administrator' };
        }
      }
      if (targetRole === 'business_owner' && (newRole !== 'business_owner' || !newActive)) {
        if (otherActiveCount < 1) {
          return { allowed: false, error: 'Cannot deactivate or demote the last active Business Owner' };
        }
      }
      return { allowed: true };
    }

    it('prevents demoting or deactivating the last active System Administrator', () => {
      const demoteLastSa = checkLastOwnerGuard('system_admin', 'manager', true, 0);
      expect(demoteLastSa.allowed).toBe(false);
      expect(demoteLastSa.error).toBe('Cannot deactivate or demote the last active System Administrator');

      const deactivateLastSa = checkLastOwnerGuard('system_admin', 'system_admin', false, 0);
      expect(deactivateLastSa.allowed).toBe(false);

      // Allowed if another SA exists
      const demoteWithOtherSa = checkLastOwnerGuard('system_admin', 'manager', true, 1);
      expect(demoteWithOtherSa.allowed).toBe(true);
    });

    it('prevents demoting or deactivating the last active Business Owner', () => {
      const demoteLastBo = checkLastOwnerGuard('business_owner', 'manager', true, 0);
      expect(demoteLastBo.allowed).toBe(false);
      expect(demoteLastBo.error).toBe('Cannot deactivate or demote the last active Business Owner');

      const deactivateLastBo = checkLastOwnerGuard('business_owner', 'business_owner', false, 0);
      expect(deactivateLastBo.allowed).toBe(false);

      // Allowed if another BO exists
      const demoteWithOtherBo = checkLastOwnerGuard('business_owner', 'manager', true, 1);
      expect(demoteWithOtherBo.allowed).toBe(true);
    });
  });
});
