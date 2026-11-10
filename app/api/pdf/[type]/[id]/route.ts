import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { getAuthenticatedUser, requirePermission } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { renderPdfToBuffer } from '@/lib/pdf/generator';
import { QuotationPdf } from '@/lib/pdf/templates/quotation-pdf';
import { InvoicePdf } from '@/lib/pdf/templates/invoice-pdf';
import { ReceiptPdf } from '@/lib/pdf/templates/receipt-pdf';
import { CreditNotePdf } from '@/lib/pdf/templates/credit-note-pdf';
import { BookingConfirmationPdf } from '@/lib/pdf/templates/booking-confirmation-pdf';
import {
  BusinessProfilePdf,
  QuotationPdfData,
  InvoicePdfData,
  ReceiptPdfData,
  CreditNotePdfData,
  BookingConfirmationPdfData,
} from '@/lib/pdf/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { type, id } = await props.params;

    const supabase = await createClient();

    // Fetch business settings for branding & bank info
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const business: BusinessProfilePdf = {
      businessName: businessSettings?.studio_name || 'VOWS Studio',
      legalName: businessSettings?.studio_name || 'VOWS Photography & Cinema Private Limited',
      gstin: businessSettings?.gstin || null,
      pan: businessSettings?.pan || null,
      address: [
        businessSettings?.address_line1,
        businessSettings?.address_line2,
        businessSettings?.city,
        businessSettings?.state,
        businessSettings?.pincode,
      ]
        .filter(Boolean)
        .join(', ') || 'Indiranagar, Bangalore, Karnataka - 560038',
      phone: businessSettings?.phone || '+91 98765 43210',
      email: businessSettings?.email || 'contact@vowsstudio.com',
      website: businessSettings?.website || 'https://vowsstudio.com',
      bankName: businessSettings?.bank_name || 'HDFC Bank',
      bankAccountNumber: businessSettings?.bank_account_number || '50200012345678',
      bankIfsc: businessSettings?.bank_ifsc || 'HDFC0001234',
      bankAccountType: 'Current Account',
      upiId: businessSettings?.upi_id || 'vows@hdfcbank',
    };

    const isDemo = process.env.APP_MODE === 'demo';

    let pdfElement: React.ReactElement | null = null;
    let filename = `document-${id}.pdf`;

    if (type === 'quotation') {
      requirePermission(user, 'quotations:view');

      const { data: q, error: qErr } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', id)
        .single();

      if (qErr || !q) {
        return new NextResponse('Quotation not found', { status: 404 });
      }

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
        .eq('quotation_id', id);

      filename = `Quotation-${q.quotation_number}.pdf`;
      const data: QuotationPdfData = {
        quotationNumber: q.quotation_number,
        version: q.version_no || 1,
        issueDate: q.created_at ? new Date(q.created_at).toISOString().slice(0, 10) : '',
        validUntil: q.valid_until,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
          billingAddress: client
            ? [client.address_line1, client.address_line2, client.city, client.state, client.pincode].filter(Boolean).join(', ')
            : null,
          gstin: q.client_gstin,
        },
        items: (items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unit_price_paise,
          lineTotalPaise: it.line_total_paise,
        })),
        subtotalPaise: q.subtotal_paise,
        discountType: (q.discount_type as any) || null,
        discountBps: q.discount_bps,
        discountFixedPaise: q.discount_fixed_paise,
        discountPaise: q.discount_paise || 0,
        taxablePaise: q.taxable_paise,
        gstApplied: q.gst_applied,
        cgstPaise: q.cgst_paise || 0,
        sgstPaise: q.sgst_paise || 0,
        igstPaise: q.igst_paise || 0,
        totalPaise: q.total_paise,
        notesToClient: q.notes_to_client,
        terms: q.terms,
        isDemo,
      };

      pdfElement = React.createElement(QuotationPdf, { data });
    } else if (type === 'invoice') {
      requirePermission(user, 'invoices:view');

      const { data: inv, error: invErr } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single();

      if (invErr || !inv) {
        return new NextResponse('Invoice not found', { status: 404 });
      }

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
        .eq('invoice_id', id);

      filename = `Invoice-${inv.invoice_number}.pdf`;
      const data: InvoicePdfData = {
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date,
        status: inv.status,
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
          billingAddress: client
            ? [client.address_line1, client.address_line2, client.city, client.state, client.pincode].filter(Boolean).join(', ')
            : null,
          gstin: client?.gstin,
        },
        items: (items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPricePaise: it.unit_price_paise,
          lineTotalPaise: it.line_total_paise,
        })),
        subtotalPaise: inv.subtotal_paise,
        discountType: (inv.discount_type as any) || null,
        discountBps: null,
        discountFixedPaise: null,
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
        isDemo,
      };

      pdfElement = React.createElement(InvoicePdf, { data });
    } else if (type === 'receipt') {
      requirePermission(user, 'invoices:view');

      const { data: rcp, error: rcpErr } = await supabase
        .from('receipts')
        .select('*')
        .eq('id', id)
        .single();

      if (rcpErr || !rcp) {
        return new NextResponse('Receipt not found', { status: 404 });
      }

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

      filename = `Receipt-${rcp.receipt_number}.pdf`;

      const data: ReceiptPdfData = {
        receiptNumber: rcp.receipt_number,
        paymentDate: pmt?.payment_date || new Date().toISOString().slice(0, 10),
        amountPaise: pmt?.amount_paise || 0,
        paymentMethod: pmt?.method || 'bank_transfer',
        referenceNumber: pmt?.reference_number,
        status: pmt?.status === 'voided' ? 'voided' : 'confirmed',
        business,
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        allocations,
        notes: pmt?.notes,
        isDemo,
      };

      pdfElement = React.createElement(ReceiptPdf, { data });
    } else if (type === 'credit-note') {
      requirePermission(user, 'invoices:view');

      const { data: cn, error: cnErr } = await supabase
        .from('credit_notes')
        .select('*')
        .eq('id', id)
        .single();

      if (cnErr || !cn) {
        return new NextResponse('Credit note not found', { status: 404 });
      }

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
        .eq('credit_note_id', id);

      filename = `CreditNote-${cn.credit_note_number}.pdf`;
      const data: CreditNotePdfData = {
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
        isDemo,
      };

      pdfElement = React.createElement(CreditNotePdf, { data });
    } else if (type === 'booking' || type === 'booking-confirmation') {
      requirePermission(user, 'bookings:view');

      const { data: bk, error: bkErr } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

      if (bkErr || !bk) {
        return new NextResponse('Booking not found', { status: 404 });
      }

      const { data: client } = await supabase
        .from('clients')
        .select('*')
        .eq('id', bk.client_id)
        .maybeSingle();

      const { data: primaryPhone } = client
        ? await supabase.from('client_phones').select('phone_e164').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: primaryEmail } = client
        ? await supabase.from('client_emails').select('email').eq('client_id', client.id).eq('is_primary', true).maybeSingle()
        : { data: null };

      const { data: events } = await supabase
        .from('events')
        .select('*')
        .eq('booking_id', id);

      const { data: lines } = await supabase
        .from('booking_line_items')
        .select('*')
        .eq('booking_id', id);

      filename = `Booking-${bk.booking_number}.pdf`;

      const crewRoles: Array<{ event: string; role: string; memberName?: string }> = [];
      for (const ev of events || []) {
        const { data: assigns } = await supabase
          .from('event_crew_assignments')
          .select('*')
          .eq('event_id', ev.id);

        for (const ca of assigns || []) {
          const { data: cm } = await supabase
            .from('crew_members')
            .select('full_name')
            .eq('id', ca.crew_member_id)
            .maybeSingle();

          crewRoles.push({
            event: ev.name,
            role: ca.role,
            memberName: cm?.full_name || 'Crew Member',
          });
        }
      }

      const data: BookingConfirmationPdfData = {
        bookingNumber: bk.booking_number,
        confirmationDate: bk.created_at
          ? new Date(bk.created_at).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        client: {
          fullName: client?.full_name || 'Valued Client',
          phone: primaryPhone?.phone_e164,
          email: primaryEmail?.email,
        },
        business,
        events: (events || []).map((ev) => ({
          name: ev.name,
          date: ev.event_date,
          startTime: ev.start_time,
          endTime: ev.end_time,
          venueName: ev.venue_name,
        })),
        crewRoles,
        deliverables: (lines || []).map((bl) => ({
          description: bl.description,
          quantity: bl.quantity,
        })),
        totalContractPaise: bk.contract_total_paise,
        notes: bk.notes,
        isDemo,
      };

      pdfElement = React.createElement(BookingConfirmationPdf, { data });
    } else {
      return new NextResponse('Unsupported document type', { status: 400 });
    }

    if (!pdfElement) {
      return new NextResponse('Failed to build PDF element', { status: 500 });
    }

    const buffer = await renderPdfToBuffer(pdfElement);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'FORBIDDEN' || error.message?.includes('Forbidden')) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    console.error('PDF generation error:', err);
    return new NextResponse(
      JSON.stringify({ error: 'PDF generation failed', message: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
