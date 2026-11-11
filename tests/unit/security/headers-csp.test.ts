import { describe, it, expect } from 'vitest';
import nextConfig from '@/next.config.mjs';

describe('Security Audit — HTTP Security Headers & Content Security Policy (SECURITY_PLAN §7.1, §15)', () => {
  it('configures all mandatory baseline security headers across all routes', async () => {
    expect(nextConfig.headers).toBeDefined();
    const headersConfig = await nextConfig.headers!();

    const globalRoute = headersConfig.find((h: any) => h.source === '/(.*)');
    expect(globalRoute).toBeDefined();

    const headerMap: Record<string, string> = {};
    for (const h of globalRoute!.headers) {
      headerMap[h.key] = h.value;
    }

    // 1. Anti-MIME sniffing
    expect(headerMap['X-Content-Type-Options']).toBe('nosniff');

    // 2. Clickjacking protection
    expect(headerMap['X-Frame-Options']).toBe('DENY');

    // 3. HSTS
    expect(headerMap['Strict-Transport-Security']).toContain('max-age=31536000');
    expect(headerMap['Strict-Transport-Security']).toContain('includeSubDomains');

    // 4. Referrer Policy
    expect(headerMap['Referrer-Policy']).toBe('strict-origin-when-cross-origin');

    // 5. Permissions Policy
    expect(headerMap['Permissions-Policy']).toContain('camera=()');
    expect(headerMap['Permissions-Policy']).toContain('microphone=()');
    expect(headerMap['Permissions-Policy']).toContain('geolocation=()');

    // 6. Cross-Origin Opener Policy
    expect(headerMap['Cross-Origin-Opener-Policy']).toBe('same-origin');

    // 7. Content Security Policy
    const csp = headerMap['Content-Security-Policy'];
    expect(csp).toBeDefined();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it('enforces private, no-store cache control on all authenticated CRM and Admin routes', async () => {
    const headersConfig = await nextConfig.headers!();

    const crmRoute = headersConfig.find((h: any) => h.source === '/crm/:path*');
    expect(crmRoute).toBeDefined();
    const crmCacheControl = crmRoute!.headers.find((h: any) => h.key === 'Cache-Control');
    expect(crmCacheControl?.value).toBe('private, no-store, must-revalidate');

    const adminRoute = headersConfig.find((h: any) => h.source === '/admin/:path*');
    expect(adminRoute).toBeDefined();
    const adminCacheControl = adminRoute!.headers.find((h: any) => h.key === 'Cache-Control');
    expect(adminCacheControl?.value).toBe('private, no-store, must-revalidate');
  });
});
