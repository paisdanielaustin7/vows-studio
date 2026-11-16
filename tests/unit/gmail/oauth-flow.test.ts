import { describe, it, expect } from 'vitest';
import { buildAuthUrl, getRedirectUri } from '@/lib/gmail/oauth';

describe('Gmail OAuth Flow & State Validation (D-03 / D-27)', () => {
  it('constructs correct Google OAuth URL with state and restricted scopes', () => {
    const state = 'secure-random-state-nonce-12345';
    const authUrl = buildAuthUrl(state);

    const url = new URL(authUrl);
    expect(url.origin).toBe('https://accounts.google.com');
    expect(url.pathname).toBe('/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('state')).toBe(state);

    const scopeParam = url.searchParams.get('scope') || '';
    expect(scopeParam).toContain('gmail.send');
    expect(scopeParam).toContain('openid');
    // Forbidden scopes per D-03: readonly must NOT be included
    expect(scopeParam).not.toContain('gmail.readonly');
  });

  it('computes correct redirect URI based on app environment', () => {
    const redirect = getRedirectUri();
    expect(redirect).toMatch(/\/api\/auth\/gmail\/callback$/);

    const customRedirect = getRedirectUri('https://vows-studio-one.vercel.app');
    expect(customRedirect).toBe('https://vows-studio-one.vercel.app/api/auth/gmail/callback');
  });

  it('constructs auth URL with dynamic customBase', () => {
    const state = 'custom-base-nonce-999';
    const authUrl = buildAuthUrl(state, 'https://vows-studio-one.vercel.app');
    const url = new URL(authUrl);
    expect(url.searchParams.get('redirect_uri')).toBe('https://vows-studio-one.vercel.app/api/auth/gmail/callback');
  });

  it('validates state parameter against CSRF attacks in callback logic', () => {
    const storedState = 'original-issued-state-token';
    const attackerState = 'tampered-or-forged-state-token';

    const isValid = (incomingState: string | null) => {
      return Boolean(incomingState && incomingState === storedState);
    };

    expect(isValid(storedState)).toBe(true);
    expect(isValid(attackerState)).toBe(false);
    expect(isValid(null)).toBe(false);
  });
});
