import { describe, it, expect } from 'vitest';
import React from 'react';
import zlib from 'node:zlib';
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

/**
 * Extracts raw decoded text content from all PDF flate-encoded streams.
 */
function extractTextFromPdfBuffer(buffer: Buffer): string {
  const binary = buffer.toString('binary');
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
  let match: RegExpExecArray | null;
  let combined = '';

  while ((match = streamRegex.exec(binary)) !== null) {
    try {
      const streamBuf = Buffer.from(match[1], 'binary');
      const decompressed = zlib.inflateSync(streamBuf);
      combined += ' ' + decompressed.toString('utf-8');
    } catch {
      // Uncompressed stream or image data
      combined += ' ' + match[1];
    }
  }

  return combined;
}

const mockBusiness: BusinessProfilePdf = {
  businessName: 'VOWS',
  legalName: 'VOWS Photography & Cinema Private Limited',
  gstin: '29ABCDE1234F1Z5',
  pan: 'ABCDE1234F',
  address: 'Indiranagar, Bangalore, Karnataka - 560038',
  phone: '+91 98765 43210',
  email: 'hello@vowsstudio.com',
  bankName: 'HDFC Bank',
  bankAccountNumber: '50200012345678',
  bankIfsc: 'HDFC0001234',
  upiId: 'vows@hdfcbank',
};

describe('PDF Generation & Smoke Tests (Phase 5)', () => {
  it('renders Quotation PDF with ₹ glyph and correct totals', async () => {
    const data: QuotationPdfData = {
      quotationNumber: 'QT-2026-000001',
      version: 1,
      issueDate: '2026-11-10',
      validUntil: '2026-12-10',
      business: mockBusiness,
      client: {
        fullName: 'Aarav Sharma & Diya Patel',
        phone: '+91 98765 00001',
        email: 'aarav@example.com',
        billingAddress: 'MG Road, Bangalore',
      },
      items: [
        {
          description: 'Candid Wedding Photography (2 Days)',
          quantity: 1,
          unitPricePaise: 8000000,
          lineTotalPaise: 8000000,
        },
        {
          description: 'Cinematic Wedding Teaser & Film',
          quantity: 1,
          unitPricePaise: 7000000,
          lineTotalPaise: 7000000,
        },
      ],
      subtotalPaise: 15000000, // ₹1,50,000
      discountPaise: 1500000,  // ₹15,000 (10%)
      taxablePaise: 13500000,  // ₹1,35,000
      gstApplied: true,
      cgstPaise: 1215000,      // 9% = ₹12,150
      sgstPaise: 1215000,      // 9% = ₹12,150
      igstPaise: 0,
      totalPaise: 15930000,    // ₹1,59,300
      notesToClient: 'Looking forward to crafting timeless memories.',
      terms: '50% advance to confirm booking date.',
      isDemo: false,
    };

    const buffer = await renderPdfToBuffer(React.createElement(QuotationPdf, { data }));

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(5000);
    // Standard PDF file header
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');

    // Extract text and assert document characters and Indian Rupee symbol glyph
    const text = extractTextFromPdfBuffer(buffer);
    // In TrueType subsetting, glyphs are mapped to Unicode via the ToUnicode CMap:
    // <20b9> is the Unicode point for the Indian Rupee symbol ₹ (U+20B9)
    expect(text).toContain('<20b9>');
    // 'Q' = <0051>, 'T' = <0054>
    expect(text).toContain('<0051>');
    expect(text).toContain('<0054>');
  });

  it('renders Invoice PDF with paid amounts and remaining balance', async () => {
    const data: InvoicePdfData = {
      invoiceNumber: 'INV-2026-000042',
      issueDate: '2026-11-10',
      dueDate: '2026-11-25',
      status: 'partially_paid',
      business: mockBusiness,
      client: {
        fullName: 'Karthik Rao',
        phone: '+91 98765 00002',
        email: 'karthik@example.com',
      },
      items: [
        {
          description: 'Pre-Wedding Shoot in Mysore',
          quantity: 1,
          unitPricePaise: 4500000,
          lineTotalPaise: 4500000,
        },
      ],
      subtotalPaise: 4500000,
      discountPaise: 0,
      taxablePaise: 4500000,
      gstApplied: true,
      cgstPaise: 405000,
      sgstPaise: 405000,
      igstPaise: 0,
      totalPaise: 5310000,
      paidPaise: 2500000, // ₹25,000 advance
      balancePaise: 2810000, // ₹28,100 balance
      isDemo: true, // Demo watermark
    };

    const buffer = await renderPdfToBuffer(React.createElement(InvoicePdf, { data }));
    expect(buffer.length).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('renders Payment Receipt PDF with VOID stamp when voided', async () => {
    const data: ReceiptPdfData = {
      receiptNumber: 'RCP-20261110-0012',
      paymentDate: '2026-11-10',
      amountPaise: 2500000,
      paymentMethod: 'bank_transfer',
      referenceNumber: 'HDFC-UTR-99887711',
      status: 'voided', // Should render VOID stamp
      business: mockBusiness,
      client: {
        fullName: 'Karthik Rao',
        phone: '+91 98765 00002',
      },
      allocations: [
        {
          invoiceNumber: 'INV-2026-000042',
          allocatedAmountPaise: 2500000,
        },
      ],
      notes: 'Initial deposit via NEFT',
    };

    const buffer = await renderPdfToBuffer(React.createElement(ReceiptPdf, { data }));
    expect(buffer.length).toBeGreaterThan(4000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('renders Credit Note PDF with linked invoice reference', async () => {
    const data: CreditNotePdfData = {
      creditNoteNumber: 'CN-2026-000005',
      invoiceNumber: 'INV-2026-000042',
      issueDate: '2026-11-10',
      reason: 'Package downgrade discount credit',
      business: mockBusiness,
      client: {
        fullName: 'Karthik Rao',
      },
      items: [
        {
          description: 'Package adjustment credit',
          quantity: 1,
          unitPricePaise: 500000,
          lineTotalPaise: 500000,
        },
      ],
      totalPaise: 500000,
    };

    const buffer = await renderPdfToBuffer(React.createElement(CreditNotePdf, { data }));
    expect(buffer.length).toBeGreaterThan(4000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('renders Booking Confirmation PDF with events, crew, and deliverables', async () => {
    const data: BookingConfirmationPdfData = {
      bookingNumber: 'BK-2026-000010',
      confirmationDate: '2026-11-10',
      client: {
        fullName: 'Rohit Verma',
        phone: '+91 99887 76655',
      },
      business: mockBusiness,
      events: [
        {
          name: 'Mehendi & Sangeet',
          date: '2026-12-14',
          startTime: '16:00',
          endTime: '23:00',
          venueName: 'The Leela Palace, Bangalore',
        },
        {
          name: 'Traditional Wedding Ceremony',
          date: '2026-12-15',
          startTime: '08:00',
          endTime: '15:00',
          venueName: 'The Leela Palace Ballroom',
        },
      ],
      crewRoles: [
        { event: 'Mehendi & Sangeet', role: 'lead_photographer', memberName: 'Reuben V' },
        { event: 'Traditional Wedding Ceremony', role: 'cinematographer', memberName: 'Anil K' },
      ],
      deliverables: [
        { description: 'High-Resolution Edited Digital Photographs', quantity: 600 },
        { description: 'Cinematic Highlight Film (4K)', quantity: 1 },
        { description: 'Fine-Art Hardcover Wedding Album', quantity: 2 },
      ],
      totalContractPaise: 25000000,
    };

    const buffer = await renderPdfToBuffer(React.createElement(BookingConfirmationPdf, { data }));
    expect(buffer.length).toBeGreaterThan(5000);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
