'use server';

import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { sanitizeCsvCell } from '@/lib/utils/csv';
import { ActionResult } from '@/types/auth';
import {
  Invoice,
  InvoiceItem,
  Payment,
  Receipt,
  CreditNote,
  CreditNoteItem,
  Expense,
  ManualIncomeEntry,
  LedgerEntry,
  ProfitAndLossReport,
  InvoiceStatus,
} from '@/types/finance';
import {
  invoiceSchema,
  InvoiceInput,
  recordPaymentSchema,
  RecordPaymentInput,
  voidPaymentSchema,
  VoidPaymentInput,
  issueCreditNoteSchema,
  IssueCreditNoteInput,
  cancelInvoiceSchema,
  CancelInvoiceInput,
  expenseSchema,
  ExpenseInput,
  manualIncomeSchema,
  ManualIncomeInput,
  recordCrewPaymentSchema,
  RecordCrewPaymentInput,
} from '@/lib/validations/finance.schema';
import { percentOf, computeGst, toPaise } from '@/lib/money';

// --------------------------------------------------------------------------
// 1. INVOICES
// --------------------------------------------------------------------------

/**
 * Lists invoices with derived overdue status, balances, and client name (via invoices_v).
 */
export async function listInvoicesAction(filters?: {
  clientId?: string;
  bookingId?: string;
  status?: string;
}): Promise<ActionResult<Invoice[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:view');

    const supabase = await createClient();
    let query = supabase.from('invoices_v').select('*');

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: rows, error } = await query.order('issue_date', { ascending: false });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const invoices: Invoice[] = (rows || []).map((r) => ({
      id: r.id,
      invoiceNumber: r.invoice_number,
      bookingId: r.booking_id,
      bookingNumber: r.booking_number,
      clientId: r.client_id,
      clientName: r.client_name,
      status: r.status as InvoiceStatus,
      displayStatus: r.display_status as any,
      issueDate: r.issue_date,
      dueDate: r.due_date,
      subtotalPaise: r.subtotal_paise,
      discountType: r.discount_type as any,
      discountValue: r.discount_value,
      discountPaise: r.discount_paise,
      taxableAmountPaise: r.taxable_amount_paise,
      cgstRateBps: r.cgst_rate_bps,
      cgstPaise: r.cgst_paise,
      sgstRateBps: r.sgst_rate_bps,
      sgstPaise: r.sgst_paise,
      igstRateBps: r.igst_rate_bps,
      igstPaise: r.igst_paise,
      totalTaxPaise: r.total_tax_paise,
      totalPaise: r.total_paise,
      paidPaise: r.paid_paise,
      creditedPaise: r.credited_paise,
      balancePaise: r.balance_paise,
      notesToClient: r.notes_to_client,
      internalNotes: r.internal_notes,
      terms: r.terms,
      paymentTerms: r.payment_terms,
      pdfPath: r.pdf_path,
      pdfGeneratedAt: r.pdf_generated_at,
      sentAt: r.sent_at,
      cancelledAt: r.cancelled_at,
      cancelReason: r.cancel_reason,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return { data: invoices };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list invoices',
      },
    };
  }
}

/**
 * Retrieves a full invoice with items, allocations, receipts, and credit notes.
 */
export async function getInvoiceAction(id: string): Promise<
  ActionResult<{
    invoice: Invoice;
    items: InvoiceItem[];
    payments: Array<{
      paymentId: string;
      receiptNumber: string | null;
      paymentDate: string;
      amountPaise: number;
      method: string;
      referenceNumber: string | null;
    }>;
    creditNotes: Array<{
      id: string;
      creditNoteNumber: string;
      issueDate: string;
      totalPaise: number;
      reason: string;
    }>;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:view');

    const supabase = await createClient();

    // 1. Fetch invoice from view
    const { data: invRow, error: invErr } = await supabase
      .from('invoices_v')
      .select('*')
      .eq('id', id)
      .single();

    if (invErr || !invRow) {
      return { error: { code: 'NOT_FOUND', message: 'Invoice not found' } };
    }

    // 2. Fetch items
    const { data: itemsRows } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('sort', { ascending: true });

    // 3. Fetch allocations with payments and receipts
    const { data: allocRows } = await supabase
      .from('payment_allocations')
      .select('amount_paise, payment_id, payments(payment_date, method, reference_number, receipts(receipt_number))')
      .eq('invoice_id', id)
      .is('reversed_at', null);

    // 4. Fetch credit notes
    const { data: cnRows } = await supabase
      .from('credit_notes')
      .select('id, credit_note_number, issue_date, total_paise, reason')
      .eq('invoice_id', id);

    const invoice: Invoice = {
      id: invRow.id,
      invoiceNumber: invRow.invoice_number,
      bookingId: invRow.booking_id,
      bookingNumber: invRow.booking_number,
      clientId: invRow.client_id,
      clientName: invRow.client_name,
      status: invRow.status as InvoiceStatus,
      displayStatus: invRow.display_status as any,
      issueDate: invRow.issue_date,
      dueDate: invRow.due_date,
      subtotalPaise: invRow.subtotal_paise,
      discountType: invRow.discount_type as any,
      discountValue: invRow.discount_value,
      discountPaise: invRow.discount_paise,
      taxableAmountPaise: invRow.taxable_amount_paise,
      cgstRateBps: invRow.cgst_rate_bps,
      cgstPaise: invRow.cgst_paise,
      sgstRateBps: invRow.sgst_rate_bps,
      sgstPaise: invRow.sgst_paise,
      igstRateBps: invRow.igst_rate_bps,
      igstPaise: invRow.igst_paise,
      totalTaxPaise: invRow.total_tax_paise,
      totalPaise: invRow.total_paise,
      paidPaise: invRow.paid_paise,
      creditedPaise: invRow.credited_paise,
      balancePaise: invRow.balance_paise,
      notesToClient: invRow.notes_to_client,
      internalNotes: invRow.internal_notes,
      terms: invRow.terms,
      paymentTerms: invRow.payment_terms,
      pdfPath: invRow.pdf_path,
      pdfGeneratedAt: invRow.pdf_generated_at,
      sentAt: invRow.sent_at,
      cancelledAt: invRow.cancelled_at,
      cancelReason: invRow.cancel_reason,
      createdBy: invRow.created_by,
      createdAt: invRow.created_at,
      updatedAt: invRow.updated_at,
    };

    const items: InvoiceItem[] = (itemsRows || []).map((it) => ({
      id: it.id,
      invoiceId: it.invoice_id,
      serviceId: it.service_id,
      packageId: it.package_id,
      description: it.description,
      quantity: it.quantity,
      unitPricePaise: it.unit_price_paise,
      lineTotalPaise: it.line_total_paise,
      sort: it.sort,
    }));

    const payments = (allocRows || []).map((a: any) => ({
      paymentId: a.payment_id,
      receiptNumber: a.payments?.receipts?.receipt_number || null,
      paymentDate: a.payments?.payment_date,
      amountPaise: a.amount_paise,
      method: a.payments?.method,
      referenceNumber: a.payments?.reference_number,
    }));

    const creditNotes = (cnRows || []).map((cn) => ({
      id: cn.id,
      creditNoteNumber: cn.credit_note_number,
      issueDate: cn.issue_date,
      totalPaise: cn.total_paise,
      reason: cn.reason,
    }));

    return {
      data: {
        invoice,
        items,
        payments,
        creditNotes,
      },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get invoice',
      },
    };
  }
}

/**
 * Creates an invoice with atomic INV numbering and financial totals computation.
 */
export async function createInvoiceAction(rawInput: InvoiceInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:create');

    const parsed = invoiceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    // Financial calculations
    const subtotalBigInt = input.items.reduce(
      (acc, it) => acc + BigInt(it.quantity) * BigInt(it.unitPricePaise),
      0n
    );

    let discountPaiseBigInt = 0n;
    if (input.discountType === 'percent' && input.discountValue) {
      const bps = Math.round(input.discountValue * 100);
      discountPaiseBigInt = percentOf(subtotalBigInt, bps);
    } else if (input.discountType === 'fixed' && input.discountValue) {
      discountPaiseBigInt = toPaise(input.discountValue);
    }
    if (discountPaiseBigInt > subtotalBigInt) {
      discountPaiseBigInt = subtotalBigInt;
    }

    const taxableBigInt = subtotalBigInt - discountPaiseBigInt;

    // GST computation
    const isInterState = input.igstRateBps > 0;
    const gstRateBps = isInterState ? input.igstRateBps : input.cgstRateBps + input.sgstRateBps;
    const gst = computeGst(taxableBigInt, gstRateBps, isInterState);

    const totalPaiseBigInt = taxableBigInt + gst.totalTaxPaise;

    const supabase = await createClient();

    // Generate atomic INV number
    const { data: invNumber, error: seqErr } = await supabase.rpc('next_document_number', {
      p_doc_type: 'INV',
    });
    if (seqErr || !invNumber) {
      return { error: { code: 'INTERNAL_ERROR', message: seqErr?.message || 'Failed to generate invoice number' } };
    }

    // Insert invoice
    const { data: inv, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invNumber,
        booking_id: input.bookingId,
        client_id: input.clientId,
        status: 'draft',
        issue_date: input.issueDate,
        due_date: input.dueDate,
        subtotal_paise: Number(subtotalBigInt),
        discount_type: input.discountType || null,
        discount_value: input.discountValue || null,
        discount_paise: Number(discountPaiseBigInt),
        taxable_amount_paise: Number(taxableBigInt),
        cgst_rate_bps: isInterState ? 0 : input.cgstRateBps,
        cgst_paise: Number(gst.cgstPaise),
        sgst_rate_bps: isInterState ? 0 : input.sgstRateBps,
        sgst_paise: Number(gst.sgstPaise),
        igst_rate_bps: isInterState ? input.igstRateBps : 0,
        igst_paise: Number(gst.igstPaise),
        total_tax_paise: Number(gst.totalTaxPaise),
        total_paise: Number(totalPaiseBigInt),
        paid_paise: 0,
        credited_paise: 0,
        notes_to_client: input.notesToClient || null,
        internal_notes: input.internalNotes || null,
        terms: input.terms || null,
        payment_terms: input.paymentTerms || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (invErr || !inv) {
      return { error: { code: 'INTERNAL_ERROR', message: invErr?.message || 'Failed to insert invoice' } };
    }

    // Insert invoice items
    const itemsPayload = input.items.map((it, idx) => ({
      invoice_id: inv.id,
      service_id: it.serviceId || null,
      package_id: it.packageId || null,
      description: it.description,
      quantity: it.quantity,
      unit_price_paise: it.unitPricePaise,
      line_total_paise: it.quantity * it.unitPricePaise,
      sort: it.sort ?? idx,
    }));

    const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsPayload);
    if (itemsErr) {
      return { error: { code: 'INTERNAL_ERROR', message: itemsErr.message } };
    }

    revalidatePath('/crm/invoices');
    revalidatePath(`/crm/bookings/${input.bookingId}`);
    return { data: inv.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create invoice',
      },
    };
  }
}

/**
 * Transitions invoice from draft to sent.
 */
export async function updateInvoiceStatusAction(
  id: string,
  newStatus: 'sent' | 'draft'
): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:update');

    const supabase = await createClient();
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (newStatus === 'sent') {
      updateData.sent_at = new Date().toISOString();
    }

    const { error } = await supabase.from('invoices').update(updateData).eq('id', id);
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath(`/crm/invoices/${id}`);
    revalidatePath('/crm/invoices');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to update invoice status',
      },
    };
  }
}

/**
 * Cancels an invoice (asserts paid_paise = 0 per D-22).
 */
export async function cancelInvoiceAction(rawInput: CancelInvoiceInput): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:cancel');

    const parsed = cancelInvoiceSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.rpc('cancel_invoice', {
      p_invoice_id: input.invoiceId,
      p_reason: input.reason,
      p_actor_id: user.id,
    });

    if (error) {
      return { error: { code: 'UNPROCESSABLE', message: error.message } };
    }

    revalidatePath(`/crm/invoices/${input.invoiceId}`);
    revalidatePath('/crm/invoices');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to cancel invoice',
      },
    };
  }
}

// --------------------------------------------------------------------------
// 2. PAYMENTS & ALLOCATIONS (D-21)
// --------------------------------------------------------------------------

/**
 * Records a payment with row locking, atomic full allocation, receipt generation, and status updates.
 */
export async function recordPaymentAction(rawInput: RecordPaymentInput): Promise<
  ActionResult<{
    paymentId: string;
    receiptId: string;
    receiptNumber: string;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:record');

    const parsed = recordPaymentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const allocationsJson = input.allocations.map((a) => ({
      invoice_id: a.invoiceId,
      amount_paise: a.amountPaise,
    }));

    const { data, error } = await supabase.rpc('record_payment', {
      p_client_id: input.clientId,
      p_payment_date: input.paymentDate,
      p_amount_paise: input.amountPaise,
      p_method: input.method,
      p_reference_number: input.referenceNumber || null,
      p_notes: input.notes || null,
      p_allocations: allocationsJson,
      p_actor_id: user.id,
    });

    if (error || !data) {
      return {
        error: { code: 'UNPROCESSABLE', message: error?.message || 'Failed to record payment' },
      };
    }

    revalidatePath('/crm/payments');
    revalidatePath('/crm/invoices');
    revalidatePath('/crm/ledger');
    return {
      data: {
        paymentId: (data as any).payment_id,
        receiptId: (data as any).receipt_id,
        receiptNumber: (data as any).receipt_number,
      },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to record payment',
      },
    };
  }
}

/**
 * Voids a recorded payment (reverses allocations, restores invoice balances per D-21).
 */
export async function voidPaymentAction(rawInput: VoidPaymentInput): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:void');

    const parsed = voidPaymentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.rpc('void_payment', {
      p_payment_id: input.paymentId,
      p_reason: input.reason,
      p_actor_id: user.id,
    });

    if (error) {
      return { error: { code: 'UNPROCESSABLE', message: error.message } };
    }

    revalidatePath('/crm/payments');
    revalidatePath('/crm/invoices');
    revalidatePath('/crm/ledger');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to void payment',
      },
    };
  }
}

/**
 * Lists recorded payments with client name and receipt number.
 */
export async function listPaymentsAction(filters?: {
  clientId?: string;
  status?: string;
}): Promise<ActionResult<Payment[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:record');

    const supabase = await createClient();
    let query = supabase
      .from('payments')
      .select('*, clients(full_name), receipts(receipt_number), payment_allocations(*, invoices(invoice_number))');

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data: rows, error } = await query.order('payment_date', { ascending: false });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const payments: Payment[] = (rows || []).map((r: any) => ({
      id: r.id,
      clientId: r.client_id,
      clientName: r.clients?.full_name || 'Client',
      paymentDate: r.payment_date,
      amountPaise: r.amount_paise,
      method: r.method,
      referenceNumber: r.reference_number,
      notes: r.notes,
      status: r.status,
      voidedAt: r.voided_at,
      voidedBy: r.voided_by,
      voidReason: r.void_reason,
      recordedBy: r.recorded_by,
      createdAt: r.created_at,
      receiptNumber: r.receipts?.receipt_number || null,
      allocations: (r.payment_allocations || []).map((a: any) => ({
        id: a.id,
        paymentId: a.payment_id,
        invoiceId: a.invoice_id,
        invoiceNumber: a.invoices?.invoice_number || 'INV',
        amountPaise: a.amount_paise,
        reversedAt: a.reversed_at,
        reversedBy: a.reversed_by,
        reversedReason: a.reversed_reason,
        createdAt: a.created_at,
      })),
    }));

    return { data: payments };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list payments',
      },
    };
  }
}

// --------------------------------------------------------------------------
// 3. CREDIT NOTES (D-22)
// --------------------------------------------------------------------------

/**
 * Issues a credit note (capped at unpaid invoice balance per D-22).
 */
export async function issueCreditNoteAction(rawInput: IssueCreditNoteInput): Promise<
  ActionResult<{
    creditNoteId: string;
    creditNoteNumber: string;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:update');

    const parsed = issueCreditNoteSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const itemsJson = input.items.map((it, idx) => ({
      description: it.description,
      quantity: it.quantity,
      unit_price_paise: it.unitPricePaise,
      sort: it.sort ?? idx,
    }));

    const { data, error } = await supabase.rpc('issue_credit_note', {
      p_invoice_id: input.invoiceId,
      p_issue_date: input.issueDate,
      p_reason: input.reason,
      p_items: itemsJson,
      p_actor_id: user.id,
    });

    if (error || !data) {
      return {
        error: { code: 'UNPROCESSABLE', message: error?.message || 'Failed to issue credit note' },
      };
    }

    revalidatePath(`/crm/invoices/${input.invoiceId}`);
    revalidatePath('/crm/credit-notes');
    return {
      data: {
        creditNoteId: (data as any).credit_note_id,
        creditNoteNumber: (data as any).credit_note_number,
      },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to issue credit note',
      },
    };
  }
}

/**
 * Lists credit notes with invoice number and client name.
 */
export async function listCreditNotesAction(filters?: { clientId?: string }): Promise<ActionResult<CreditNote[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'invoices:view');

    const supabase = await createClient();
    let query = supabase
      .from('credit_notes')
      .select('*, clients(full_name), invoices(invoice_number), credit_note_items(*)');

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const { data: rows, error } = await query.order('issue_date', { ascending: false });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const creditNotes: CreditNote[] = (rows || []).map((r: any) => ({
      id: r.id,
      creditNoteNumber: r.credit_note_number,
      invoiceId: r.invoice_id,
      invoiceNumber: r.invoices?.invoice_number || 'INV',
      clientId: r.client_id,
      clientName: r.clients?.full_name || 'Client',
      status: r.status,
      issueDate: r.issue_date,
      reason: r.reason,
      subtotalPaise: r.subtotal_paise,
      discountPaise: r.discount_paise,
      taxableAmountPaise: r.taxable_amount_paise,
      cgstPaise: r.cgst_paise,
      sgstPaise: r.sgst_paise,
      igstPaise: r.igst_paise,
      totalTaxPaise: r.total_tax_paise,
      totalPaise: r.total_paise,
      pdfPath: r.pdf_path,
      pdfGeneratedAt: r.pdf_generated_at,
      sentAt: r.sent_at,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      items: (r.credit_note_items || []).map((it: any) => ({
        id: it.id,
        creditNoteId: it.credit_note_id,
        description: it.description,
        quantity: it.quantity,
        unitPricePaise: it.unit_price_paise,
        lineTotalPaise: it.line_total_paise,
        sort: it.sort,
      })),
    }));

    return { data: creditNotes };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list credit notes',
      },
    };
  }
}

// --------------------------------------------------------------------------
// 4. RECEIPTS
// --------------------------------------------------------------------------

/**
 * Lists all issued receipts.
 */
export async function listReceiptsAction(): Promise<
  ActionResult<
    Array<{
      id: string;
      receiptNumber: string;
      paymentId: string;
      paymentDate: string;
      clientName: string;
      amountPaise: number;
      method: string;
      pdfPath: string | null;
      createdAt: string;
    }>
  >
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:record');

    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from('receipts')
      .select('*, payments(*, clients(full_name))')
      .order('created_at', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const receipts = (rows || []).map((r: any) => ({
      id: r.id,
      receiptNumber: r.receipt_number,
      paymentId: r.payment_id,
      paymentDate: r.payments?.payment_date || '',
      clientName: r.payments?.clients?.full_name || 'Client',
      amountPaise: r.payments?.amount_paise || 0,
      method: r.payments?.method || 'other',
      pdfPath: r.pdf_path,
      createdAt: r.created_at,
    }));

    return { data: receipts };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list receipts',
      },
    };
  }
}

// --------------------------------------------------------------------------
// 5. EXPENSES & MANUAL INCOME (D-23)
// --------------------------------------------------------------------------

/**
 * Lists expenses with categories.
 */
export async function listExpensesAction(filters?: {
  categoryId?: string;
  bookingId?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ActionResult<Expense[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:view');

    const supabase = await createClient();
    let query = supabase
      .from('expenses')
      .select('*, expense_categories(code, name), bookings(booking_number)')
      .is('deleted_at', null);

    if (filters?.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters?.bookingId) {
      query = query.eq('booking_id', filters.bookingId);
    }
    if (filters?.fromDate) {
      query = query.gte('expense_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('expense_date', filters.toDate);
    }

    const { data: rows, error } = await query.order('expense_date', { ascending: false });
    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const expenses: Expense[] = (rows || []).map((r: any) => ({
      id: r.id,
      expenseDate: r.expense_date,
      categoryId: r.category_id,
      categoryCode: r.expense_categories?.code || '',
      categoryName: r.expense_categories?.name || 'Category',
      description: r.description,
      amountPaise: r.amount_paise,
      vendor: r.vendor,
      paymentMethod: r.payment_method,
      referenceNumber: r.reference_number,
      receiptPath: r.receipt_path,
      bookingId: r.booking_id,
      bookingNumber: r.bookings?.booking_number || null,
      crewPayId: r.crew_pay_id,
      source: r.source,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    }));

    return { data: expenses };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list expenses',
      },
    };
  }
}

/**
 * Creates an expense entry.
 */
export async function createExpenseAction(rawInput: ExpenseInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:manage');

    const parsed = expenseSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        expense_date: input.expenseDate,
        category_id: input.categoryId,
        description: input.description,
        amount_paise: input.amountPaise,
        vendor: input.vendor || null,
        payment_method: input.paymentMethod || null,
        reference_number: input.referenceNumber || null,
        receipt_path: input.receiptPath || null,
        booking_id: input.bookingId || null,
        source: 'manual',
        notes: input.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create expense' } };
    }

    revalidatePath('/crm/expenses');
    revalidatePath('/crm/ledger');
    return { data: data.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create expense',
      },
    };
  }
}

/**
 * Soft deletes an expense.
 */
export async function deleteExpenseAction(id: string): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'expenses:manage');

    const supabase = await createClient();
    const { error } = await supabase
      .from('expenses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/expenses');
    revalidatePath('/crm/ledger');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to delete expense',
      },
    };
  }
}

/**
 * Lists manual income entries.
 */
export async function listManualIncomeAction(): Promise<ActionResult<ManualIncomeEntry[]>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'ledger:view');

    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from('manual_income_entries')
      .select('*')
      .is('deleted_at', null)
      .order('entry_date', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const entries: ManualIncomeEntry[] = (rows || []).map((r) => ({
      id: r.id,
      entryDate: r.entry_date,
      description: r.description,
      amountPaise: r.amount_paise,
      paymentMethod: r.payment_method as any,
      referenceNumber: r.reference_number,
      notes: r.notes,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
    }));

    return { data: entries };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to list manual income',
      },
    };
  }
}

/**
 * Creates a manual income entry.
 */
export async function createManualIncomeAction(rawInput: ManualIncomeInput): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:record');

    const parsed = manualIncomeSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('manual_income_entries')
      .insert({
        entry_date: input.entryDate,
        description: input.description,
        amount_paise: input.amountPaise,
        payment_method: input.paymentMethod || null,
        reference_number: input.referenceNumber || null,
        notes: input.notes || null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !data) {
      return { error: { code: 'INTERNAL_ERROR', message: error?.message || 'Failed to create manual income' } };
    }

    revalidatePath('/crm/ledger');
    return { data: data.id };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to create manual income',
      },
    };
  }
}

/**
 * Records a crew payment and creates the linked expense atomically (D-23).
 */
export async function recordCrewPaymentAction(rawInput: RecordCrewPaymentInput): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'payments:record');

    const parsed = recordCrewPaymentSchema.safeParse(rawInput);
    if (!parsed.success) {
      return {
        error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Validation error' },
      };
    }
    const input = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase.rpc('record_crew_payment', {
      p_crew_pay_record_id: input.crewPayRecordId,
      p_payment_date: input.paymentDate,
      p_amount_paise: input.amountPaise,
      p_method: input.method,
      p_reference_number: input.referenceNumber || null,
      p_notes: input.notes || null,
      p_actor_id: user.id,
    });

    if (error) {
      return { error: { code: 'UNPROCESSABLE', message: error.message } };
    }

    revalidatePath('/crm/crew');
    revalidatePath('/crm/expenses');
    revalidatePath('/crm/ledger');
    return {};
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to record crew payment',
      },
    };
  }
}

// --------------------------------------------------------------------------
// 6. GENERAL LEDGER & P&L REPORT (D-23)
// --------------------------------------------------------------------------

/**
 * Retrieves the General Ledger entries and computed Profit & Loss Report.
 * Manager has NO access per RBAC §3.3.
 */
export async function getLedgerReportAction(params: {
  startDate: string;
  endDate: string;
}): Promise<
  ActionResult<{
    entries: LedgerEntry[];
    report: ProfitAndLossReport;
  }>
> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'ledger:view');

    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from('ledger_entries_v')
      .select('*')
      .gte('entry_date', params.startDate)
      .lte('entry_date', params.endDate)
      .order('entry_date', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const entries: LedgerEntry[] = (rows || []).map((r) => ({
      id: r.id,
      entryDate: r.entry_date,
      type: r.type as 'income' | 'expense',
      category: r.category,
      amountPaise: r.amount_paise,
      source: r.source,
      referenceType: r.reference_type,
      referenceId: r.reference_id,
      description: r.description,
      paymentMethod: r.payment_method as any,
      referenceNumber: r.reference_number,
      createdAt: r.created_at,
    }));

    // Compute P&L aggregates
    let totalIncomePaise = 0;
    let totalExpensesPaise = 0;
    const incomeCatMap = new Map<string, number>();
    const expenseCatMap = new Map<string, number>();

    for (const e of entries) {
      if (e.type === 'income') {
        totalIncomePaise += e.amountPaise;
        incomeCatMap.set(e.category, (incomeCatMap.get(e.category) || 0) + e.amountPaise);
      } else {
        totalExpensesPaise += e.amountPaise;
        expenseCatMap.set(e.category, (expenseCatMap.get(e.category) || 0) + e.amountPaise);
      }
    }

    const report: ProfitAndLossReport = {
      startDate: params.startDate,
      endDate: params.endDate,
      totalIncomePaise,
      totalExpensesPaise,
      netProfitPaise: totalIncomePaise - totalExpensesPaise,
      incomeByCategory: Array.from(incomeCatMap.entries()).map(([category, amountPaise]) => ({
        category,
        amountPaise,
      })),
      expensesByCategory: Array.from(expenseCatMap.entries()).map(([category, amountPaise]) => ({
        category,
        amountPaise,
      })),
    };

    return {
      data: {
        entries,
        report,
      },
    };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to get ledger report',
      },
    };
  }
}

/**
 * Exports Ledger to CSV with formula-injection protection (escapes `=,+,-,@`).
 */
export async function exportLedgerCsvAction(params: {
  startDate: string;
  endDate: string;
}): Promise<ActionResult<string>> {
  try {
    const user = await getAuthenticatedUser();
    requirePermission(user, 'ledger:view');

    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from('ledger_entries_v')
      .select('*')
      .gte('entry_date', params.startDate)
      .lte('entry_date', params.endDate)
      .order('entry_date', { ascending: false });

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    const header = [
      'Entry Date',
      'Type',
      'Category',
      'Description',
      'Amount (INR)',
      'Payment Method',
      'Reference Number',
      'Source',
    ].join(',');

    const lines = (rows || []).map((r) => {
      const amountRupees = (r.amount_paise / 100).toFixed(2);
      return [
        sanitizeCsvCell(r.entry_date),
        sanitizeCsvCell(r.type),
        sanitizeCsvCell(r.category),
        sanitizeCsvCell(r.description),
        amountRupees,
        sanitizeCsvCell(r.payment_method),
        sanitizeCsvCell(r.reference_number),
        sanitizeCsvCell(r.source),
      ].join(',');
    });

    const csv = [header, ...lines].join('\n');
    return { data: csv };
  } catch (err: unknown) {
    const actionError = err as { code?: string; message?: string };
    return {
      error: {
        code: (actionError.code as any) || 'INTERNAL_ERROR',
        message: actionError.message || 'Failed to export ledger CSV',
      },
    };
  }
}
