'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  updateStageStatusSchema,
  assignStageStaffSchema,
  addStageAttachmentSchema,
  generateShareLinkSchema,
  updatePipelineDetailsSchema,
  UpdateStageStatusInput,
  AssignStageStaffInput,
  AddStageAttachmentInput,
  GenerateShareLinkInput,
  UpdatePipelineDetailsInput,
} from '@/lib/validations/delivery.schema';
import {
  DeliveryPipeline,
  DeliveryPipelineSummary,
  DeliveryStage,
  DeliveryStageCode,
  DeliveryStageStatus,
  PublicDeliveryClientView,
  DELIVERY_STAGE_CONFIG,
} from '@/types/delivery';
import { ActionResult } from '@/types/auth';

/**
 * Retrieves the full delivery pipeline for a booking.
 * Automatically initializes the 9 stages if not yet initialized.
 */
export async function getDeliveryPipelineAction(
  bookingId: string
): Promise<ActionResult<DeliveryPipeline>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const supabase = await createClient();

    // Verify crew authorization if crew member
    if (user.role === 'crew_member') {
      const { data: crewAssignment } = await supabase
        .from('event_crew_assignments')
        .select('id, events!inner(booking_id)')
        .eq('events.booking_id', bookingId)
        .limit(1);

      if (!crewAssignment || crewAssignment.length === 0) {
        return { error: { code: 'FORBIDDEN', message: 'Not assigned to this booking' } };
      }
    }

    // 1. Fetch or initialize pipeline
    const { data: initialPipeline, error: pipelineError } = await supabase
      .from('delivery_pipelines')
      .select('*')
      .eq('booking_id', bookingId)
      .maybeSingle();

    if (pipelineError) {
      return { error: { code: 'INTERNAL_ERROR', message: pipelineError.message } };
    }

    let pipeline = initialPipeline;

    if (!pipeline) {
      // Auto-initialize pipeline with the 9 canonical stages
      const adminClient = getAdminClient();
      const { data: newPipelineId, error: initError } = await (adminClient.rpc as any)(
        'init_booking_delivery_pipeline',
        {
          p_booking_id: bookingId,
        }
      );

      if (initError) {
        return { error: { code: 'INTERNAL_ERROR', message: initError.message } };
      }

      const { data: createdPipeline } = await supabase
        .from('delivery_pipelines')
        .select('*')
        .eq('id', newPipelineId as string)
        .single();

      pipeline = createdPipeline;
    }

    if (!pipeline) {
      return { error: { code: 'NOT_FOUND', message: 'Delivery pipeline not found' } };
    }

    // 2. Fetch stages
    const { data: stagesData, error: stagesError } = await supabase
      .from('delivery_stages')
      .select('*')
      .eq('pipeline_id', pipeline.id)
      .order('sort', { ascending: true });

    if (stagesError) {
      return { error: { code: 'INTERNAL_ERROR', message: stagesError.message } };
    }

    const stageIds = (stagesData || []).map((s) => s.id);

    // 3. Fetch assignees
    const assigneesByStage: Record<string, any[]> = {};
    if (stageIds.length > 0) {
      const { data: assigneesData } = await supabase
        .from('delivery_stage_assignees')
        .select('stage_id, profile_id, assigned_at, profiles(id, full_name, email, role, avatar_path)')
        .in('stage_id', stageIds);

      (assigneesData || []).forEach((item: any) => {
        if (!assigneesByStage[item.stage_id]) {
          assigneesByStage[item.stage_id] = [];
        }
        assigneesByStage[item.stage_id].push({
          stage_id: item.stage_id,
          profile_id: item.profile_id,
          assigned_at: item.assigned_at,
          profile: item.profiles
            ? {
                id: item.profiles.id,
                full_name: item.profiles.full_name,
                email: item.profiles.email,
                role: item.profiles.role,
                avatar_url: item.profiles.avatar_path,
              }
            : null,
        });
      });
    }

    // 4. Fetch attachments
    const attachmentsByStage: Record<string, any[]> = {};
    if (stageIds.length > 0) {
      const { data: attachmentsData } = await supabase
        .from('delivery_stage_attachments')
        .select('id, stage_id, kind, label, url, file_id, file_path, file_size_bytes, created_by, created_at, profiles(id, full_name)')
        .in('stage_id', stageIds)
        .order('created_at', { ascending: true });

      (attachmentsData || []).forEach((item: any) => {
        if (!attachmentsByStage[item.stage_id]) {
          attachmentsByStage[item.stage_id] = [];
        }
        attachmentsByStage[item.stage_id].push({
          id: item.id,
          stage_id: item.stage_id,
          kind: item.kind,
          label: item.label,
          url: item.url,
          file_id: item.file_id,
          file_path: item.file_path,
          file_size_bytes: item.file_size_bytes,
          created_by: item.created_by,
          created_at: item.created_at,
          uploader: item.profiles
            ? {
                id: item.profiles.id,
                full_name: item.profiles.full_name,
              }
            : null,
        });
      });
    }

    const stages: DeliveryStage[] = (stagesData || []).map((row: any) => ({
      id: row.id,
      pipeline_id: row.pipeline_id,
      stage_code: row.stage_code as DeliveryStageCode,
      sort: row.sort,
      status: row.status as DeliveryStageStatus,
      started_at: row.started_at,
      completed_at: row.completed_at,
      blocked_reason: row.blocked_reason,
      notes: row.notes,
      override_reason: row.override_reason,
      overridden_by: row.overridden_by,
      overridden_at: row.overridden_at,
      assignees: assigneesByStage[row.id] || [],
      attachments: attachmentsByStage[row.id] || [],
    }));

    const result: DeliveryPipeline = {
      id: pipeline.id,
      booking_id: pipeline.booking_id,
      target_date: pipeline.target_date,
      completed_at: pipeline.completed_at,
      notes: pipeline.notes,
      share_token_hash: pipeline.share_token_hash,
      share_expires_at: pipeline.share_expires_at,
      share_revoked_at: pipeline.share_revoked_at,
      created_at: pipeline.created_at,
      updated_at: pipeline.updated_at,
      stages,
    };

    return { data: result };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to retrieve delivery pipeline' },
    };
  }
}

/**
 * Updates a delivery stage status, enforcing sequential progression, SA/BO overrides, and blocked reasons.
 */
export async function updateStageStatusAction(
  rawInput: UpdateStageStatusInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const parsed = updateStageStatusSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid input',
        },
      };
    }

    const { stageId, status, blockedReason, overrideReason, notes } = parsed.data;
    const supabase = await createClient();

    // Fetch the stage and pipeline
    const { data: targetStage, error: stageErr } = await supabase
      .from('delivery_stages')
      .select('id, pipeline_id, stage_code, sort, status')
      .eq('id', stageId)
      .single();

    if (stageErr || !targetStage) {
      return { error: { code: 'NOT_FOUND', message: 'Delivery stage not found' } };
    }

    // Role check:
    // SA, BO, MG can update any stage.
    // Staff can update ONLY if assigned to this stage.
    // Crew is read-only.
    const isLeadership = ['system_admin', 'business_owner', 'manager'].includes(user.role);
    if (!isLeadership) {
      if (user.role === 'staff') {
        const { data: isAssigned } = await supabase
          .from('delivery_stage_assignees')
          .select('stage_id')
          .eq('stage_id', stageId)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (!isAssigned) {
          return {
            error: {
              code: 'FORBIDDEN',
              message: 'Staff members can only update stages they are assigned to.',
            },
          };
        }
      } else {
        return { error: { code: 'FORBIDDEN', message: 'Permission denied: read-only access.' } };
      }
    }

    // Sequential completion verification
    let overrideAudited = false;
    if (status === 'completed' && targetStage.status !== 'completed' && targetStage.sort > 1) {
      const { data: priorIncomplete } = await supabase
        .from('delivery_stages')
        .select('id, sort, stage_code')
        .eq('pipeline_id', targetStage.pipeline_id)
        .lt('sort', targetStage.sort)
        .neq('status', 'completed');

      if (priorIncomplete && priorIncomplete.length > 0) {
        // Must be SA or BO and have overrideReason
        const canOverride = ['system_admin', 'business_owner'].includes(user.role);
        if (!canOverride) {
          return {
            error: {
              code: 'FORBIDDEN',
              message: `Stage ${targetStage.sort} cannot be completed until prior stages are completed. Only Studio Owner or Admin can override with a logged reason.`,
            },
          };
        }

        if (!overrideReason || overrideReason.trim().length === 0) {
          return {
            error: {
              code: 'VALIDATION_ERROR',
              message: `An override reason is required to complete stage ${targetStage.sort} ahead of sequential order.`,
            },
          };
        }

        overrideAudited = true;
      }
    }

    // Build update payload
    const updatePayload: Record<string, any> = {
      status,
      notes: notes !== undefined ? notes : undefined,
      blocked_reason: status === 'blocked' ? blockedReason : null,
    };

    if (status === 'in_progress' && targetStage.status === 'pending') {
      updatePayload.started_at = new Date().toISOString();
    } else if (status === 'completed' && targetStage.status !== 'completed') {
      updatePayload.completed_at = new Date().toISOString();
      if (overrideAudited) {
        updatePayload.override_reason = overrideReason;
        updatePayload.overridden_by = user.id;
        updatePayload.overridden_at = new Date().toISOString();
      }
    } else if (status !== 'completed' && targetStage.status === 'completed') {
      // Reverting from completed
      updatePayload.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from('delivery_stages')
      .update(updatePayload as any)
      .eq('id', stageId);

    if (updateError) {
      return { error: { code: 'INTERNAL_ERROR', message: updateError.message } };
    }

    // Get pipeline bookingId for revalidation
    const { data: pipelineData } = await supabase
      .from('delivery_pipelines')
      .select('booking_id')
      .eq('id', targetStage.pipeline_id)
      .single();

    if (pipelineData) {
      revalidatePath(`/crm/bookings/${pipelineData.booking_id}`);
    }
    revalidatePath('/crm/delivery');

    return { data: undefined };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to update stage status' },
    };
  }
}

/**
 * Assigns staff members to a delivery stage.
 * Requires delivery:manage (SA, BO, MG).
 */
export async function assignStageStaffAction(
  rawInput: AssignStageStaffInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'delivery:manage');

    const parsed = assignStageStaffSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid input',
        },
      };
    }

    const { stageId, profileIds } = parsed.data;
    const supabase = await createClient();

    // 1. Delete existing assignees
    await supabase.from('delivery_stage_assignees').delete().eq('stage_id', stageId);

    // 2. Insert new assignees
    if (profileIds.length > 0) {
      const rows = profileIds.map((pid) => ({
        stage_id: stageId,
        profile_id: pid,
        assigned_by: user.id,
      }));

      const { error: insertErr } = await supabase
        .from('delivery_stage_assignees')
        .insert(rows);

      if (insertErr) {
        return { error: { code: 'INTERNAL_ERROR', message: insertErr.message } };
      }
    }

    return { data: undefined };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to assign stage staff' },
    };
  }
}

/**
 * Adds an attachment (link or small file <= 50MB) to a delivery stage.
 * Permitted for SA, BO, MG, or assigned Staff.
 */
export async function addStageAttachmentAction(
  rawInput: AddStageAttachmentInput
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const parsed = addStageAttachmentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid attachment data',
        },
      };
    }

    const { stageId, kind, label, url, filePath, fileSizeBytes } = parsed.data;
    const supabase = await createClient();

    // Verify permission
    const isLeadership = ['system_admin', 'business_owner', 'manager'].includes(user.role);
    if (!isLeadership) {
      if (user.role === 'staff') {
        const { data: isAssigned } = await supabase
          .from('delivery_stage_assignees')
          .select('stage_id')
          .eq('stage_id', stageId)
          .eq('profile_id', user.id)
          .maybeSingle();

        if (!isAssigned) {
          return { error: { code: 'FORBIDDEN', message: 'Only assigned staff can attach deliverables.' } };
        }
      } else {
        return { error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
      }
    }

    const { data: newAttachment, error: insertError } = await supabase
      .from('delivery_stage_attachments')
      .insert({
        stage_id: stageId,
        kind,
        label,
        url: kind === 'link' ? url : null,
        file_path: kind === 'file' ? filePath : null,
        file_size_bytes: kind === 'file' ? fileSizeBytes : null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (insertError || !newAttachment) {
      return { error: { code: 'INTERNAL_ERROR', message: insertError?.message || 'Failed to save attachment' } };
    }

    return { data: { id: newAttachment.id } };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to add attachment' },
    };
  }
}

/**
 * Deletes an attachment from a delivery stage.
 * Permitted for SA, BO, MG, or the user who created it.
 */
export async function deleteStageAttachmentAction(
  attachmentId: string
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    const supabase = await createClient();
    const isLeadership = ['system_admin', 'business_owner', 'manager'].includes(user.role);

    let query = supabase.from('delivery_stage_attachments').delete().eq('id', attachmentId);
    if (!isLeadership) {
      query = query.eq('created_by', user.id);
    }

    const { error } = await query;
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    return { data: undefined };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to delete attachment' },
    };
  }
}

/**
 * Generates or refreshes a cryptographically secure 256-bit client share link.
 * Stores only the SHA-256 hash in the database.
 */
export async function generateShareLinkAction(
  rawInput: GenerateShareLinkInput
): Promise<ActionResult<{ shareUrl: string; rawToken: string; expiresAt: string }>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !['system_admin', 'business_owner', 'manager', 'staff'].includes(user.role)) {
      return { error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
    }

    const parsed = generateShareLinkSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid parameters',
        },
      };
    }

    const { pipelineId, expiresInDays } = parsed.data;

    // Generate 32 bytes (256-bit) cryptographically random hex token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

    const supabase = await createClient();
    const { error } = await supabase
      .from('delivery_pipelines')
      .update({
        share_token_hash: tokenHash,
        share_expires_at: expiresAt,
        share_revoked_at: null,
      })
      .eq('id', pipelineId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    return {
      data: {
        shareUrl: `/delivery/${rawToken}`,
        rawToken,
        expiresAt,
      },
    };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to generate share link' },
    };
  }
}

/**
 * Revokes a client share link immediately.
 */
export async function revokeShareLinkAction(
  pipelineId: string
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'delivery:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('delivery_pipelines')
      .update({
        share_revoked_at: new Date().toISOString(),
      })
      .eq('id', pipelineId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    return { data: undefined };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to revoke share link' },
    };
  }
}

/**
 * Updates delivery pipeline target date and notes.
 */
export async function updatePipelineDetailsAction(
  rawInput: UpdatePipelineDetailsInput
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'delivery:manage');

    const parsed = updatePipelineDetailsSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message || 'Invalid input',
        },
      };
    }

    const { pipelineId, targetDate, notes } = parsed.data;
    const supabase = await createClient();

    const { error } = await supabase
      .from('delivery_pipelines')
      .update({
        target_date: targetDate,
        notes,
      })
      .eq('id', pipelineId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    return { data: undefined };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to update pipeline details' },
    };
  }
}

/**
 * Public action: retrieves client delivery view using the raw share token.
 * Validates SHA-256 hash, non-revocation, and non-expiration.
 * Returns a uniform "Invalid or expired delivery link." error on any failure to prevent token guessing.
 * Excludes internal notes, staff assignees, or financial data.
 */
export async function getPublicDeliveryAction(
  rawToken: string
): Promise<ActionResult<PublicDeliveryClientView>> {
  try {
    let clientIp = '127.0.0.1';
    try {
      const h = await headers();
      const forwarded = h.get('x-forwarded-for');
      clientIp = forwarded ? forwarded.split(',')[0].trim() : h.get('x-real-ip') || '127.0.0.1';
    } catch {
      clientIp = '127.0.0.1';
    }

    const rate = await checkRateLimit('token_pages', clientIp);
    if (!rate.success) {
      return {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a minute before trying again.',
        },
      };
    }

    if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length < 32) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or expired delivery link.',
        },
      };
    }

    // Compute SHA-256 hash
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    // Use admin client for unauthenticated client share retrieval
    const adminClient = getAdminClient();

    const { data: pipeline, error: pipeErr } = await adminClient
      .from('delivery_pipelines')
      .select('id, booking_id, target_date, completed_at, share_token_hash, share_expires_at, share_revoked_at')
      .eq('share_token_hash', tokenHash)
      .maybeSingle();

    if (pipeErr || !pipeline) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or expired delivery link.',
        },
      };
    }

    // Check revocation
    if (pipeline.share_revoked_at) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or expired delivery link.',
        },
      };
    }

    // Check expiration
    if (pipeline.share_expires_at) {
      const expires = new Date(pipeline.share_expires_at).getTime();
      if (expires <= Date.now()) {
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Invalid or expired delivery link.',
          },
        };
      }
    }

    // Load booking and client details
    const { data: booking, error: bookErr } = await adminClient
      .from('bookings')
      .select('id, booking_number, status, target_delivery_date, clients(full_name)')
      .eq('id', pipeline.booking_id)
      .single();

    if (bookErr || !booking) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or expired delivery link.',
        },
      };
    }

    // Load primary package / services from booking line items
    const { data: lineItems } = await adminClient
      .from('booking_line_items')
      .select('description')
      .eq('booking_id', booking.id)
      .limit(1);

    // Load events for dates & venue
    const { data: events } = await adminClient
      .from('events')
      .select('name, event_type, event_date, start_time, venue_name')
      .eq('booking_id', booking.id)
      .order('event_date', { ascending: true });

    // Load stages
    const { data: stagesData, error: stagesErr } = await adminClient
      .from('delivery_stages')
      .select('id, stage_code, sort, status, completed_at')
      .eq('pipeline_id', pipeline.id)
      .order('sort', { ascending: true });

    if (stagesErr || !stagesData) {
      return {
        error: {
          code: 'NOT_FOUND',
          message: 'Invalid or expired delivery link.',
        },
      };
    }

    const stageIds = stagesData.map((s) => s.id);

    // Load attachments (deliverables)
    let deliverables: any[] = [];
    if (stageIds.length > 0) {
      const { data: attachmentsData } = await adminClient
        .from('delivery_stage_attachments')
        .select('id, stage_id, kind, label, url, file_path, file_size_bytes, created_at')
        .in('stage_id', stageIds)
        .order('created_at', { ascending: true });

      const stageMap = new Map(stagesData.map((s) => [s.id, s]));

      deliverables = (attachmentsData || []).map((att) => {
        const stage = stageMap.get(att.stage_id);
        const stageCode = (stage?.stage_code || 'raw_import') as DeliveryStageCode;
        const config = DELIVERY_STAGE_CONFIG[stageCode];

        return {
          id: att.id,
          stageSort: stage?.sort || 1,
          stageCode,
          stageLabel: config?.shortTitle || stageCode,
          kind: att.kind,
          label: att.label,
          url: att.url,
          filePath: att.file_path,
          fileSizeBytes: att.file_size_bytes,
          createdAt: att.created_at,
        };
      });
    }

    // Compute progress
    const completedStages = stagesData.filter((s) => s.status === 'completed');
    const progressPercentage = Math.round((completedStages.length / 9) * 100);

    // Current stage
    const currentActiveStage =
      stagesData.find((s) => s.status !== 'completed') || stagesData[stagesData.length - 1];
    const currentStageCode = currentActiveStage.stage_code as DeliveryStageCode;
    const currentStageConfig = DELIVERY_STAGE_CONFIG[currentStageCode];

    // Format event dates & venue
    let eventDatesText = '';
    let venueText = '';
    if (events && events.length > 0) {
      venueText = events
        .map((e) => e.venue_name)
        .filter(Boolean)
        .slice(0, 2)
        .join(' & ');
      const dates = events
        .map((e) => (e.event_date ? new Date(e.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null))
        .filter(Boolean);
      eventDatesText = dates[0] ? (dates.length > 1 ? `${dates[0]} – ${dates[dates.length - 1]}` : dates[0]) : '';
    }

    const clientName = (booking.clients as any)?.full_name || 'Valued Client';
    const packageTitle = lineItems?.[0]?.description || 'Wedding Photography & Film Collection';

    const clientView: PublicDeliveryClientView = {
      bookingNumber: booking.booking_number,
      clientName,
      packageTitle,
      eventDatesText,
      venueText,
      targetDeliveryDate: pipeline.target_date || booking.target_delivery_date,
      completedAt: pipeline.completed_at,
      progressPercentage,
      currentStageTitle: currentStageConfig?.title || currentStageCode,
      currentStageSort: currentActiveStage.sort,
      stages: stagesData.map((s) => ({
        sort: s.sort,
        code: s.stage_code as DeliveryStageCode,
        label: DELIVERY_STAGE_CONFIG[s.stage_code as DeliveryStageCode]?.shortTitle || s.stage_code,
        status: s.status as DeliveryStageStatus,
        completedAt: s.completed_at,
      })),
      deliverables,
    };

    return { data: clientView };
  } catch (err: any) {
    return {
      error: {
        code: 'NOT_FOUND',
        message: 'Invalid or expired delivery link.',
      },
    };
  }
}

/**
 * Lists all active delivery pipelines with derived progress, behind_schedule flags, and statuses.
 */
export async function listDeliveryPipelinesAction(): Promise<
  ActionResult<DeliveryPipelineSummary[]>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'delivery:view');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('delivery_pipelines_v')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const summaries: DeliveryPipelineSummary[] = (data || []).map((row: any) => ({
      id: row.id,
      booking_id: row.booking_id,
      booking_number: row.booking_number,
      client_id: row.client_id,
      client_name: row.client_name,
      booking_status: row.booking_status,
      target_date: row.target_date,
      completed_at: row.completed_at,
      notes: row.notes,
      share_token_hash: row.share_token_hash,
      share_expires_at: row.share_expires_at,
      share_revoked_at: row.share_revoked_at,
      behind_schedule: Boolean(row.behind_schedule),
      is_share_active: Boolean(row.is_share_active),
      completed_stages_count: Number(row.completed_stages_count || 0),
      total_stages_count: Number(row.total_stages_count || 9),
      progress_percentage: Number(row.progress_percentage || 0),
      has_blocked_stage: Boolean(row.has_blocked_stage),
      current_stage_code: row.current_stage_code as DeliveryStageCode,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return { data: summaries };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to list delivery pipelines' },
    };
  }
}
