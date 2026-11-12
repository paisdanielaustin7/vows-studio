import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockGetClaims = vi.fn();
const mockGetSession = vi.fn();
const mockGetAuthenticatorAssuranceLevel = vi.fn();
const mockProfileMaybeSingle = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
      getClaims: mockGetClaims,
      getSession: mockGetSession,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel,
      },
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockProfileMaybeSingle,
        })),
      })),
    })),
  })),
}));

import { proxy } from '@/proxy';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('Real proxy() JWT claims, profiles RLS fallback, and MFA verification', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.stubEnv('APP_MODE', 'production');
    vi.stubEnv('NEXT_PUBLIC_APP_MODE', 'production');

    mockGetUser.mockReset();
    mockGetClaims.mockReset();
    mockGetSession.mockReset();
    mockGetAuthenticatorAssuranceLevel.mockReset();
    mockProfileMaybeSingle.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('allows system_admin with AAL2 from getClaims() across /admin/* and /crm/dashboard', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: {}, user_metadata: {} } },
    });
    mockGetClaims.mockResolvedValue({
      data: { claims: { user_role: 'system_admin', aal: 'aal2' } },
      error: null,
    });

    for (const path of [
      '/admin/dashboard',
      '/admin/users',
      '/admin/audit-log',
      '/crm/dashboard',
      '/crm/audit-log',
    ]) {
      const res = await proxy(new NextRequest(`https://vows.test${path}`));
      expect(res.status).toBe(200);
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('falls back to verified session JWT & public.profiles when getClaims() fails or omits user_role (never degrades SA to staff/403)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: {}, user_metadata: {} } },
    });
    mockGetClaims.mockResolvedValue({
      data: null,
      error: new Error('JWKS fetch failed'),
    });
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: makeJwt({ aal: 'aal2' }) } },
      error: null,
    });
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal2' },
    });
    mockProfileMaybeSingle.mockResolvedValue({
      data: { role: 'system_admin', is_active: true },
      error: null,
    });

    const crmRes = await proxy(new NextRequest('https://vows.test/crm/dashboard'));
    expect(crmRes.status).toBe(200);
    expect(crmRes.headers.get('location')).toBeNull();

    const adminRes = await proxy(new NextRequest('https://vows.test/admin/users'));
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers.get('location')).toBeNull();
  });

  it('redirects system_admin at AAL1 to /mfa rather than /403', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'admin-1', app_metadata: {}, user_metadata: {} } },
    });
    mockGetClaims.mockResolvedValue({
      data: { claims: { user_role: 'system_admin', aal: 'aal1' } },
      error: null,
    });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({
      data: { currentLevel: 'aal1' },
    });

    const res = await proxy(new NextRequest('https://vows.test/admin/dashboard'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://vows.test/mfa');
  });

  it('fails closed to /login when user profile is deactivated or role cannot be resolved', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-x', app_metadata: {}, user_metadata: {} } },
    });
    mockGetClaims.mockResolvedValue({ data: { claims: {} }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: 'aal1' } });
    mockProfileMaybeSingle.mockResolvedValue({
      data: { role: 'staff', is_active: false },
      error: null,
    });

    const inactiveRes = await proxy(new NextRequest('https://vows.test/crm/dashboard'));
    expect(inactiveRes.status).toBe(307);
    expect(inactiveRes.headers.get('location')).toBe('https://vows.test/login?error=account_inactive');

    mockProfileMaybeSingle.mockResolvedValue({ data: null, error: null });
    const missingRoleRes = await proxy(new NextRequest('https://vows.test/crm/dashboard'));
    expect(missingRoleRes.status).toBe(307);
    expect(missingRoleRes.headers.get('location')).toBe(
      'https://vows.test/login?redirectTo=%2Fcrm%2Fdashboard'
    );
  });
});
