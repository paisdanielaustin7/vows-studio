'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { bookingSchema, bookingCancelSchema, BookingInput, BookingCancelInput } from '@/lib/validations/bookings.schema';
import { Booking, BookingOps, BookingLineItem, StudioEvent, BookingStatus } from '@/types/bookings';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

/**
 * Lists bookings. Role-aware per RBAC §5 and D-35:
 * Staff and Crew read exclusively from `bookings_ops_v` (where money columns are absent).
 * SA, BO, MG, AC read full bookings table with contract totals.
 */
export async function listBookingsAction(filters?: {
  clientId?: string;
  status?: BookingStatus;
}): Promise<ActionResult<Array<Booking | BookingOps>>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:view');

    const supabase = await createClient();
    const isOpsRole = user.role === 'staff' || user.role === 'crew_member';

    if (isOpsRole) {
      let query = supabase.from('bookings_ops_v').select('*').is('deleted_at', null);

      if (filters?.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        return { error: { code: 'INTERNAL_ERROR', message: error.message } };
      }

      const opsBookings: BookingOps[] = (data || []).map((row) => ({
        id: row.id,
        bookingNumber: row.booking_number,
        clientId: row.client_id,
        clientName: row.client_name,
        enquiryId: row.enquiry_id,
        quotationId: row.quotation_id,
        status: row.status as BookingStatus,
        notes: row.notes,
        targetDeliveryDate: row.target_delivery_date,
        cancelledAt: row.cancelled_at,
        cancellationReason: row.cancellation_reason,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        deletedAt: row.deleted_at,
        eventCount: row.event_count || 0,
      }));

      return { data: opsBookings };
    }

    // SA, BO, MG, AC have financial booking visibility
    let query = supabase
      .from('bookings')
      .select('*, clients(full_name)')
      .is('deleted_at', null);

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const fullBookings: Booking[] = (data || []).map((row) => ({
      id: row.id,
      bookingNumber: row.booking_number,
      clientId: row.client_id,
      clientName: (row as any).clients?.full_name || null,
      enquiryId: row.enquiry_id,
      quotationId: row.quotation_id,
      status: row.status as BookingStatus,
      contractTotalPaise: row.contract_total_paise,
      notes: row.notes,
      targetDeliveryDate: row.target_delivery_date,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      cancellationFeePaise: row.cancellation_fee_paise,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }));

    return { data: fullBookings };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list bookings',
      },
    };
  }
}

/**
 * Retrieves booking detail with lines, events, crew assignments, and delivery stages.
 * For Staff and Crew, all money figures are stripped to preserve D-35 / RBAC §5 invariants.
 */
export async function getBookingAction(id: string): Promise<
  ActionResult<{
    booking: Booking | BookingOps;
    lines: BookingLineItem[];
    events: StudioEvent[];
    deliveryStages: Array<{
      id: string;
      stageCode: string;
      sort: number;
      status: string;
      startedAt: string | null;
      completedAt: string | null;
      blockedReason: string | null;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:view');

    const supabase = await createClient();
    const isOpsRole = user.role === 'staff' || user.role === 'crew_member';

    // 1. Fetch booking
    const { data: bRow, error: bErr } = await supabase
      .from('bookings')
      .select('*, clients(full_name)')
      .eq('id', id)
      .single();

    if (bErr || !bRow) {
      return { error: { code: 'NOT_FOUND', message: 'Booking not found' } };
    }

    // 2. Fetch booking lines
    const { data: lRows } = await supabase
      .from('booking_line_items')
      .select('*')
      .eq('booking_id', id)
      .order('sort', { ascending: true });

    const lines: BookingLineItem[] = (lRows || []).map((l) => ({
      id: l.id,
      bookingId: l.booking_id,
      sort: l.sort,
      description: l.description,
      quantity: l.quantity,
      unitPricePaise: isOpsRole ? 0 : l.unit_price_paise,
      lineTotalPaise: isOpsRole ? 0 : l.line_total_paise,
    }));

    // 3. Fetch events with assignments
    const { data: eRows } = await supabase
      .from('events')
      .select('*')
      .eq('booking_id', id)
      .is('deleted_at', null)
      .order('event_date', { ascending: true });

    const eventIds = (eRows || []).map((e) => e.id);
    let assignmentsRows: any[] = [];
    if (eventIds.length > 0) {
      const { data: aData } = await supabase
        .from('event_crew_assignments')
        .select('*, crew_members(full_name, phone)')
        .in('event_id', eventIds);
      assignmentsRows = aData || [];
    }

    const events: StudioEvent[] = (eRows || []).map((e) => {
      const eventAssignments = assignmentsRows.filter((a) => a.event_id === e.id);
      return {
        id: e.id,
        bookingId: e.booking_id,
        eventType: e.event_type as any,
        name: e.name,
        eventDate: e.event_date,
        startTime: e.start_time,
        endTime: e.end_time,
        venueName: e.venue_name,
        venueAddress: e.venue_address,
        requirements: e.requirements,
        equipmentNotes: e.equipment_notes,
        sort: e.sort,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        deletedAt: e.deleted_at,
        assignments: eventAssignments.map((a: any) => ({
          id: a.id,
          eventId: a.event_id,
          crewMemberId: a.crew_member_id,
          crewMemberName: a.crew_members?.full_name,
          crewMemberPhone: a.crew_members?.phone,
          role: a.role,
          rateOverridePaise: isOpsRole ? null : a.rate_override_paise,
          confirmedAt: a.confirmed_at,
          notes: a.notes,
          overrideReason: a.override_reason,
          overrideBy: a.override_by,
          createdAt: a.created_at,
        })),
      };
    });

    // 4. Fetch delivery stages
    const { data: pipe } = await supabase
      .from('delivery_pipelines')
      .select('id, delivery_stages(*)')
      .eq('booking_id', id)
      .maybeSingle();

    const deliveryStages = ((pipe as any)?.delivery_stages || []).map((s: any) => ({
      id: s.id,
      stageCode: s.stage_code,
      sort: s.sort,
      status: s.status,
      startedAt: s.started_at,
      completedAt: s.completed_at,
      blockedReason: s.blocked_reason,
    }));

    // 5. Build booking response
    const booking: Booking | BookingOps = isOpsRole
      ? {
          id: bRow.id,
          bookingNumber: bRow.booking_number,
          clientId: bRow.client_id,
          clientName: (bRow as any).clients?.full_name || 'Client',
          enquiryId: bRow.enquiry_id,
          quotationId: bRow.quotation_id,
          status: bRow.status as BookingStatus,
          notes: bRow.notes,
          targetDeliveryDate: bRow.target_delivery_date,
          cancelledAt: bRow.cancelled_at,
          cancellationReason: bRow.cancellation_reason,
          createdBy: bRow.created_by,
          createdAt: bRow.created_at,
          updatedAt: bRow.updated_at,
          deletedAt: bRow.deleted_at,
          eventCount: events.length,
        }
      : {
          id: bRow.id,
          bookingNumber: bRow.booking_number,
          clientId: bRow.client_id,
          clientName: (bRow as any).clients?.full_name || 'Client',
          enquiryId: bRow.enquiry_id,
          quotationId: bRow.quotation_id,
          status: bRow.status as BookingStatus,
          contractTotalPaise: bRow.contract_total_paise,
          notes: bRow.notes,
          targetDeliveryDate: bRow.target_delivery_date,
          cancelledAt: bRow.cancelled_at,
          cancellationReason: bRow.cancellation_reason,
          cancellationFeePaise: bRow.cancellation_fee_paise,
          createdBy: bRow.created_by,
          createdAt: bRow.created_at,
          updatedAt: bRow.updated_at,
          deletedAt: bRow.deleted_at,
          eventCount: events.length,
        };

    return {
      data: {
        booking,
        lines,
        events,
        deliveryStages,
      },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get booking',
      },
    };
  }
}

/**
 * Creates a standalone booking with line items and delivery pipeline.
 */
export async function createBookingAction(rawInput: BookingInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:create');

    const parsed = bookingSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    // Generate atomic booking number
    const { data: bookingNum, error: seqErr } = await supabase.rpc('next_document_number', {
      p_doc_type: 'BK',
    });
    if (seqErr || !bookingNum) {
      return { error: { code: 'INTERNAL_ERROR', message: seqErr?.message || 'Failed to generate booking number' } };
    }

    // Insert booking
    const { data: b, error: bErr } = await supabase
      .from('bookings')
      .insert({
        booking_number: bookingNum,
        client_id: input.clientId,
        enquiry_id: input.enquiryId || null,
        quotation_id: input.quotationId || null,
        status: 'confirmed',
        contract_total_paise: input.contractTotalPaise,
        notes: input.notes || null,
        target_delivery_date: input.targetDeliveryDate || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (bErr || !b) {
      return { error: { code: 'INTERNAL_ERROR', message: bErr?.message || 'Failed to create booking' } };
    }

    // Insert lines
    if (input.lines && input.lines.length > 0) {
      const lineRows = input.lines.map((l, idx) => ({
        booking_id: b.id,
        sort: idx + 1,
        description: l.description,
        quantity: l.quantity,
        unit_price_paise: l.unitPricePaise,
        line_total_paise: l.lineTotalPaise,
      }));
      await supabase.from('booking_line_items').insert(lineRows);
    }

    // Initialize 9 delivery stages
    const { data: pipe } = await supabase
      .from('delivery_pipelines')
      .insert({ booking_id: b.id, target_date: input.targetDeliveryDate || null })
      .select('id')
      .single();

    if (pipe) {
      const stageCodes = [
        'raw_ingest',
        'culling',
        'audio_sync',
        'first_cut',
        'colour_grading',
        'sound_design',
        'client_review',
        'final_exports',
        'archival',
      ];
      const stagesToInsert = stageCodes.map((code, idx) => ({
        pipeline_id: pipe.id,
        stage_code: code,
        sort: idx + 1,
        status: 'pending',
      }));
      await supabase.from('delivery_stages').insert(stagesToInsert);
    }

    // Activity
    await supabase.from('activities').insert({
      client_id: input.clientId,
      entity_type: 'booking',
      entity_id: b.id,
      action: 'booking_created',
      actor_id: user.id,
      metadata: { booking_number: bookingNum, total_paise: input.contractTotalPaise },
    });

    revalidatePath('/crm/bookings');
    return { data: b.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create booking',
      },
    };
  }
}

/**
 * Converts an enquiry to a confirmed booking atomically via `public.convert_enquiry_to_booking`.
 */
export async function convertEnquiryToBookingAction(
  enquiryId: string,
  targetDeliveryDate?: string
): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:create');

    const supabase = await createClient();
    const { data: bookingId, error } = await supabase.rpc('convert_enquiry_to_booking', {
      p_enquiry_id: enquiryId,
      p_target_delivery_date: targetDeliveryDate || undefined,
    });

    if (error || !bookingId) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to convert enquiry to booking' } };
    }

    revalidatePath('/crm/bookings');
    revalidatePath('/crm/enquiries');
    return { data: bookingId };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to convert enquiry',
      },
    };
  }
}

/**
 * Creates a confirmed booking from an accepted quotation atomically via `public.create_booking_from_quotation`.
 */
export async function createBookingFromQuotationAction(
  quotationId: string,
  targetDeliveryDate?: string
): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:create');

    const supabase = await createClient();
    const { data: bookingId, error } = await supabase.rpc('create_booking_from_quotation', {
      p_quotation_id: quotationId,
      p_target_delivery_date: targetDeliveryDate || undefined,
    });

    if (error || !bookingId) {
      return {
        error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create booking from quotation' },
      };
    }

    revalidatePath('/crm/bookings');
    revalidatePath(`/crm/quotations/${quotationId}`);
    return { data: bookingId };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create booking from quotation',
      },
    };
  }
}

/**
 * Cancels a booking. Reason required, fee optional. Invoices are left untouched per D-35.
 */
export async function cancelBookingAction(rawInput: BookingCancelInput): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:update');

    const parsed = bookingCancelSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const { bookingId, reason, feePaise } = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: bookingId,
      p_reason: reason,
      p_fee_paise: feePaise || 0,
    });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    // Activity
    const { data: b } = await supabase.from('bookings').select('client_id, booking_number').eq('id', bookingId).single();
    if (b) {
      await supabase.from('activities').insert({
        client_id: b.client_id,
        entity_type: 'booking',
        entity_id: bookingId,
        action: 'booking_cancelled',
        actor_id: user.id,
        metadata: { booking_number: b.booking_number, reason, fee_paise: feePaise },
      });
    }

    revalidatePath(`/crm/bookings/${bookingId}`);
    revalidatePath('/crm/bookings');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to cancel booking',
      },
    };
  }
}

/**
 * Updates booking status (confirmed -> in_progress -> completed).
 */
export async function updateBookingStatusAction(
  id: string,
  newStatus: BookingStatus
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'bookings:update');

    if (newStatus === 'cancelled') {
      return {
        error: { code: 'VALIDATION_ERROR', message: 'Use cancelBookingAction with mandatory reason to cancel' },
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath(`/crm/bookings/${id}`);
    revalidatePath('/crm/bookings');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update booking status',
      },
    };
  }
}
