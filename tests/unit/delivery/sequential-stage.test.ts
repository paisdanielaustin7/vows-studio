import { describe, it, expect } from 'vitest';
import { UserRole } from '@/lib/constants/permissions';

describe('Delivery Pipeline Sequential Progression & Overrides (DEL-03, D-36)', () => {

  interface SimulatedStage {
    id: string;
    sort: number;
    stage_code: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    completed_at: string | null;
    blocked_reason: string | null;
    override_reason: string | null;
    overridden_by: string | null;
  }

  // Pure simulation function mirroring database trigger `fn_check_delivery_stage_sequential`
  function simulateStageTransition(params: {
    targetStageSort: number;
    newStatus: 'pending' | 'in_progress' | 'completed' | 'blocked';
    allStages: SimulatedStage[];
    actorRole: UserRole;
    actorId: string;
    overrideReason?: string | null;
    blockedReason?: string | null;
  }) {
    const { targetStageSort, newStatus, allStages, actorRole, actorId, overrideReason, blockedReason } = params;

    const stage = allStages.find((s) => s.sort === targetStageSort);
    if (!stage) throw new Error('Stage not found');

    // 1. Blocked reason check
    if (newStatus === 'blocked') {
      if (!blockedReason || blockedReason.trim().length === 0) {
        throw new Error('A blocked reason is required when marking a delivery stage as blocked.');
      }
      stage.status = 'blocked';
      stage.blocked_reason = blockedReason;
      return { success: true, stage };
    }

    // 2. Sequential check if marking as completed
    if (newStatus === 'completed' && stage.status !== 'completed') {
      if (stage.sort > 1) {
        const priorIncomplete = allStages.some(
          (s) => s.sort < stage.sort && s.status !== 'completed'
        );

        if (priorIncomplete) {
          if (!['system_admin', 'business_owner'].includes(actorRole)) {
            throw new Error(
              `Stage ${stage.sort} cannot be completed until prior stages are completed. An override reason and Owner/Admin permissions are required to override sequential completion.`
            );
          }

          if (!overrideReason || overrideReason.trim().length === 0) {
            throw new Error(
              `An override reason is required to complete stage ${stage.sort} before prior stages are completed.`
            );
          }

          stage.override_reason = overrideReason;
          stage.overridden_by = actorId;
        }
      }

      stage.status = 'completed';
      stage.completed_at = new Date().toISOString();
      return { success: true, stage };
    }

    // 3. Reverting from completed
    if (newStatus !== 'completed' && stage.status === 'completed') {
      stage.status = newStatus;
      stage.completed_at = null;
      return { success: true, stage };
    }

    stage.status = newStatus;
    return { success: true, stage };
  }

  function createInitial9Stages(): SimulatedStage[] {
    const codes = [
      'raw_import',
      'culling',
      'editing',
      'client_preview',
      'revisions',
      'final_export',
      'quality_check',
      'delivery',
      'completed',
    ];
    return codes.map((code, index) => ({
      id: `stage-${index + 1}`,
      sort: index + 1,
      stage_code: code,
      status: 'pending',
      completed_at: null,
      blocked_reason: null,
      override_reason: null,
      overridden_by: null,
    }));
  }

  it('allows completing stage 1 without prior dependencies', () => {
    const stages = createInitial9Stages();
    const result = simulateStageTransition({
      targetStageSort: 1,
      newStatus: 'completed',
      allStages: stages,
      actorRole: 'staff',
      actorId: 'user-staff-1',
    });

    expect(result.success).toBe(true);
    expect(result.stage.status).toBe('completed');
    expect(result.stage.completed_at).toBeDefined();
  });

  it('allows completing stage 2 once stage 1 is complete', () => {
    const stages = createInitial9Stages();
    stages[0].status = 'completed';

    const result = simulateStageTransition({
      targetStageSort: 2,
      newStatus: 'completed',
      allStages: stages,
      actorRole: 'staff',
      actorId: 'user-staff-1',
    });

    expect(result.success).toBe(true);
    expect(result.stage.status).toBe('completed');
  });

  it('strictly blocks completing stage 3 when stage 2 is pending (for staff)', () => {
    const stages = createInitial9Stages();
    stages[0].status = 'completed';
    // Stage 2 is pending

    expect(() =>
      simulateStageTransition({
        targetStageSort: 3,
        newStatus: 'completed',
        allStages: stages,
        actorRole: 'staff',
        actorId: 'user-staff-1',
      })
    ).toThrowError(/cannot be completed until prior stages are completed/);
  });

  it('strictly blocks completing stage 3 when stage 2 is pending (for manager)', () => {
    const stages = createInitial9Stages();
    stages[0].status = 'completed';

    expect(() =>
      simulateStageTransition({
        targetStageSort: 3,
        newStatus: 'completed',
        allStages: stages,
        actorRole: 'manager',
        actorId: 'user-manager-1',
        overrideReason: 'Manager trying to override',
      })
    ).toThrowError(/Owner\/Admin permissions are required/);
  });

  it('allows Business Owner or System Admin to override sequential order with reason', () => {
    const stages = createInitial9Stages();
    stages[0].status = 'completed';
    // Stage 2 is pending, skipping straight to Stage 4 (client_preview)
    const result = simulateStageTransition({
      targetStageSort: 4,
      newStatus: 'completed',
      allStages: stages,
      actorRole: 'business_owner',
      actorId: 'owner-uuid-1',
      overrideReason: 'Urgent client teaser preview released ahead of full cull',
    });

    expect(result.success).toBe(true);
    expect(result.stage.status).toBe('completed');
    expect(result.stage.override_reason).toBe(
      'Urgent client teaser preview released ahead of full cull'
    );
    expect(result.stage.overridden_by).toBe('owner-uuid-1');
  });

  it('rejects Owner override if override reason is omitted', () => {
    const stages = createInitial9Stages();

    expect(() =>
      simulateStageTransition({
        targetStageSort: 5,
        newStatus: 'completed',
        allStages: stages,
        actorRole: 'system_admin',
        actorId: 'admin-uuid-1',
        overrideReason: '',
      })
    ).toThrowError(/An override reason is required/);
  });

  it('strictly requires a blocked reason when marking stage as blocked', () => {
    const stages = createInitial9Stages();

    expect(() =>
      simulateStageTransition({
        targetStageSort: 2,
        newStatus: 'blocked',
        allStages: stages,
        actorRole: 'staff',
        actorId: 'user-staff-1',
        blockedReason: '',
      })
    ).toThrowError(/A blocked reason is required/);

    const result = simulateStageTransition({
      targetStageSort: 2,
      newStatus: 'blocked',
      allStages: stages,
      actorRole: 'staff',
      actorId: 'user-staff-1',
      blockedReason: 'Corrupt CFexpress card B awaiting recovery software',
    });

    expect(result.success).toBe(true);
    expect(result.stage.status).toBe('blocked');
    expect(result.stage.blocked_reason).toBe('Corrupt CFexpress card B awaiting recovery software');
  });

  it('clears completed_at when reverting from completed to in_progress', () => {
    const stages = createInitial9Stages();
    stages[0].status = 'completed';
    stages[0].completed_at = '2026-11-10T12:00:00Z';

    const result = simulateStageTransition({
      targetStageSort: 1,
      newStatus: 'in_progress',
      allStages: stages,
      actorRole: 'business_owner',
      actorId: 'owner-uuid-1',
    });

    expect(result.success).toBe(true);
    expect(result.stage.status).toBe('in_progress');
    expect(result.stage.completed_at).toBeNull();
  });
});
