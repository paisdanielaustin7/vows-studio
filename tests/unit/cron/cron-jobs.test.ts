import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyCronSecret } from '@/lib/cron/auth';
import { GET as demoResetHandler } from '@/app/api/cron/demo-reset/route';

describe('Vercel Cron Jobs & Authentication Security', () => {
  const originalSecret = process.env.CRON_SECRET;
  const originalMode = process.env.APP_MODE;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret-12345';
    process.env.APP_MODE = 'production';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
    process.env.APP_MODE = originalMode;
  });

  it('rejects cron requests without Authorization header or query token', () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily-digest');
    expect(verifyCronSecret(req)).toBe(false);
  });

  it('rejects cron requests with incorrect Authorization header', () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily-digest', {
      headers: { authorization: 'Bearer wrong-secret' },
    });
    expect(verifyCronSecret(req)).toBe(false);
  });

  it('authenticates cron request with matching Bearer token in header', () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily-digest', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });
    expect(verifyCronSecret(req)).toBe(true);
  });

  it('authenticates cron request with matching query parameter token', () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily-digest?token=test-cron-secret-12345');
    expect(verifyCronSecret(req)).toBe(true);
  });

  it('safely skips demo reset when instance is not in demo mode', async () => {
    process.env.APP_MODE = 'production';
    const req = new NextRequest('http://localhost:3000/api/cron/demo-reset', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });
    const res = await demoResetHandler(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.skipped).toBe(true);
    expect(body.reason).toContain('not running in demo mode');
  });

  it('refuses demo reset execution when secret is unauthorized', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/demo-reset', {
      headers: { authorization: 'Bearer invalid' },
    });
    const res = await demoResetHandler(req);
    expect(res.status).toBe(401);
  });
});
