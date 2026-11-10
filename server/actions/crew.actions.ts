'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import {
  crewMemberSchema,
  assignCrewSchema,
  crewUnavailabilitySchema,
  CrewMemberInput,
  AssignCrewInput,
  CrewUnavailabilityInput,
} from '@/lib/validations/bookings.schema';
import {
  CrewMember,
  CrewRole,
  EventAssignmentRole,
  SchedulingConflict,
  CrewUnavailability,
  CrewEvent,
} from '@/types/bookings';
import { ActionResult } from '@/types/auth';
import { encryptString, decryptString } from '@/lib/crypto';
import { revalidatePath } from 'next/cache';

/**
 * Lists crew members. Role-aware:
 * If caller is Staff or Crew, rate information is suppressed (RBAC §5).
 */
export async function listCrewMembersAction(filters?: {
  role?: CrewRole;
  isActive?: boolean;
}): Promise<ActionResult<CrewMember[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:view');

    const supabase = await createClient();
    const isOpsRole = user.role === 'staff' || user.role === 'crew_member';

    let query = supabase.from('crew_members').select('*');

    if (filters?.role) {
      query = query.eq('role', filters.role);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    const { data: rows, error } = await query.order('full_name', { ascending: true });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const members: CrewMember[] = (rows || []).map((r) => ({
      id: r.id,
      profileId: r.profile_id,
      fullName: r.full_name,
      role: r.role as CrewRole,
      crewType: r.crew_type as any,
      phone: r.phone,
      email: r.email,
      ratePaise: isOpsRole ? null : r.rate_paise,
      rateUnit: isOpsRole ? null : (r.rate_unit as any),
      portfolioUrl: r.portfolio_url,
      notes: r.notes,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { data: members };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list crew members',
      },
    };
  }
}

/**
 * Retrieves a single crew member. Decrypts bank details server-side only for SA/BO.
 */
export async function getCrewMemberAction(id: string): Promise<ActionResult<CrewMember>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:view');

    const supabase = await createClient();
    const isOwnerOrAdmin = user.role === 'system_admin' || user.role === 'business_owner';
    const isOpsRole = user.role === 'staff' || user.role === 'crew_member';

    const { data: r, error } = await supabase
      .from('crew_members')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !r) {
      return { error: { code: 'NOT_FOUND', message: 'Crew member not found' } };
    }

    let bankDetails = null;
    if (isOwnerOrAdmin && r.bank_details_enc) {
      try {
        const decryptedJson = decryptString(r.bank_details_enc);
        bankDetails = JSON.parse(decryptedJson);
      } catch {
        // Fallback gracefully if decryption or parse fails
        bankDetails = null;
      }
    }

    const member: CrewMember = {
      id: r.id,
      profileId: r.profile_id,
      fullName: r.full_name,
      role: r.role as CrewRole,
      crewType: r.crew_type as any,
      phone: r.phone,
      email: r.email,
      ratePaise: isOpsRole ? null : r.rate_paise,
      rateUnit: isOpsRole ? null : (r.rate_unit as any),
      bankDetails,
      portfolioUrl: r.portfolio_url,
      notes: r.notes,
      isActive: r.is_active,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };

    return { data: member };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get crew member',
      },
    };
  }
}

/**
 * Creates a crew member. Encrypts sensitive bank details using AES-256-GCM.
 */
export async function createCrewMemberAction(rawInput: CrewMemberInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:manage');

    const parsed = crewMemberSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    let encryptedBankDetails: string | null = null;
    if (input.bankDetails && Object.values(input.bankDetails).some(Boolean)) {
      encryptedBankDetails = encryptString(JSON.stringify(input.bankDetails));
    }

    const supabase = await createClient();
    const { data: created, error } = await supabase
      .from('crew_members')
      .insert({
        profile_id: input.profileId || null,
        full_name: input.fullName,
        role: input.role,
        crew_type: input.crewType,
        phone: input.phone,
        email: input.email || null,
        rate_paise: input.ratePaise ?? null,
        rate_unit: input.rateUnit || null,
        bank_details_enc: encryptedBankDetails,
        portfolio_url: input.portfolioUrl || null,
        notes: input.notes || null,
        is_active: input.isActive ?? true,
      })
      .select('id')
      .single();

    if (error || !created) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create crew member' } };
    }

    revalidatePath('/crm/crew');
    return { data: created.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create crew member',
      },
    };
  }
}

/**
 * Updates a crew member.
 */
export async function updateCrewMemberAction(
  id: string,
  rawInput: Partial<CrewMemberInput>
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:manage');

    const supabase = await createClient();
    const { data: existing, error: fetchErr } = await supabase
      .from('crew_members')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return { error: { code: 'NOT_FOUND', message: 'Crew member not found' } };
    }

    let encryptedBankDetails = existing.bank_details_enc;
    if (rawInput.bankDetails !== undefined) {
      if (rawInput.bankDetails && Object.values(rawInput.bankDetails).some(Boolean)) {
        encryptedBankDetails = encryptString(JSON.stringify(rawInput.bankDetails));
      } else {
        encryptedBankDetails = null;
      }
    }

    const updatePayload: {
      updated_at: string;
      full_name?: string;
      role?: string;
      crew_type?: string;
      phone?: string;
      email?: string | null;
      rate_paise?: number | null;
      rate_unit?: string | null;
      portfolio_url?: string | null;
      notes?: string | null;
      is_active?: boolean;
      bank_details_enc?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (rawInput.fullName !== undefined) updatePayload.full_name = rawInput.fullName;
    if (rawInput.role !== undefined) updatePayload.role = rawInput.role;
    if (rawInput.crewType !== undefined) updatePayload.crew_type = rawInput.crewType;
    if (rawInput.phone !== undefined) updatePayload.phone = rawInput.phone;
    if (rawInput.email !== undefined) updatePayload.email = rawInput.email || null;
    if (rawInput.ratePaise !== undefined) updatePayload.rate_paise = rawInput.ratePaise;
    if (rawInput.rateUnit !== undefined) updatePayload.rate_unit = rawInput.rateUnit || null;
    if (rawInput.portfolioUrl !== undefined) updatePayload.portfolio_url = rawInput.portfolioUrl || null;
    if (rawInput.notes !== undefined) updatePayload.notes = rawInput.notes || null;
    if (rawInput.isActive !== undefined) updatePayload.is_active = rawInput.isActive;
    if (rawInput.bankDetails !== undefined) updatePayload.bank_details_enc = encryptedBankDetails;

    const { error: updateErr } = await supabase
      .from('crew_members')
      .update(updatePayload)
      .eq('id', id);

    if (updateErr) {
      return { error: { code: 'INTERNAL_ERROR', message: updateErr.message } };
    }

    revalidatePath(`/crm/crew/${id}`);
    revalidatePath('/crm/crew');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update crew member',
      },
    };
  }
}

/**
 * Checks for scheduling conflicts (unavailability and overlapping assignments) for a crew member.
 */
export async function checkCrewConflictsAction(
  crewMemberId: string,
  eventDate: string,
  startTime?: string | null,
  endTime?: string | null,
  excludeEventId?: string | null
): Promise<ActionResult<SchedulingConflict[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:view');

    const supabase = await createClient();
    const { data: conflicts, error } = await supabase.rpc('check_crew_conflicts', {
      p_crew_member_id: crewMemberId,
      p_event_date: eventDate,
      p_start_time: startTime || undefined,
      p_end_time: endTime || undefined,
      p_exclude_event_id: excludeEventId || undefined,
    });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const result: SchedulingConflict[] = ((conflicts as any) || []).map((c: any) => ({
      type: c.conflict_type as 'unavailability' | 'assignment_overlap',
      details: c.conflict_details,
    }));

    return { data: result };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to check conflicts',
      },
    };
  }
}

/**
 * Assigns crew to an event. Conflict checking is enforced on server (D-34, BK-NFR-02):
 * If conflicts exist and no override reason is provided, rejects assignment with conflict details.
 * If override reason is provided, proceeds and audits.
 */
export async function assignCrewAction(rawInput: AssignCrewInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew_assignments:manage');

    const parsed = assignCrewSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { data: assignmentId, error } = await supabase.rpc('assign_crew', {
      p_event_id: input.eventId,
      p_crew_member_id: input.crewMemberId,
      p_role: input.role,
      p_rate_override_paise: input.rateOverridePaise ?? undefined,
      p_override_reason: input.overrideReason || undefined,
    });

    if (error) {
      if (error.message.includes('CREW_CONFLICT')) {
        return {
          error: {
            code: 'CONFLICT',
            message: error.message.replace('CREW_CONFLICT: ', ''),
          },
        };
      }
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    // Activity log if overridden
    if (input.overrideReason) {
      const { data: ev } = await supabase
        .from('events')
        .select('booking_id, bookings(client_id)')
        .eq('id', input.eventId)
        .single();

      if (ev) {
        await supabase.from('activities').insert({
          client_id: (ev as any).bookings?.client_id,
          entity_type: 'event_crew_assignment',
          entity_id: assignmentId,
          action: 'crew_assignment_conflict_override',
          actor_id: user.id,
          metadata: { override_reason: input.overrideReason, role: input.role },
        });
      }
    }

    revalidatePath('/crm/schedule');
    return { data: assignmentId };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to assign crew',
      },
    };
  }
}

/**
 * Removes a crew assignment.
 */
export async function removeCrewAssignmentAction(assignmentId: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew_assignments:manage');

    const supabase = await createClient();
    const { error } = await supabase.from('event_crew_assignments').delete().eq('id', assignmentId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/schedule');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to remove crew assignment',
      },
    };
  }
}

/**
 * Lists unavailability blocks for a crew member or studio.
 */
export async function listCrewUnavailabilityAction(
  crewMemberId?: string
): Promise<ActionResult<CrewUnavailability[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:view');

    const supabase = await createClient();
    let query = supabase.from('crew_unavailability').select('*');

    if (crewMemberId) {
      query = query.eq('crew_member_id', crewMemberId);
    }

    const { data: rows, error } = await query.order('from_ts', { ascending: true });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const result: CrewUnavailability[] = (rows || []).map((r) => ({
      id: r.id,
      crewMemberId: r.crew_member_id,
      fromTs: r.from_ts,
      toTs: r.to_ts,
      reason: r.reason,
      createdBy: r.created_by,
      createdAt: r.created_at,
    }));

    return { data: result };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list unavailability',
      },
    };
  }
}

/**
 * Records an unavailability period for a crew member.
 */
export async function createCrewUnavailabilityAction(
  rawInput: CrewUnavailabilityInput
): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:manage');

    const parsed = crewUnavailabilitySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('crew_unavailability')
      .insert({
        crew_member_id: input.crewMemberId,
        from_ts: input.fromTs,
        to_ts: input.toTs,
        reason: input.reason || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to record unavailability' } };
    }

    revalidatePath('/crm/schedule');
    revalidatePath(`/crm/crew/${input.crewMemberId}`);
    return { data: data.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to record unavailability',
      },
    };
  }
}

/**
 * Deletes an unavailability record.
 */
export async function deleteCrewUnavailabilityAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'crew:manage');

    const supabase = await createClient();
    const { error } = await supabase.from('crew_unavailability').delete().eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/schedule');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to delete unavailability',
      },
    };
  }
}

/**
 * Lists schedule events for `/crm/schedule`.
 * If caller is a crew member, reads strictly via `crew_event_v` for assigned events
 * with client contact details completely omitted to protect against poaching (D-34).
 */
export async function listScheduleEventsAction(filters?: {
  fromDate?: string;
  toDate?: string;
  crewMemberId?: string;
  eventType?: string;
}): Promise<ActionResult<CrewEvent[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'events:view');

    const fromDate = filters?.fromDate || '2020-01-01';
    const toDate = filters?.toDate || '2035-12-31';

    const supabase = await createClient();

    if (user.role === 'crew_member') {
      let query = supabase
        .from('crew_event_v')
        .select('*')
        .eq('profile_id', user.id)
        .gte('event_date', fromDate)
        .lte('event_date', toDate);

      if (filters?.eventType) {
        query = query.eq('event_type', filters.eventType);
      }

      const { data: rows, error } = await query.order('event_date', { ascending: true });
      if (error) {
        return { error: { code: 'INTERNAL_ERROR', message: error.message } };
      }

      const events: CrewEvent[] = (rows || []).map((r) => ({
        assignmentId: r.assignment_id,
        crewMemberId: r.crew_member_id,
        profileId: r.profile_id,
        eventId: r.event_id,
        bookingId: r.booking_id,
        bookingNumber: r.booking_number,
        clientName: r.client_name,
        eventName: r.event_name,
        eventType: r.event_type as any,
        eventDate: r.event_date,
        startTime: r.start_time,
        endTime: r.end_time,
        venueName: r.venue_name,
        venueAddress: r.venue_address,
        requirements: r.requirements,
        equipmentNotes: r.equipment_notes,
        assignedRole: r.assigned_role as EventAssignmentRole,
        confirmedAt: r.confirmed_at,
        assignmentNotes: r.assignment_notes,
      }));

      return { data: events };
    }

    // SA, BO, MG, ST, AC: full schedule query from events
    let query = supabase
      .from('events')
      .select('*, bookings(booking_number, clients(full_name))')
      .is('deleted_at', null)
      .gte('event_date', fromDate)
      .lte('event_date', toDate);

    if (filters?.eventType) {
      query = query.eq('event_type', filters.eventType);
    }

    const { data: rows, error } = await query.order('event_date', { ascending: true });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const eventIds = (rows || []).map((r) => r.id);
    let assignmentsRows: any[] = [];
    if (eventIds.length > 0) {
      let aQuery = supabase
        .from('event_crew_assignments')
        .select('*, crew_members(full_name, phone)')
        .in('event_id', eventIds);

      if (filters?.crewMemberId) {
        aQuery = aQuery.eq('crew_member_id', filters.crewMemberId);
      }
      const { data: aData } = await aQuery;
      assignmentsRows = aData || [];
    }

    const results: CrewEvent[] = [];
    for (const r of rows || []) {
      const matchedAssignments = assignmentsRows.filter((a) => a.event_id === r.id);
      if (filters?.crewMemberId && matchedAssignments.length === 0) {
        continue;
      }

      if (matchedAssignments.length === 0) {
        // Event without crew yet
        results.push({
          assignmentId: '',
          crewMemberId: '',
          eventId: r.id,
          bookingId: r.booking_id,
          bookingNumber: (r as any).bookings?.booking_number || 'BK',
          clientName: (r as any).bookings?.clients?.full_name || 'Client',
          eventName: r.name,
          eventType: r.event_type as any,
          eventDate: r.event_date,
          startTime: r.start_time,
          endTime: r.end_time,
          venueName: r.venue_name,
          venueAddress: r.venue_address,
          requirements: r.requirements,
          equipmentNotes: r.equipment_notes,
          assignedRole: 'lead_photographer',
          confirmedAt: null,
          assignmentNotes: null,
        });
      } else {
        for (const a of matchedAssignments) {
          results.push({
            assignmentId: a.id,
            crewMemberId: a.crew_member_id,
            eventId: r.id,
            bookingId: r.booking_id,
            bookingNumber: (r as any).bookings?.booking_number || 'BK',
            clientName: (r as any).bookings?.clients?.full_name || 'Client',
            eventName: r.name,
            eventType: r.event_type as any,
            eventDate: r.event_date,
            startTime: r.start_time,
            endTime: r.end_time,
            venueName: r.venue_name,
            venueAddress: r.venue_address,
            requirements: r.requirements,
            equipmentNotes: r.equipment_notes,
            assignedRole: a.role as EventAssignmentRole,
            confirmedAt: a.confirmed_at,
            assignmentNotes: a.notes,
          });
        }
      }
    }

    return { data: results };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list schedule events',
      },
    };
  }
}
