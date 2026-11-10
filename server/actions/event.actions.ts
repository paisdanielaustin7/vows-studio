'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { studioEventSchema, StudioEventInput } from '@/lib/validations/bookings.schema';
import { StudioEvent } from '@/types/bookings';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

/**
 * Lists events for a booking or across a date range.
 */
export async function listEventsAction(params?: {
  bookingId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ActionResult<StudioEvent[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'events:view');

    const supabase = await createClient();
    let query = supabase
      .from('events')
      .select('*, bookings(booking_number, clients(full_name))')
      .is('deleted_at', null);

    if (params?.bookingId) {
      query = query.eq('booking_id', params.bookingId);
    }
    if (params?.fromDate) {
      query = query.gte('event_date', params.fromDate);
    }
    if (params?.toDate) {
      query = query.lte('event_date', params.toDate);
    }

    const { data: rows, error } = await query.order('event_date', { ascending: true });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const eventIds = (rows || []).map((r) => r.id);
    let assignmentsRows: any[] = [];
    if (eventIds.length > 0) {
      const { data: aData } = await supabase
        .from('event_crew_assignments')
        .select('*, crew_members(full_name, phone)')
        .in('event_id', eventIds);
      assignmentsRows = aData || [];
    }

    const events: StudioEvent[] = (rows || []).map((r) => {
      const eventAssignments = assignmentsRows.filter((a) => a.event_id === r.id);
      return {
        id: r.id,
        bookingId: r.booking_id,
        bookingNumber: (r as any).bookings?.booking_number,
        clientName: (r as any).bookings?.clients?.full_name,
        eventType: r.event_type as any,
        name: r.name,
        eventDate: r.event_date,
        startTime: r.start_time,
        endTime: r.end_time,
        venueName: r.venue_name,
        venueAddress: r.venue_address,
        requirements: r.requirements,
        equipmentNotes: r.equipment_notes,
        sort: r.sort,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        deletedAt: r.deleted_at,
        assignments: eventAssignments.map((a: any) => ({
          id: a.id,
          eventId: a.event_id,
          crewMemberId: a.crew_member_id,
          crewMemberName: a.crew_members?.full_name,
          crewMemberPhone: a.crew_members?.phone,
          role: a.role,
          rateOverridePaise: a.rate_override_paise,
          confirmedAt: a.confirmed_at,
          notes: a.notes,
          overrideReason: a.override_reason,
          overrideBy: a.override_by,
          createdAt: a.created_at,
        })),
      };
    });

    return { data: events };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list events',
      },
    };
  }
}

/**
 * Creates an event under a confirmed booking.
 */
export async function createEventAction(rawInput: StudioEventInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'events:manage');

    const parsed = studioEventSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { data: event, error } = await supabase
      .from('events')
      .insert({
        booking_id: input.bookingId,
        event_type: input.eventType,
        name: input.name,
        event_date: input.eventDate,
        start_time: input.startTime || null,
        end_time: input.endTime || null,
        venue_name: input.venueName,
        venue_address: input.venueAddress || null,
        requirements: input.requirements || null,
        equipment_notes: input.equipmentNotes || null,
        sort: input.sort || 0,
      })
      .select('id, booking_id')
      .single();

    if (error || !event) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create event' } };
    }

    revalidatePath(`/crm/bookings/${event.booking_id}`);
    revalidatePath('/crm/schedule');
    return { data: event.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create event',
      },
    };
  }
}

/**
 * Updates an event.
 */
export async function updateEventAction(
  id: string,
  rawInput: Partial<StudioEventInput>
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'events:manage');

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !existing) {
      return { error: { code: 'NOT_FOUND', message: 'Event not found' } };
    }

    const merged = {
      ...existing,
      ...rawInput,
      bookingId: existing.booking_id,
      eventType: rawInput.eventType || existing.event_type,
      name: rawInput.name || existing.name,
      eventDate: rawInput.eventDate || existing.event_date,
      venueName: rawInput.venueName || existing.venue_name,
    };

    const parsed = studioEventSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const { error: updateErr } = await supabase
      .from('events')
      .update({
        event_type: input.eventType,
        name: input.name,
        event_date: input.eventDate,
        start_time: input.startTime || null,
        end_time: input.endTime || null,
        venue_name: input.venueName,
        venue_address: input.venueAddress || null,
        requirements: input.requirements || null,
        equipment_notes: input.equipmentNotes || null,
        sort: input.sort || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateErr) {
      return { error: { code: 'INTERNAL_ERROR', message: updateErr.message } };
    }

    revalidatePath(`/crm/bookings/${existing.booking_id}`);
    revalidatePath('/crm/schedule');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update event',
      },
    };
  }
}

/**
 * Soft deletes an event.
 */
export async function deleteEventAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'events:manage');

    const supabase = await createClient();

    const { data: existing } = await supabase
      .from('events')
      .select('booking_id')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('events')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    if (existing) {
      revalidatePath(`/crm/bookings/${existing.booking_id}`);
    }
    revalidatePath('/crm/schedule');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to delete event',
      },
    };
  }
}
