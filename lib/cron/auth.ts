import { NextRequest } from 'next/server';

/**
 * Validates CRON_SECRET header or query token for Vercel Cron jobs.
 * Reference: SECURITY_PLAN §10.5, BUSINESS_WORKFLOWS §4
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In local dev/test without CRON_SECRET, permit execution
    return process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  const tokenParam = req.nextUrl.searchParams.get('token');
  if (tokenParam && tokenParam === cronSecret) {
    return true;
  }

  return false;
}
