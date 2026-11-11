import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as ratelimitModule from '@/lib/ratelimit';
import { portfolioItemSchema } from '@/lib/validations/portfolio.schema';

const mockInsert = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
  }),
}));

import { POST } from '@/app/api/public/enquiry/route';

describe('Phase 7 Public Enquiry Form Integration & Portfolio Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'enq-test-123' },
          error: null,
        }),
      }),
    });

    mockFrom.mockReturnValue({
      insert: mockInsert,
    });

    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000,
    });

    vi.spyOn(ratelimitModule, 'verifyTurnstileToken').mockResolvedValue({
      success: true,
    });
  });

  function createRequest(body: Record<string, unknown>, ip = '192.168.1.10'): NextRequest {
    return new NextRequest('http://localhost:3000/api/public/enquiry', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': ip,
      },
      body: JSON.stringify(body),
    });
  }

  const validPayload = {
    name: 'Derick D’Souza',
    phone: '+919820044521',
    email: 'derick@example.com',
    eventType: 'wedding',
    eventDate: '2026-11-20',
    venue: 'St. Aloysius Chapel, Mangalore',
    guestCount: 250,
    budget: '₹2,50,000 – ₹4,00,000',
    message: 'We desire 35mm chemical film coverage along with 4K cinematography.',
    source: 'website',
    consentGiven: true,
    website_fax_code: '', // honeypot empty
    turnstileToken: 'test-token-pass',
  };

  it('1. Valid submission inserts enquiry row with consent_given_at and returns 201', async () => {
    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000,
    });
    vi.spyOn(ratelimitModule, 'verifyTurnstileToken').mockResolvedValue({
      success: true,
    });

    const req = createRequest(validPayload);
    const res = await POST(req);
    const json = await res.json();
    if (res.status !== 201) {
      console.error('Test 1 failed with:', res.status, json);
    }

    expect(res.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.enquiryId).toBe('enq-test-123');
    expect(mockFrom).toHaveBeenCalledWith('enquiries');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        guest_name: 'Derick D’Souza',
        guest_phone: '+919820044521',
        guest_email: 'derick@example.com',
        event_type: 'wedding',
        status: 'new',
        consent_given_at: expect.any(String),
      })
    );
  });

  it('2. Honeypot trap: returns silent 200 without inserting any row into the database', async () => {
    const honeypotPayload = {
      ...validPayload,
      website_fax_code: 'spambot-filled-this-field',
    };

    const req = createRequest(honeypotPayload);
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    // Database insert must NEVER be called
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('3. Turnstile failure returns 400 with security error', async () => {
    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000,
    });
    vi.spyOn(ratelimitModule, 'verifyTurnstileToken').mockResolvedValue({
      success: false,
      errorCodes: ['invalid-token'],
    });

    const req = createRequest({ ...validPayload, turnstileToken: 'invalid-token' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/security verification failed/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('4. Rate limit exceeded (5/hr/IP): 6th submission returns 429 Too Many Requests', async () => {
    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now() + 1800000,
    });

    const req = createRequest(validPayload, '10.0.0.99');
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(429);
    expect(json.error).toMatch(/rate limit exceeded/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('5. Validation failure: missing consent returns 400', async () => {
    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000,
    });

    const req = createRequest({ ...validPayload, consentGiven: false });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/consent/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('6. Validation failure: invalid non-E.164 phone returns 400', async () => {
    vi.spyOn(ratelimitModule, 'checkRateLimit').mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 3600000,
    });

    const req = createRequest({ ...validPayload, phone: '098200' });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/phone/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('7. Portfolio publication constraint (SECURITY_PLAN §10.2): strictly rejects publishing without client consent confirmed', () => {
    // Attempting to publish without consent timestamp
    const draftWithoutConsent = {
      title: 'Samantha & Derick Solemnization',
      eventType: 'wedding',
      coverImagePath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a',
      isPublished: true,
      clientConsentConfirmedAt: null,
    };

    const res = portfolioItemSchema.safeParse(draftWithoutConsent);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0]?.message).toMatch(/consent/i);
    }

    // Publishing with consent timestamp is valid
    const publishedWithConsent = {
      title: 'Samantha & Derick Solemnization',
      eventType: 'wedding',
      coverImagePath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a',
      isPublished: true,
      clientConsentConfirmedAt: '2026-02-10T10:00:00Z',
    };

    const validRes = portfolioItemSchema.safeParse(publishedWithConsent);
    expect(validRes.success).toBe(true);

    // Draft without consent is valid
    const draft = {
      title: 'Draft Work In Progress',
      eventType: 'wedding',
      coverImagePath: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a',
      isPublished: false,
    };
    expect(portfolioItemSchema.safeParse(draft).success).toBe(true);
  });
});
