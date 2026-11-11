import { describe, it, expect } from 'vitest';
import {
  validateEnv,
  extractSupabaseProjectRef,
  assertRuntimeBootGuard,
  isDemoModeVerified,
} from './env';

describe('lib/env — Environment Validation & Boot Guard (D-32)', () => {
  const validBaseEnv = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://vows-prod-ref.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    APP_MODE: 'production',
    NEXT_PUBLIC_APP_MODE: 'production',
  };

  it('validates a correct environment successfully', () => {
    const env = validateEnv(validBaseEnv);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://vows-prod-ref.supabase.co');
    expect(env.APP_MODE).toBe('production');
  });

  it('fails fast on missing required variables', () => {
    expect(() => validateEnv({})).toThrow(/Missing or invalid environment variables/);
  });

  it('extracts Supabase project ref correctly', () => {
    expect(extractSupabaseProjectRef('https://myproject.supabase.co')).toBe('myproject');
    expect(extractSupabaseProjectRef('http://localhost:54321')).toBe('');
    expect(extractSupabaseProjectRef('invalid-url')).toBe('');
  });

  it('enforces Boot Guard when ALLOWED_SUPABASE_PROJECT_REF matches', () => {
    const env = validateEnv({
      ...validBaseEnv,
      ALLOWED_SUPABASE_PROJECT_REF: 'vows-prod-ref',
    });
    expect(env.ALLOWED_SUPABASE_PROJECT_REF).toBe('vows-prod-ref');
  });

  it('halts with fatal error when ALLOWED_SUPABASE_PROJECT_REF mismatches', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        ALLOWED_SUPABASE_PROJECT_REF: 'wrong-ref',
      })
    ).toThrow(/\[BOOT GUARD FATAL\] Supabase project mismatch/);
  });

  it('validates GOOGLE_TOKEN_ENCRYPTION_KEY format (64-char hex)', () => {
    expect(() =>
      validateEnv({
        ...validBaseEnv,
        GOOGLE_TOKEN_ENCRYPTION_KEY: 'invalid-non-hex',
      })
    ).toThrow(/GOOGLE_TOKEN_ENCRYPTION_KEY must be a 64-character hex string/);

    const validKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const env = validateEnv({
      ...validBaseEnv,
      GOOGLE_TOKEN_ENCRYPTION_KEY: validKey,
    });
    expect(env.GOOGLE_TOKEN_ENCRYPTION_KEY).toBe(validKey);
  });

  it('rejects mode split-brain mismatch between APP_MODE and NEXT_PUBLIC_APP_MODE', () => {
    expect(() =>
      assertRuntimeBootGuard({
        ...validBaseEnv,
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'production',
      })
    ).toThrow(/Mode mismatch/);
  });

  it('verifies demo mode strictly only on exact match with ALLOWED_SUPABASE_PROJECT_REF', () => {
    expect(isDemoModeVerified(validBaseEnv)).toBe(false);

    expect(
      isDemoModeVerified({
        NEXT_PUBLIC_SUPABASE_URL: 'https://vows-demo-ref.supabase.co',
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'demo',
        ALLOWED_SUPABASE_PROJECT_REF: 'vows-demo-ref',
      })
    ).toBe(true);

    expect(
      isDemoModeVerified({
        NEXT_PUBLIC_SUPABASE_URL: 'https://vows-prod-ref.supabase.co',
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'demo',
        ALLOWED_SUPABASE_PROJECT_REF: 'vows-demo-ref',
      })
    ).toBe(false);
  });
});
