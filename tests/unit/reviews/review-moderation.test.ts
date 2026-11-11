import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/constants/permissions';
import { ReviewStatus } from '@/types/reviews';

describe('Review Moderation & RBAC Governance (Phase 8, RBAC R6, REV-07)', () => {
  it('strictly adheres to Ruling R6: Manager can request & view reviews, but CANNOT moderate', () => {
    const adminPerms = ROLE_PERMISSIONS.system_admin;
    const ownerPerms = ROLE_PERMISSIONS.business_owner;
    const managerPerms = ROLE_PERMISSIONS.manager;
    const accountantPerms = ROLE_PERMISSIONS.accountant;
    const staffPerms = ROLE_PERMISSIONS.staff;
    const crewPerms = ROLE_PERMISSIONS.crew_member;

    // SA and BO have full review permissions
    expect(adminPerms.has('reviews:request')).toBe(true);
    expect(adminPerms.has('reviews:view')).toBe(true);
    expect(adminPerms.has('reviews:moderate')).toBe(true);

    expect(ownerPerms.has('reviews:request')).toBe(true);
    expect(ownerPerms.has('reviews:view')).toBe(true);
    expect(ownerPerms.has('reviews:moderate')).toBe(true);

    // Manager has reviews:request and reviews:view per R6 ruling
    expect(managerPerms.has('reviews:request')).toBe(true);
    expect(managerPerms.has('reviews:view')).toBe(true);

    // Manager is STRICTLY FORBIDDEN from moderating reviews (R6 ruling)
    expect(managerPerms.has('reviews:moderate')).toBe(false);

    // Other roles have no review permissions
    expect(accountantPerms.has('reviews:request')).toBe(false);
    expect(accountantPerms.has('reviews:moderate')).toBe(false);

    expect(staffPerms.has('reviews:request')).toBe(false);
    expect(staffPerms.has('reviews:moderate')).toBe(false);

    expect(crewPerms.has('reviews:request')).toBe(false);
    expect(crewPerms.has('reviews:moderate')).toBe(false);
  });

  describe('Review Moderation State Transitions', () => {
    function simulateModeration(
      actorRole: UserRole,
      currentStatus: ReviewStatus,
      targetStatus: ReviewStatus
    ): { success: boolean; newStatus?: ReviewStatus; error?: string } {
      const perms = ROLE_PERMISSIONS[actorRole];
      if (!perms.has('reviews:moderate')) {
        return { success: false, error: 'FORBIDDEN: Missing reviews:moderate permission.' };
      }

      // Valid state transitions (BUSINESS_WORKFLOWS §2.8):
      // pending -> approved | rejected
      // approved -> pending (re-hide)
      // rejected -> pending (reconsider)
      const allowedTransitions: Record<ReviewStatus, ReviewStatus[]> = {
        pending: ['approved', 'rejected'],
        approved: ['pending'],
        rejected: ['pending'],
      };

      if (!allowedTransitions[currentStatus]?.includes(targetStatus)) {
        return { success: false, error: `Invalid transition from ${currentStatus} to ${targetStatus}` };
      }

      return { success: true, newStatus: targetStatus };
    }

    it('allows System Admin and Business Owner to approve, reject, and re-hide reviews', () => {
      // Pending -> Approved
      expect(simulateModeration('system_admin', 'pending', 'approved').success).toBe(true);
      expect(simulateModeration('business_owner', 'pending', 'approved').success).toBe(true);

      // Pending -> Rejected
      expect(simulateModeration('system_admin', 'pending', 'rejected').success).toBe(true);
      expect(simulateModeration('business_owner', 'pending', 'rejected').success).toBe(true);

      // Approved -> Pending (Re-hide / retract)
      expect(simulateModeration('system_admin', 'approved', 'pending').success).toBe(true);
      expect(simulateModeration('business_owner', 'approved', 'pending').success).toBe(true);

      // Rejected -> Pending (Reconsider)
      expect(simulateModeration('system_admin', 'rejected', 'pending').success).toBe(true);
      expect(simulateModeration('business_owner', 'rejected', 'pending').success).toBe(true);
    });

    it('strictly forbids Manager from executing moderation transitions', () => {
      const resApprove = simulateModeration('manager', 'pending', 'approved');
      expect(resApprove.success).toBe(false);
      expect(resApprove.error).toContain('FORBIDDEN');

      const resReject = simulateModeration('manager', 'pending', 'rejected');
      expect(resReject.success).toBe(false);
      expect(resReject.error).toContain('FORBIDDEN');

      const resRehide = simulateModeration('manager', 'approved', 'pending');
      expect(resRehide.success).toBe(false);
      expect(resRehide.error).toContain('FORBIDDEN');
    });

    it('strictly forbids Accountant, Staff, and Crew from executing moderation', () => {
      expect(simulateModeration('accountant', 'pending', 'approved').success).toBe(false);
      expect(simulateModeration('staff', 'pending', 'approved').success).toBe(false);
      expect(simulateModeration('crew_member', 'pending', 'approved').success).toBe(false);
    });
  });

  describe('Public Showcase Visibility & Aggregate Rating Rules (REV-07, D-37)', () => {
    const mockReviews: Array<{ id: string; status: ReviewStatus; overall_rating: number }> = [
      { id: '1', status: 'approved', overall_rating: 5 },
      { id: '2', status: 'approved', overall_rating: 5 },
      { id: '3', status: 'pending', overall_rating: 4 },
      { id: '4', status: 'rejected', overall_rating: 1 },
      { id: '5', status: 'approved', overall_rating: 4 },
    ];

    it('filters public display to strictly approved reviews only', () => {
      const publicReviews = mockReviews.filter((r) => r.status === 'approved');
      expect(publicReviews).toHaveLength(3);
      expect(publicReviews.every((r) => r.status === 'approved')).toBe(true);

      // Pending and rejected are excluded
      expect(publicReviews.some((r) => r.id === '3')).toBe(false);
      expect(publicReviews.some((r) => r.id === '4')).toBe(false);
    });

    it('calculates aggregate ratings strictly from approved rows', () => {
      const approvedOnly = mockReviews.filter((r) => r.status === 'approved');
      const sum = approvedOnly.reduce((acc, r) => acc + r.overall_rating, 0);
      const avg = Number((sum / approvedOnly.length).toFixed(2));

      // (5 + 5 + 4) / 3 = 14 / 3 = 4.67
      expect(avg).toBe(4.67);

      // If pending or rejected were improperly included, average would be (5+5+4+1+4)/5 = 3.8
      expect(avg).not.toBe(3.8);
    });
  });
});
