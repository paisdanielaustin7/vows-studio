'use server';

import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { quotationSchema, QuotationInput } from '@/lib/validations/sales.schema';
import { Quotation, QuotationItem, QuotationStatus } from '@/types/sales';
import { ActionResult } from '@/types/auth';
import { recalculateQuotation } from '@/lib/money/quotation-calculator';
import { revalidatePath } from 'next/cache';



/**
 * Lists quotations from quotations_v view with derived expiry status.
 * SA, BO, MG, AC only. Staff and Crew are denied.
 */
export async function listQuotationsAction(filters?: {
  clientId?: string;
  status?: QuotationStatus | 'expired';
}): Promise<ActionResult<Quotation[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:view');

    const supabase = await createClient();
    let query = supabase
      .from('quotations_v')
      .select('*, clients(full_name)')
      .is('deleted_at', null);

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.status) {
      if (filters.status === 'expired') {
        query = query.eq('derived_status', 'expired');
      } else {
        query = query.eq('status', filters.status);
      }
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const quotations: Quotation[] = (data || []).map((row: any) => ({
      id: row.id,
      rootId: row.root_id,
      versionNo: row.version_no,
      isCurrent: row.is_current,
      quotationNumber: row.quotation_number,
      clientId: row.client_id,
      clientName: row.clients?.full_name || 'Client',
      enquiryId: row.enquiry_id,
      status: row.status as QuotationStatus,
      derivedStatus: (row.derived_status || row.status) as QuotationStatus | 'expired',
      eventDate: row.event_date,
      validUntil: row.valid_until,
      subtotalPaise: row.subtotal_paise,
      discountType: row.discount_type,
      discountBps: row.discount_bps,
      discountFixedPaise: row.discount_fixed_paise,
      discountPaise: row.discount_paise,
      taxablePaise: row.taxable_paise,
      cgstPaise: row.cgst_paise,
      sgstPaise: row.sgst_paise,
      igstPaise: row.igst_paise,
      taxPaise: row.tax_paise,
      totalPaise: row.total_paise,
      gstApplied: row.gst_applied,
      taxType: row.tax_type,
      businessGstin: row.business_gstin,
      clientGstin: row.client_gstin,
      placeOfSupplyStateCode: row.place_of_supply_state_code,
      notesToClient: row.notes_to_client,
      internalNotes: row.internal_notes,
      terms: row.terms,
      pdfPath: row.pdf_path,
      pdfGeneratedAt: row.pdf_generated_at,
      sentAt: row.sent_at,
      acceptedAt: row.accepted_at,
      rejectedAt: row.rejected_at,
      items: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: quotations };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list quotations',
      },
    };
  }
}

/**
 * Retrieves a single quotation with its line items, client info, and version siblings.
 */
export async function getQuotationAction(id: string): Promise<
  ActionResult<{
    quotation: Quotation;
    items: QuotationItem[];
    versions: Array<{
      id: string;
      versionNo: number;
      isCurrent: boolean;
      status: QuotationStatus;
      totalPaise: number;
      createdAt: string;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:view');

    const supabase = await createClient();

    // Fetch quotation from quotations_v
    const { data: qRow, error: qErr } = await supabase
      .from('quotations_v')
      .select('*, clients(full_name)')
      .eq('id', id)
      .single();

    if (qErr || !qRow) {
      return { error: { code: 'NOT_FOUND', message: 'Quotation not found' } };
    }

    // Fetch line items
    const { data: items, error: iErr } = await supabase
      .from('quotation_items')
      .select('*')
      .eq('quotation_id', id)
      .order('sort', { ascending: true });

    if (iErr) {
      return { error: { code: 'INTERNAL_ERROR', message: iErr.message } };
    }

    // Fetch version siblings
    const { data: siblingRows } = await supabase
      .from('quotations')
      .select('id, version_no, is_current, status, total_paise, created_at')
      .eq('root_id', qRow.root_id)
      .order('version_no', { ascending: false });

    const quotation: Quotation = {
      id: qRow.id,
      rootId: qRow.root_id,
      versionNo: qRow.version_no,
      isCurrent: qRow.is_current,
      quotationNumber: qRow.quotation_number,
      clientId: qRow.client_id,
      clientName: (qRow as any).clients?.full_name || 'Client',
      enquiryId: qRow.enquiry_id,
      status: qRow.status as QuotationStatus,
      derivedStatus: (qRow.derived_status || qRow.status) as QuotationStatus | 'expired',
      eventDate: qRow.event_date,
      validUntil: qRow.valid_until,
      subtotalPaise: qRow.subtotal_paise,
      discountType: qRow.discount_type as any,
      discountBps: qRow.discount_bps,
      discountFixedPaise: qRow.discount_fixed_paise,
      discountPaise: qRow.discount_paise,
      taxablePaise: qRow.taxable_paise,
      cgstPaise: qRow.cgst_paise,
      sgstPaise: qRow.sgst_paise,
      igstPaise: qRow.igst_paise,
      taxPaise: qRow.tax_paise,
      totalPaise: qRow.total_paise,
      gstApplied: qRow.gst_applied,
      taxType: (qRow.tax_type || 'none') as any,
      businessGstin: qRow.business_gstin,
      clientGstin: qRow.client_gstin,
      placeOfSupplyStateCode: qRow.place_of_supply_state_code,
      notesToClient: qRow.notes_to_client,
      internalNotes: qRow.internal_notes,
      terms: qRow.terms,
      pdfPath: qRow.pdf_path,
      pdfGeneratedAt: qRow.pdf_generated_at,
      sentAt: qRow.sent_at,
      acceptedAt: qRow.accepted_at,
      rejectedAt: qRow.rejected_at,
      items: [],
      createdAt: qRow.created_at,
      updatedAt: qRow.updated_at,
    };

    const quotationItems: QuotationItem[] = (items || []).map((i) => ({
      id: i.id,
      quotationId: i.quotation_id,
      sort: i.sort,
      serviceId: i.service_id,
      packageId: i.package_id,
      description: i.description,
      quantity: i.quantity,
      unitPricePaise: i.unit_price_paise,
      lineTotalPaise: i.line_total_paise,
      hsnSacCode: i.hsn_sac_code,
      cgstBps: i.cgst_bps,
      sgstBps: i.sgst_bps,
      igstBps: i.igst_bps,
      lineDiscountPaise: i.line_discount_paise,
      lineTaxablePaise: i.line_taxable_paise,
      cgstPaise: i.cgst_paise,
      sgstPaise: i.sgst_paise,
      igstPaise: i.igst_paise,
    }));

    const versions = (siblingRows || []).map((s) => ({
      id: s.id,
      versionNo: s.version_no,
      isCurrent: s.is_current,
      status: s.status as QuotationStatus,
      totalPaise: s.total_paise,
      createdAt: s.created_at,
    }));

    return {
      data: { quotation, items: quotationItems, versions },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get quotation',
      },
    };
  }
}

/**
 * Creates a quotation atomically via Postgres function `public.create_quotation`.
 * Recomputes and verifies all sums against lib/money before writing.
 */
export async function createQuotationAction(rawInput: QuotationInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:create');

    const parsed = quotationSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    // Recalculate sums strictly on server
    const recalculated = recalculateQuotation(input);

    // Verify client did not submit corrupted totals
    if (
      input.subtotalPaise !== recalculated.subtotalPaise ||
      input.taxablePaise !== recalculated.taxablePaise ||
      input.totalPaise !== recalculated.totalPaise
    ) {
      return {
        error: {
          code: 'VALIDATION_ERROR',
          message: `Quotation total mismatch: server calculated total ${recalculated.totalPaise} paise, but received ${input.totalPaise} paise.`,
        },
      };
    }

    const payload = {
      ...input,
      ...recalculated,
    };

    const supabase = await createClient();
    const { data: newQid, error: rpcErr } = await supabase.rpc('create_quotation', {
      payload: payload as any,
    });

    if (rpcErr || !newQid) {
      return {
        error: { code: 'INTERNAL_ERROR', message: rpcErr?.message || 'Failed to create quotation' },
      };
    }

    // Record activity on the client
    await supabase.from('activities').insert({
      client_id: input.clientId,
      entity_type: 'quotation',
      entity_id: newQid,
      action: 'quotation_created',
      actor_id: user.id,
      metadata: { total_paise: recalculated.totalPaise },
    });

    revalidatePath('/crm/quotations');
    revalidatePath('/crm/dashboard');
    revalidatePath(`/crm/clients/${input.clientId}`);
    revalidatePath('/crm/clients');
    revalidatePath('/crm/enquiries');
    return { data: newQid };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create quotation',
      },
    };
  }
}

/**
 * Creates a new version of an existing quotation via `public.create_quotation_version`.
 */
export async function createQuotationVersionAction(
  quotationId: string,
  rawInput?: QuotationInput
): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:update');

    let inputToUse = rawInput;
    let rootId = quotationId;

    if (!inputToUse) {
      const existingRes = await getQuotationAction(quotationId);
      if (existingRes.error || !existingRes.data) {
        return { error: existingRes.error || { code: 'NOT_FOUND', message: 'Original quotation not found' } };
      }
      const existing = existingRes.data.quotation;
      const existingItems = existingRes.data.items;
      rootId = existing.rootId;

      inputToUse = {
        clientId: existing.clientId,
        enquiryId: existing.enquiryId || undefined,
        eventDate: existing.eventDate || undefined,
        validUntil: existing.validUntil,
        subtotalPaise: existing.subtotalPaise,
        discountType: existing.discountType || undefined,
        discountBps: existing.discountBps || undefined,
        discountFixedPaise: existing.discountFixedPaise || undefined,
        discountPaise: existing.discountPaise,
        taxablePaise: existing.taxablePaise,
        cgstPaise: existing.cgstPaise,
        sgstPaise: existing.sgstPaise,
        igstPaise: existing.igstPaise,
        taxPaise: existing.taxPaise,
        totalPaise: existing.totalPaise,
        gstApplied: existing.gstApplied,
        taxType: existing.taxType,
        businessGstin: existing.businessGstin || null,
        clientGstin: existing.clientGstin || null,
        placeOfSupplyStateCode: existing.placeOfSupplyStateCode || null,
        notesToClient: existing.notesToClient || null,
        internalNotes: existing.internalNotes || null,
        terms: existing.terms || null,
        items: existingItems.map((it) => ({
          serviceId: it.serviceId || null,
          packageId: it.packageId || null,
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unitPricePaise,
          lineTotalPaise: it.lineTotalPaise,
          hsnSacCode: it.hsnSacCode || null,
          cgstBps: it.cgstBps || 900,
          sgstBps: it.sgstBps || 900,
          igstBps: it.igstBps || 1800,
          lineDiscountPaise: it.lineDiscountPaise || 0,
          lineTaxablePaise: it.lineTaxablePaise || it.lineTotalPaise,
          cgstPaise: it.cgstPaise || 0,
          sgstPaise: it.sgstPaise || 0,
          igstPaise: it.igstPaise || 0,
        })),
      };
    }

    const parsed = quotationSchema.safeParse(inputToUse);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;
    const recalculated = recalculateQuotation(input);

    const payload = {
      ...input,
      ...recalculated,
    };

    const supabase = await createClient();
    const { data: newQid, error: rpcErr } = await supabase.rpc('create_quotation_version', {
      p_root_id: rootId,
      payload: payload as any,
    });

    if (rpcErr || !newQid) {
      return {
        error: { code: 'INTERNAL_ERROR', message: rpcErr?.message || 'Failed to create new quotation version' },
      };
    }

    await supabase.from('activities').insert({
      client_id: input.clientId,
      entity_type: 'quotation',
      entity_id: newQid,
      action: 'quotation_version_created',
      actor_id: user.id,
      metadata: { total_paise: recalculated.totalPaise },
    });

    revalidatePath(`/crm/quotations/${newQid}`);
    revalidatePath('/crm/quotations');
    revalidatePath('/crm/dashboard');
    revalidatePath(`/crm/clients/${input.clientId}`);
    revalidatePath('/crm/clients');
    revalidatePath('/crm/enquiries');
    return { data: newQid };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create quotation version',
      },
    };
  }
}

/**
 * Transitions quotation status (mark sent, accept, reject).
 */
export async function updateQuotationStatusAction(
  id: string,
  newStatus: 'sent' | 'accepted' | 'rejected',
  rejectionReason?: string
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:update');

    const supabase = await createClient();

    const now = new Date().toISOString();
    const updatePayload: {
      status: 'sent' | 'accepted' | 'rejected';
      sent_at?: string;
      accepted_at?: string;
      rejected_at?: string;
    } = {
      status: newStatus,
      ...(newStatus === 'sent' ? { sent_at: now } : {}),
      ...(newStatus === 'accepted' ? { accepted_at: now } : {}),
      ...(newStatus === 'rejected' ? { rejected_at: now } : {}),
    };

    const { data: q, error } = await supabase
      .from('quotations')
      .update(updatePayload)
      .eq('id', id)
      .select('client_id, quotation_number')
      .single();

    if (error || !q) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to update quotation' } };
    }

    // Activity
    await supabase.from('activities').insert({
      client_id: q.client_id,
      entity_type: 'quotation',
      entity_id: id,
      action: `quotation_${newStatus}`,
      actor_id: user.id,
      metadata: { quotation_number: q.quotation_number, ...(rejectionReason ? { rejection_reason: rejectionReason } : {}) },
    });

    revalidatePath(`/crm/quotations/${id}`);
    revalidatePath('/crm/quotations');
    revalidatePath('/crm/dashboard');
    revalidatePath(`/crm/clients/${q.client_id}`);
    revalidatePath('/crm/clients');
    revalidatePath('/crm/bookings');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update quotation status',
      },
    };
  }
}

/**
 * Soft deletes a draft quotation. Sent or accepted quotations cannot be deleted.
 */
export async function deleteDraftQuotationAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'quotations:delete');

    const supabase = await createClient();

    // Check status
    const { data: q } = await supabase
      .from('quotations')
      .select('status, quotation_number')
      .eq('id', id)
      .single();

    if (!q) {
      return { error: { code: 'NOT_FOUND', message: 'Quotation not found' } };
    }

    if (q.status !== 'draft') {
      return {
        error: { code: 'FORBIDDEN', message: `Quotation ${q.quotation_number} is in ${q.status} status and cannot be deleted.` },
      };
    }

    const { error } = await supabase
      .from('quotations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/quotations');
    revalidatePath('/crm/dashboard');
    revalidatePath('/crm/clients');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to delete quotation',
      },
    };
  }
}
