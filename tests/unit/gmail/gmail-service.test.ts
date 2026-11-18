import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildMimeMessage, encodeBase64Url } from '@/lib/gmail/mime';

// Mock Supabase admin client
const mockSendLogs: any[] = [];
let mockCredentials: any = {
  id: 1,
  google_email: 'vowsbyreuben@gmail.com',
  from_name: 'VOWS by Reuben',
  reply_to: 'contact@vowsstudio.com',
  access_token_enc: 'v1:k1:mock_encrypted_access_token',
  refresh_token_enc: 'v1:k1:mock_encrypted_refresh_token',
  token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
  status: 'connected',
};

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: (table: string) => {
      if (table === 'email_send_log') {
        return {
          select: () => ({
            eq: (_col: string, val: any) => ({
              maybeSingle: async () => {
                const found = mockSendLogs.find((l) => l.idempotency_key === val);
                return { data: found || null, error: null };
              },
            }),
            gte: () => ({
              eq: () => ({
                count: mockSendLogs.filter((l) => l.status === 'sent').length,
              }),
            }),
          }),
          upsert: async (row: any) => {
            const idx = mockSendLogs.findIndex((l) => l.idempotency_key === row.idempotency_key);
            if (idx >= 0) {
              mockSendLogs[idx] = { ...mockSendLogs[idx], ...row };
            } else {
              mockSendLogs.push(row);
            }
            return { error: null };
          },
        };
      }
      if (table === 'gmail_credentials') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: mockCredentials, error: null }),
            }),
          }),
          upsert: async (row: any) => {
            mockCredentials = { ...mockCredentials, ...row };
            return { error: null };
          },
          update: (updates: any) => ({
            eq: async () => {
              mockCredentials = { ...mockCredentials, ...updates };
              return { error: null };
            },
          }),
        };
      }
      return {};
    },
  }),
}));

vi.mock('@/lib/gmail/oauth', () => ({
  getValidAccessToken: async () => {
    if (!mockCredentials || mockCredentials.status === 'disconnected') {
      throw new Error('Gmail is not connected');
    }
    return {
      accessToken: 'valid-test-access-token-123',
      senderEmail: mockCredentials.google_email,
      fromName: mockCredentials.from_name,
      replyTo: mockCredentials.reply_to,
    };
  },
  disconnectGmail: async () => {
    mockCredentials.status = 'disconnected';
  },
}));

import { sendEmailService } from '@/server/services/email.service';

describe('Gmail Transmission Service & RFC 2822 MIME (Phase 5)', () => {
  beforeEach(() => {
    mockSendLogs.length = 0;
    mockCredentials.status = 'connected';
    vi.restoreAllMocks();
  });

  it('builds RFC 2822 MIME message with base64 PDF attachment and UTF-8 subject', () => {
    const pdfBytes = Buffer.from('%PDF-1.4 sample pdf content');
    const mime = buildMimeMessage({
      from: 'vowsbyreuben@gmail.com',
      fromName: 'VOWS by Reuben',
      to: 'client@example.com',
      replyTo: 'contact@vowsstudio.com',
      subject: 'Quotation QT-2026-000001 ₹ 1,50,000',
      htmlBody: '<p>Please find attached your quotation.</p>',
      attachment: {
        filename: 'Quotation-QT-2026-000001.pdf',
        content: pdfBytes,
        contentType: 'application/pdf',
      },
    });

    expect(mime).toContain('From: "VOWS by Reuben" <vowsbyreuben@gmail.com>');
    expect(mime).toContain('To: client@example.com');
    expect(mime).toContain('Reply-To: contact@vowsstudio.com');
    expect(mime).toContain('multipart/mixed');
    expect(mime).toContain('Content-Type: application/pdf; name="Quotation-QT-2026-000001.pdf"');
    expect(mime).toContain(pdfBytes.toString('base64'));

    const b64url = encodeBase64Url(mime);
    expect(b64url).not.toContain('+');
    expect(b64url).not.toContain('/');
    expect(b64url).not.toContain('=');
  });

  it('guarantees idempotency: double-click transmission sends to Gmail API only once', async () => {
    let apiCallCount = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('gmail.googleapis.com')) {
        apiCallCount++;
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'gmail-msg-unique-9988' }),
        };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const idempotencyKey = 'unique-send-req-12345';
    const params = {
      to: 'client@example.com',
      subject: 'Tax Invoice INV-2026-0001',
      htmlBody: '<p>Invoice details</p>',
      idempotencyKey,
    };

    // First click: sends to Google API
    const res1 = await sendEmailService(params, 'user-actor-1');
    expect(res1.messageId).toBe('gmail-msg-unique-9988');
    expect(apiCallCount).toBe(1);

    // Second click with same idempotency key (double-click simulation)
    const res2 = await sendEmailService(params, 'user-actor-1');
    expect(res2.messageId).toBe('gmail-msg-unique-9988');
    // API must NOT have been called a second time
    expect(apiCallCount).toBe(1);
  });

  it('retries on 5xx server errors with exponential backoff and succeeds', async () => {
    let callAttempts = 0;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('gmail.googleapis.com')) {
        callAttempts++;
        if (callAttempts === 1) {
          return { ok: false, status: 503, text: async () => 'Service Temporarily Unavailable' };
        }
        return { ok: true, status: 200, json: async () => ({ id: 'gmail-msg-retry-success' }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const res = await sendEmailService(
      {
        to: 'client@example.com',
        subject: 'Receipt RCP-2026-001',
        htmlBody: '<p>Payment confirmed</p>',
        idempotencyKey: 'retry-test-key-555',
      },
      'user-actor-1'
    );

    expect(callAttempts).toBe(2);
    expect(res.messageId).toBe('gmail-msg-retry-success');
  });

  it('handles permanent failures by recording failure and suggesting manual PDF download', async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('gmail.googleapis.com')) {
        return { ok: false, status: 400, text: async () => 'Invalid recipient address' };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    const idempotencyKey = 'failing-test-key-999';
    await expect(
      sendEmailService(
        {
          to: 'invalid-address',
          subject: 'Quotation',
          htmlBody: '<p>Hello</p>',
          idempotencyKey,
        },
        'user-actor-1'
      )
    ).rejects.toThrow('Please download PDF directly');

    const logEntry = mockSendLogs.find((l) => l.idempotency_key === idempotencyKey);
    expect(logEntry).toBeDefined();
    expect(logEntry.status).toBe('failed');
    expect(logEntry.error).toContain('400');
  });

  it('guarantees tokens never appear in logs or client payloads', async () => {
    global.fetch = vi.fn().mockImplementation(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 'msg-leak-check' }),
    }));

    const result = await sendEmailService(
      {
        to: 'privacy-check@example.com',
        subject: 'Quotation',
        htmlBody: '<p>Text</p>',
        idempotencyKey: 'privacy-key-111',
      },
      'user-actor-1'
    );

    const resultString = JSON.stringify(result);
    expect(resultString).not.toContain('valid-test-access-token-123');
    expect(resultString).not.toContain('mock_encrypted');

    const logString = JSON.stringify(mockSendLogs);
    expect(logString).not.toContain('valid-test-access-token-123');
    expect(logString).not.toContain('mock_encrypted');
  });

  it('simulates email dispatch in demo mode without hitting Google Gmail API (D-32)', async () => {
    vi.stubEnv('APP_MODE', 'demo');
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy;

    const result = await sendEmailService(
      {
        to: 'demo-client@demo.email',
        subject: 'Demo Quotation QT-2026-0001',
        htmlBody: '<p>Demo email</p>',
        idempotencyKey: 'demo-send-key-777',
      },
      'demo-actor-1'
    );

    expect(result.messageId).toMatch(/^demo-/);
    expect(fetchSpy).not.toHaveBeenCalled();

    const logEntry = mockSendLogs.find((l) => l.idempotency_key === 'demo-send-key-777');
    expect(logEntry).toBeDefined();
    expect(logEntry.sender_email).toBe('hello@luminastudio.demo');
    vi.unstubAllEnvs();
  });
});
