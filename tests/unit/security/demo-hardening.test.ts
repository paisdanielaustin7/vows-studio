import { describe, it, expect, vi, afterEach } from 'vitest';
import { isDemoModeVerified, assertRuntimeBootGuard } from '@/lib/env';

describe('Decision D-32 Demo Environment Hardening & Boot Guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows MFA bypass ONLY when both server and public mode equal demo and ref matches', () => {
    expect(
      isDemoModeVerified({
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo-proj-123.supabase.co',
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'demo',
        ALLOWED_SUPABASE_PROJECT_REF: 'demo-proj-123',
      })
    ).toBe(true);

    // Must fail if server is production while public claims demo
    expect(
      isDemoModeVerified({
        NEXT_PUBLIC_SUPABASE_URL: 'https://demo-proj-123.supabase.co',
        APP_MODE: 'production',
        NEXT_PUBLIC_APP_MODE: 'demo',
        ALLOWED_SUPABASE_PROJECT_REF: 'demo-proj-123',
      })
    ).toBe(false);

    // Must fail if connected project ref belongs to production
    expect(
      isDemoModeVerified({
        NEXT_PUBLIC_SUPABASE_URL: 'https://prod-proj-999.supabase.co',
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'demo',
        ALLOWED_SUPABASE_PROJECT_REF: 'demo-proj-123',
      })
    ).toBe(false);
  });

  it('halts boot when ALLOWED_SUPABASE_PROJECT_REF mismatches connected URL', () => {
    expect(() =>
      assertRuntimeBootGuard({
        NEXT_PUBLIC_SUPABASE_URL: 'https://wrong-supabase.supabase.co',
        ALLOWED_SUPABASE_PROJECT_REF: 'expected-supabase',
      })
    ).toThrow(/Supabase project mismatch/);
  });

  it('prevents split-brain APP_MODE vs NEXT_PUBLIC_APP_MODE startup', () => {
    expect(() =>
      assertRuntimeBootGuard({
        APP_MODE: 'demo',
        NEXT_PUBLIC_APP_MODE: 'production',
      })
    ).toThrow(/Mode mismatch/);
  });
});
