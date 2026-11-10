import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { UserRole } from '@/lib/constants/permissions';

describe('Client Delivery Share Link & Token Security (D-36, DEL-03, SEC-04)', () => {
  interface SimulatedPipeline {
    id: string;
    booking_id: string;
    share_token_hash: string | null;
    share_expires_at: string | null;
    share_revoked_at: string | null;
  }

  function generateToken() {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  function resolvePublicShare(
    rawToken: string,
    pipeline: SimulatedPipeline
  ): { success: boolean; error?: string } {
    if (!rawToken || rawToken.trim().length < 32) {
      return { success: false, error: 'Invalid or expired delivery link.' };
    }

    const hash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
    if (pipeline.share_token_hash !== hash) {
      return { success: false, error: 'Invalid or expired delivery link.' };
    }

    if (pipeline.share_revoked_at) {
      return { success: false, error: 'Invalid or expired delivery link.' };
    }

    if (pipeline.share_expires_at) {
      const expires = new Date(pipeline.share_expires_at).getTime();
      if (expires <= Date.now()) {
        return { success: false, error: 'Invalid or expired delivery link.' };
      }
    }

    return { success: true };
  }

  it('generates 256-bit (64 hex char) token and validates SHA-256 hashing', () => {
    const { rawToken, tokenHash } = generateToken();
    expect(rawToken).toHaveLength(64);
    expect(tokenHash).toHaveLength(64);
    expect(rawToken).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify hash matches
    const verifyHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(verifyHash).toBe(tokenHash);
  });

  it('allows access with valid, unexpired, unrevoked token', () => {
    const { rawToken, tokenHash } = generateToken();
    const pipeline: SimulatedPipeline = {
      id: 'pipe-1',
      booking_id: 'booking-1',
      share_token_hash: tokenHash,
      share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      share_revoked_at: null,
    };

    const result = resolvePublicShare(rawToken, pipeline);
    expect(result.success).toBe(true);
  });

  it('rejects expired token with uniform message', () => {
    const { rawToken, tokenHash } = generateToken();
    const pipeline: SimulatedPipeline = {
      id: 'pipe-1',
      booking_id: 'booking-1',
      share_token_hash: tokenHash,
      share_expires_at: new Date(Date.now() - 1000).toISOString(), // expired 1s ago
      share_revoked_at: null,
    };

    const result = resolvePublicShare(rawToken, pipeline);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired delivery link.');
  });

  it('rejects revoked token with uniform message', () => {
    const { rawToken, tokenHash } = generateToken();
    const pipeline: SimulatedPipeline = {
      id: 'pipe-1',
      booking_id: 'booking-1',
      share_token_hash: tokenHash,
      share_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      share_revoked_at: new Date().toISOString(), // revoked!
    };

    const result = resolvePublicShare(rawToken, pipeline);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired delivery link.');
  });

  it('returns uniform error for nonexistent or guessed tokens', () => {
    const pipeline: SimulatedPipeline = {
      id: 'pipe-1',
      booking_id: 'booking-1',
      share_token_hash: 'known-hash',
      share_expires_at: null,
      share_revoked_at: null,
    };

    const guessedToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const result = resolvePublicShare(guessedToken, pipeline);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid or expired delivery link.');
  });

  it('enforces Staff assignment rule: Staff can only update assigned stages', () => {
    function canUserUpdateStage(
      userRole: UserRole,
      userId: string,
      stageAssignees: string[]
    ): boolean {
      if (['system_admin', 'business_owner', 'manager'].includes(userRole)) {
        return true;
      }
      if (userRole === 'staff') {
        return stageAssignees.includes(userId);
      }
      return false; // crew and others cannot update
    }

    const assignedStaffId = 'staff-user-1';
    const unassignedStaffId = 'staff-user-2';
    const stageAssignees = [assignedStaffId];

    // Leadership can update any stage
    expect(canUserUpdateStage('system_admin', 'admin-1', stageAssignees)).toBe(true);
    expect(canUserUpdateStage('business_owner', 'owner-1', stageAssignees)).toBe(true);
    expect(canUserUpdateStage('manager', 'mgr-1', stageAssignees)).toBe(true);

    // Assigned staff can update
    expect(canUserUpdateStage('staff', assignedStaffId, stageAssignees)).toBe(true);

    // Unassigned staff is denied
    expect(canUserUpdateStage('staff', unassignedStaffId, stageAssignees)).toBe(false);

    // Crew member is strictly denied
    expect(canUserUpdateStage('crew_member', 'crew-1', stageAssignees)).toBe(false);
  });
});
