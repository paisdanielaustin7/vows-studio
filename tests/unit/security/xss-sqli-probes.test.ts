import { describe, it, expect } from 'vitest';
import {
  clientSchema,
  enquirySchema,
  quotationSchema,
} from '@/lib/validations/sales.schema';
import { submitReviewSchema } from '@/lib/validations/reviews.schema';

describe('Security Audit — XSS & SQLi Probes across Input Schemas (SECURITY_PLAN §15)', () => {
  it('accepts and preserves text containing quotes, apostrophes, and angles without crashing or SQL breaking', () => {
    // SQL injection strings should be treated safely as raw text strings by parameterized queries
    const sqliInput = "O'Connor & Sons; DROP TABLE clients; --";

    const res = clientSchema.safeParse({
      fullName: sqliInput,
      addressLine1: "123 St. Mary's Road",
      city: 'Bangalore',
      state: 'Karnataka',
      stateCode: '29',
      pincode: '560001',
      phones: [{ phoneE164: '+919876543210', isPrimary: true }],
      emails: [{ email: 'safe@vows.internal', isPrimary: true }],
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.fullName).toBe(sqliInput);
    }
  });

  it('validates and safely types free-text enquiry notes with XSS payloads', () => {
    const xssPayload = '<script>alert("XSS")</script><img src=x onerror=alert(1)>';

    const res = enquirySchema.safeParse({
      guestName: 'Vikram Seth',
      guestEmail: 'vikram@example.com',
      guestPhone: '+919876543210',
      eventType: 'wedding',
      budgetPaise: 25000000,
      notes: xssPayload,
      source: 'website',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.notes).toBe(xssPayload);
    }
  });

  it('validates quotation notes and terms containing punctuation and markup characters', () => {
    const res = quotationSchema.safeParse({
      clientId: '550e8400-e29b-41d4-a716-446655440000',
      validUntil: '2026-12-31',
      taxType: 'cgst_sgst',
      subtotalPaise: 15000000,
      discountPaise: 0,
      taxablePaise: 15000000,
      cgstPaise: 1350000,
      sgstPaise: 1350000,
      igstPaise: 0,
      taxPaise: 2700000,
      totalPaise: 17700000,
      notesToClient: 'Note: 50% advance payable; <br/> remaining on delivery.',
      terms: 'Standard terms: 1) Non-refundable deposit; 2) Raw footage copyright.',
      items: [
        {
          description: "All ceremony moments captured in 4K resolution.",
          quantity: 1,
          unitPricePaise: 15000000,
          lineTotalPaise: 15000000,
          lineDiscountPaise: 0,
          lineTaxablePaise: 15000000,
          cgstPaise: 1350000,
          sgstPaise: 1350000,
          igstPaise: 0,
        },
      ],
    });

    expect(res.success).toBe(true);
  });

  it('validates review testimonials with apostrophes, angles and special characters', () => {
    const res = submitReviewSchema.safeParse({
      token: 'valid-32-char-random-token-xyz12345678',
      overallRating: 5,
      communicationRating: 5,
      qualityRating: 5,
      punctualityRating: 5,
      body: "VOWS Studio's work was breathtaking! We couldn't have asked for better cinematography. <3",
      reviewerName: "Sneha & Rohan",
      showcaseConsent: true,
    });

    expect(res.success).toBe(true);
  });
});
