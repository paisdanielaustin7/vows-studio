'use server';

import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import {
  enquirySchema,
  EnquiryInput,
  followUpSchema,
  FollowUpInput,
} from '@/lib/validations/sales.schema';
import { Enquiry, EnquiryStatus, EventType, EnquirySource } from '@/types/sales';
import { ActionResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';

/**
 * Shared enquiry insert routine used by both CRM manual creation and public website form.
 */
export async function insertSharedEnquiry(
  input: EnquiryInput,
  createdByUserId?: string | null
): Promise<{ id: string }> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('enquiries')
    .insert({
      client_id: input.clientId || null,
      guest_name: input.guestName || null,
      guest_phone: input.guestPhone || null,
      guest_email: input.guestEmail || null,
      event_type: input.eventType,
      event_date: input.eventDate || null,
      event_date_is_approx: input.eventDateIsApprox ?? true,
      venue: input.venue || null,
      guest_count: input.guestCount || null,
      services_interested: input.servicesInterested || [],
      budget_paise: input.budgetPaise ? Number(input.budgetPaise) : null,
      source: input.source,
      status: input.status || 'new',
      assigned_to: input.assignedTo || null,
      message: input.message || null,
      notes: input.notes || null,
      consent_given_at: input.consentGivenAt || new Date().toISOString(),
      created_by: createdByUserId || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to insert enquiry');
  }

  return { id: data.id };
}

/**
 * Lists enquiries with optional status or assignee filter.
 */
export async function listEnquiriesAction(filters?: {
  status?: EnquiryStatus;
  assignedTo?: string;
}): Promise<ActionResult<Enquiry[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'enquiries:view');

    const supabase = await createClient();
    let query = supabase
      .from('enquiries')
      .select('*, clients(full_name), profiles:profiles!enquiries_assigned_to_fkey(full_name)')
      .is('deleted_at', null);

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.assignedTo) {
      query = query.eq('assigned_to', filters.assignedTo);
    }

    query = query.order('created_at', { ascending: false });

    const { data: initialData, error } = await query;
    let data: any[] | null = initialData;
    if (error) {
      // Disambiguation fallback: if profiles!enquiries_assigned_to_fkey fails, fetch without ambiguous embedding
      console.warn('[listEnquiriesAction] Main query with profile join failed, using fallback:', error.message);
      let fallback = supabase
        .from('enquiries')
        .select('*, clients(full_name)')
        .is('deleted_at', null);

      if (filters?.status) {
        fallback = fallback.eq('status', filters.status);
      }
      if (filters?.assignedTo) {
        fallback = fallback.eq('assigned_to', filters.assignedTo);
      }

      const fallbackRes = await fallback.order('created_at', { ascending: false });
      if (fallbackRes.error) {
        return { error: { code: 'INTERNAL_ERROR', message: fallbackRes.error.message } };
      }
      data = fallbackRes.data;
    }

    const enquiries: Enquiry[] = (data || []).map((row: any) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.clients?.full_name || null,
      guestName: row.guest_name,
      guestPhone: row.guest_phone,
      guestEmail: row.guest_email,
      eventType: row.event_type as EventType,
      eventDate: row.event_date,
      eventDateIsApprox: row.event_date_is_approx,
      venue: row.venue,
      guestCount: row.guest_count,
      servicesInterested: row.services_interested || [],
      budgetPaise: row.budget_paise ? Number(row.budget_paise) : null,
      source: row.source as EnquirySource,
      status: row.status as EnquiryStatus,
      assignedTo: row.assigned_to,
      assigneeName: row.profiles?.full_name || null,
      message: row.message,
      notes: row.notes,
      lostReason: row.lost_reason,
      convertedBookingId: row.converted_booking_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: enquiries };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list enquiries',
      },
    };
  }
}

/**
 * Creates an enquiry manually from the CRM. SA, BO, MG, ST.
 */
export async function createEnquiryAction(rawInput: EnquiryInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'enquiries:create');

    const parsed = enquirySchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }

    const result = await insertSharedEnquiry(parsed.data, user.id);

    // If client is linked, record activity
    if (parsed.data.clientId) {
      try {
        const supabase = await createClient();
        await supabase.from('activities').insert({
          client_id: parsed.data.clientId,
          entity_type: 'enquiry',
          entity_id: result.id,
          action: 'enquiry_created',
          actor_id: user.id,
          metadata: { event_type: parsed.data.eventType, event_date: parsed.data.eventDate },
        });
      } catch (actErr) {
        console.warn('[createEnquiryAction] Failed to record client activity:', actErr);
      }
    }

    revalidatePath('/crm/enquiries');
    revalidatePath('/crm/dashboard');
    return { data: result.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create enquiry',
      },
    };
  }
}

/**
 * Transitions enquiry status according to the business workflow state machine.
 */
export async function updateEnquiryStatusAction(
  id: string,
  newStatus: EnquiryStatus,
  lostReason?: string
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'enquiries:update');

    if (newStatus === 'lost' && (!lostReason || lostReason.trim().length === 0)) {
      return {
        error: { code: 'VALIDATION_ERROR', message: 'A reason is required when marking an enquiry as lost.' },
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from('enquiries')
      .update({
        status: newStatus,
        lost_reason: newStatus === 'lost' ? lostReason : null,
      })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath(`/crm/enquiries/${id}`);
    revalidatePath('/crm/enquiries');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update enquiry status',
      },
    };
  }
}

/**
 * Creates a scheduled follow-up for an enquiry.
 */
export async function createFollowUpAction(rawInput: FollowUpInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'follow_ups:manage');

    const parsed = followUpSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('follow_ups')
      .insert({
        enquiry_id: input.enquiryId,
        due_at: input.dueAt,
        note: input.note || null,
        assigned_to: input.assignedTo,
        status: input.status,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create follow-up' } };
    }

    revalidatePath(`/crm/enquiries/${input.enquiryId}`);
    return { data: data.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create follow-up',
      },
    };
  }
}

/**
 * Marks a scheduled follow-up as completed.
 */
export async function completeFollowUpAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'follow_ups:manage');

    const supabase = await createClient();
    const { data: fu, error } = await supabase
      .from('follow_ups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('id', id)
      .select('enquiry_id')
      .single();

    if (error || !fu) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to complete follow-up' } };
    }

    revalidatePath(`/crm/enquiries/${fu.enquiry_id}`);
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to complete follow-up',
      },
    };
  }
}

/**
 * Links a client to an enquiry.
 */
export async function linkClientToEnquiryAction(
  enquiryId: string,
  clientId: string
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'enquiries:update');

    const supabase = await createClient();
    const { error } = await supabase
      .from('enquiries')
      .update({ client_id: clientId })
      .eq('id', enquiryId);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    // Record activity on the client
    await supabase.from('activities').insert({
      client_id: clientId,
      entity_type: 'enquiry',
      entity_id: enquiryId,
      action: 'enquiry_linked',
      actor_id: user.id,
    });

    revalidatePath(`/crm/enquiries/${enquiryId}`);
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to link client',
      },
    };
  }
}
