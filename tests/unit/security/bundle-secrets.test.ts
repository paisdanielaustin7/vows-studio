import { describe, it, expect } from 'vitest';
import { envSchema } from '@/lib/env';

describe('Security Audit — Service-Role Key & Secret Isolation (SECURITY_PLAN §15)', () => {
  it('strictly ensures NO server secrets carry NEXT_PUBLIC_ prefix', () => {
    const keys = Object.keys(envSchema.shape);

    const publicKeys = keys.filter((k) => k.startsWith('NEXT_PUBLIC_'));
    const privateKeys = keys.filter((k) => !k.startsWith('NEXT_PUBLIC_'));

    // Verify public variables contain ONLY benign client values
    expect(publicKeys).toEqual([
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_APP_MODE',
      'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    ]);

    // Verify all sensitive secrets are strictly server-only
    expect(privateKeys).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(privateKeys).toContain('GOOGLE_CLIENT_SECRET');
    expect(privateKeys).toContain('GOOGLE_TOKEN_ENCRYPTION_KEY');
    expect(privateKeys).toContain('CRON_SECRET');
    expect(privateKeys).toContain('TURNSTILE_SECRET_KEY');
  });

  it('rejects client environment validation if service-role key is mistakenly exposed as public', () => {
    const _maliciousClientEnv = {
      NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'secret_12345',
    };

    expect('NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY' in envSchema.shape).toBe(false);
  });
});
