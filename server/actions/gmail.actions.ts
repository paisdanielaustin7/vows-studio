'use server';

import React from 'react';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { getGmailStatus, disconnectGmail } from '@/lib/gmail/oauth';
import { sendEmailService } from '@/server/services/email.service';
import { renderPdfToBuffer } from '@/lib/pdf/generator';
import { QuotationPdf } from '@/lib/pdf/templates/quotation-pdf';
import { InvoicePdf } from '@/lib/pdf/templates/invoice-pdf';
import { ReceiptPdf } from '@/lib/pdf/templates/receipt-pdf';
import { CreditNotePdf } from '@/lib/pdf/templates/credit-note-pdf';
import { wrapInBrandedEmailLayout } from '@/lib/email/template-renderer';
import { GmailStatus, EmailSendResult } from '@/lib/gmail/types';
import { ActionResult } from '@/types/auth';

/**
 * Retrieves the current Gmail connection status (never exposes secrets).
 */
export async function getGmailStatusAction(): Promise<ActionResult<GmailStatus>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || !['system_admin', 'business_owner', 'manager', 'accountant'].includes(user.role)) {
      return { error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
    }

    const status = await getGmailStatus();
    return { data: status };
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to get Gmail status' },
    };
  }
}

/**
 * Disconnects the Gmail account and revokes Google tokens.
 */
export async function disconnectGmailAction(): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      return { error: { code: 'FORBIDDEN', message: 'Only Admins can disconnect Gmail' } };
    }

    await disconnectGmail();
    revalidatePath('/crm/settings');
    return {};
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to disconnect Gmail' },
    };
  }
}

/**
 * Updates Gmail sender display name and reply-to address.
 */
export async function updateGmailSenderSettingsAction(params: {
  fromName: string;
  replyTo?: string | null;
}): Promise<ActionResult<void>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      return { error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
    }

    const supabase = getAdminClient();
    const { error } = await supabase
      .from('gmail_credentials')
      .update({
        from_name: params.fromName.trim() || null,
        reply_to: params.replyTo?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      return { error: { code: 'INTERNAL_ERROR', message: error.message } };
    }

    revalidatePath('/crm/settings');
    return {};
  } catch (err: any) {
    return {
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to update sender settings' },
    };
  }
}

/**
 * Sends a test email to verify credentials and daily quota.
 */
export async function testSendEmailAction(toEmail: string): Promise<ActionResult<EmailSendResult>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user || (user.role !== 'system_admin' && user.role !== 'business_owner')) {
      return { error: { code: 'FORBIDDEN', message: 'Unauthorized' } };
    }

    const htmlBody = wrapInBrandedEmailLayout({
      title: 'Gmail Integration Test',
      bodyContent: `
        <p>Hello,</p>
        <p>This is a test email sent from <strong>VOWS Studio CRM</strong> via your connected Google account.</p>
        <p>If you received this message, your Gmail OAuth integration, MIME encoding, and transmission pipeline are fully verified and operational.</p>
      `,
    });

    const result = await sendEmailService(
      {
        to: toEmail,
        subject: 'VOWS Studio — Gmail Integration Verified',
        htmlBody,
        idempotencyKey: `test-${Date.now()}-${user.id}`,
      },
      user.id
    );

    return { data: result };
  } catch (err: any) {
    return {
      error: { code: 'UNPROCESSABLE', message: err.message || 'Test send failed' },
    };
  }
}

/**
 * Sends a financial document (Quotation, Invoice, Receipt, Credit Note) with attached PDF via Gmail.
 */
export async function sendDocumentEmailAction(params: {
  documentType: 'quotation' | 'invoice' | 'receipt' | 'credit_note';
  documentId: string;
  recipientEmail: string;
  subject: string;
  messageText?: string;
  idempotencyKey: string;
}): Promise<ActionResult<EmailSendResult>> {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } };
    }

    // Check document-specific permissions
    if (params.documentType === 'quotation') {
      requirePermission(user, 'quotations:send');
    } else if (params.documentType === 'invoice') {
      requirePermission(user, 'invoices:send');
    } else if (params.documentType === 'receipt') {
      requirePermission(user, 'payments:record');
    } else if (params.documentType === 'credit_note') {
      requirePermission(user, 'invoices:send');
    }

    const supabase = await createClient();

    // Fetch business settings
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const business = {
      businessName: businessSettings?.studio_name || 'VOWS Studio',
      legalName: businessSettings?.studio_name || 'VOWS Photography & Cinema Private Limited',
      gstin: businessSettings?.gstin || null,
      pan: businessSettings?.pan || null,
      phone: businessSettings?.phone || '+91 98765 43210',
      email: businessSettings?.email || 'contact@vowsstudio.com',
      bankName: businessSettings?.bank_name || 'HDFC Bank',
      bankAccountNumber: businessSettings?.bank_account_number || '50200012345678',
      bankIfsc: businessSettings?.bank_ifsc || 'HDFC0001234',
      upiId: businessSettings?.upi_id || 'vows@hdfcbank',
    };

    let pdfBuffer: Buffer | null = null;
    let filename = `document-${params.documentId}.pdf`;
    let clientId: string | undefined;

    if (params.documentType === 'quotation') {
      const { data: q } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', params.documentId)
        .single();

      if (!q) return { error: { code: 'NOT_FOUND', message: 'Quotation not found' } };

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', q.client_id)
        .maybeSingle();

      const { data: primaryPhone } = client
        ? await supabase.from('client_phones').select('phone_e164').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: primaryEmail } = client
        ? await supabase.from('client_emails').select('email').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: items } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', params.documentId);

      clientId = q.client_id;
      filename = `Quotation-${q.quotation_number}.pdf`;

      const qData = {
        quotationNumber: q.quotation_number,
        version: q.version_no || 1,
        issueDate: q.created_at ? new Date(q.created_at).toISOString().slice(0, 10) : '',
        validUntil: q.valid_until,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        items: (items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unit_price_paise,
          lineTotalPaise: it.line_total_paise,
        })),
        subtotalPaise: q.subtotal_paise,
        discountPaise: q.discount_paise || 0,
        taxablePaise: q.taxable_paise,
        gstApplied: q.gst_applied,
        cgstPaise: q.cgst_paise || 0,
        sgstPaise: q.sgst_paise || 0,
        igstPaise: q.igst_paise || 0,
        totalPaise: q.total_paise,
        notesToClient: q.notes_to_client,
        terms: q.terms,
      };

      pdfBuffer = await renderPdfToBuffer(React.createElement(QuotationPdf, { data: qData }));
    } else if (params.documentType === 'invoice') {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', params.documentId)
        .single();

      if (!inv) return { error: { code: 'NOT_FOUND', message: 'Invoice not found' } };

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', inv.client_id)
        .maybeSingle();

      const { data: primaryPhone } = client
        ? await supabase.from('client_phones').select('phone_e164').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: primaryEmail } = client
        ? await supabase.from('client_emails').select('email').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: items } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', params.documentId);

      clientId = inv.client_id;
      filename = `Invoice-${inv.invoice_number}.pdf`;

      const invData = {
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        items: (items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unit_price_paise,
          lineTotalPaise: it.line_total_paise,
        })),
        subtotalPaise: inv.subtotal_paise,
        discountPaise: inv.discount_paise || 0,
        taxablePaise: inv.taxable_amount_paise,
        gstApplied: inv.total_tax_paise > 0,
        cgstPaise: inv.cgst_paise || 0,
        sgstPaise: inv.sgst_paise || 0,
        igstPaise: inv.igst_paise || 0,
        totalPaise: inv.total_paise,
        paidPaise: inv.paid_paise || 0,
        balancePaise: Math.max(0, inv.total_paise - (inv.paid_paise || 0)),
        notesToClient: inv.notes_to_client,
        terms: inv.terms,
      };

      pdfBuffer = await renderPdfToBuffer(React.createElement(InvoicePdf, { data: invData }));
    } else if (params.documentType === 'receipt') {
      const { data: rcp } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', params.documentId)
        .single();

      if (!rcp) return { error: { code: 'NOT_FOUND', message: 'Receipt not found' } };

      const { data: pmt } = await supabase
        .from('payments')
        .select('*')
        .eq('id', rcp.payment_id)
        .single();

      const { data: client } = pmt
        ? await supabase.from('clients').select('*').eq('id', pmt.client_id).maybeSingle()
        : { data: null };

      const { data: primaryPhone } = client
        ? await supabase.from('client_phones').select('phone_e164').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: primaryEmail } = client
        ? await supabase.from('client_emails').select('email').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: paRows } = pmt
        ? await supabase.from('payment_allocations').select('*').eq('payment_id', pmt.id)
        : { data: [] };

      const allocations: Array<{ invoiceNumber: string; allocatedAmountPaise: number }> = [];
      for (const pa of paRows || []) {
        const { data: invRow } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('id', pa.invoice_id)
          .maybeSingle();
        allocations.push({
          invoiceNumber: invRow?.invoice_number || 'N/A',
          allocatedAmountPaise: pa.amount_paise,
        });
      }

      clientId = pmt?.client_id;
      filename = `Receipt-${rcp.receipt_number}.pdf`;

      const rcpData = {
        receiptNumber: rcp.receipt_number,
        paymentDate: pmt?.payment_date || new Date().toISOString().slice(0, 10),
        amountPaise: pmt?.amount_paise || 0,
        paymentMethod: pmt?.method || 'bank_transfer',
        referenceNumber: pmt?.reference_number,
        status: (pmt?.status === 'voided' ? 'voided' : 'confirmed') as any,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        allocations,
        notes: pmt?.notes,
      };

      pdfBuffer = await renderPdfToBuffer(React.createElement(ReceiptPdf, { data: rcpData }));
    } else if (params.documentType === 'credit_note') {
      const { data: cn } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('id', params.documentId)
        .single();

      if (!cn) return { error: { code: 'NOT_FOUND', message: 'Credit Note not found' } };

      const { data: inv } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('id', cn.invoice_id)
        .maybeSingle();

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', cn.client_id)
        .maybeSingle();

      const { data: primaryPhone } = client
        ? await supabase.from('client_phones').select('phone_e164').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: primaryEmail } = client
        ? await supabase.from('client_emails').select('email').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: items } = await supabase
        .from('credit_note_items')
        .select('*')
        .eq('credit_note_id', params.documentId);

      clientId = cn.client_id;
      filename = `CreditNote-${cn.credit_note_number}.pdf`;

      const cnData = {
        creditNoteNumber: cn.credit_note_number,
        invoiceNumber: inv?.invoice_number || 'N/A',
        issueDate: cn.issue_date,
        reason: cn.reason,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        items: (items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unit_price_paise,
          lineTotalPaise: it.line_total_paise,
        })),
        totalPaise: cn.total_paise,
        notes: null,
      };

      pdfBuffer = await renderPdfToBuffer(React.createElement(CreditNotePdf, { data: cnData }));
    }

    if (!pdfBuffer) {
      return { error: { code: 'INTERNAL_ERROR', message: 'Failed to generate PDF document' } };
    }

    const htmlBody = wrapInBrandedEmailLayout({
      title: params.subject,
      bodyContent: `
        <p>Please find attached your official <strong>${params.documentType.replace('_', ' ')}</strong> document.</p>
        ${params.messageText ? `<p style="font-style: italic; color: #57534e;">&ldquo;${params.messageText}&rdquo;</p>` : ''}
        <p>If you have any questions, please reply directly to this email or reach us through our studio contact lines.</p>
      `,
      studioName: business.businessName,
    });

    const result = await sendEmailService(
      {
        to: params.recipientEmail,
        subject: params.subject,
        htmlBody,
        documentType: params.documentType,
        documentId: params.documentId,
        clientId,
        attachment: {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
        idempotencyKey: params.idempotencyKey,
      },
      user.id
    );

    // If quotation, update status to sent if draft
    if (params.documentType === 'quotation') {
      await supabase
        .from('quotations')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', params.documentId)
        .eq('status', 'draft');
      revalidatePath('/crm/quotations');
      revalidatePath(`/crm/quotations/${params.documentId}`);
    } else if (params.documentType === 'invoice') {
      await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', params.documentId)
        .eq('status', 'draft');
      revalidatePath('/crm/invoices');
      revalidatePath(`/crm/invoices/${params.documentId}`);
    }

    return { data: result };
  } catch (err: any) {
    return {
      error: {
        code: 'UNPROCESSABLE',
        message: err.message || 'Failed to deliver document email. You can download the PDF manually.',
      },
    };
  }
}
