import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { UserRole } from '@/lib/constants/permissions';
import { assertRuntimeBootGuard, isDemoModeVerified } from '@/lib/env';

const VALID_USER_ROLES = new Set<UserRole>([
  'system_admin',
  'business_owner',
  'manager',
  'accountant',
  'staff',
  'crew_member',
]);

function isValidUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && VALID_USER_ROLES.has(value as UserRole);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// Module-level JWKS cache (10-minute TTL) avoids fetching /.well-known/jwks.json per navigation
let jwksCache: { url: string; keys: Record<string, unknown>[]; expiresAt: number } | null = null;

async function getCachedJwks(
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ keys: Record<string, unknown>[] } | undefined> {
  if (process.env.VITEST) return undefined;
  const now = Date.now();
  if (jwksCache && jwksCache.url === supabaseUrl && jwksCache.expiresAt > now) {
    return { keys: jwksCache.keys };
  }
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/.well-known/jwks.json`, {
      headers: { apikey: supabaseKey },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return undefined;
    const data = (await res.json()) as { keys?: Record<string, unknown>[] };
    if (Array.isArray(data?.keys) && data.keys.length > 0) {
      jwksCache = { url: supabaseUrl, keys: data.keys, expiresAt: now + 10 * 60 * 1000 };
      return { keys: data.keys };
    }
  } catch {
    // Fallback handled by getClaims / getUser
  }
  return undefined;
}

function getRoleLandingPage(role: UserRole): string {
  switch (role) {
    case 'system_admin':
      return '/admin/dashboard';
    case 'business_owner':
    case 'manager':
    case 'accountant':
      return '/crm/dashboard';
    case 'staff':
      return '/crm/bookings';
    case 'crew_member':
      return '/crm/schedule';
    default:
      return '/login';
  }
}

// Routes allowed without authentication
const PUBLIC_PREFIXES = [
  '/',
  '/portfolio',
  '/services',
  '/about',
  '/contact',
  '/reviews',
  '/faq',
  '/privacy',
  '/terms',
  '/review/',
  '/delivery/',
  '/auth/callback',
  '/dev/components',
  '/sitemap.xml',
  '/robots.txt',
  '/api/public',
  '/favicon.ico',
];

const AUTH_PAGES = [
  '/login',
  '/forgot-password',
  '/reset-password',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Enforce Decision D-32 Boot Guard at runtime
  assertRuntimeBootGuard();

  // Exclude /dev/components in production (Master Prompt Phase 0 Task 3)
  if (pathname.startsWith('/dev') && process.env.NODE_ENV === 'production') {
    return NextResponse.rewrite(new URL('/not-found', request.url), { status: 404 });
  }

  // Static assets and internal next.js endpoints bypass proxy
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|css|js|ico|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Create response object for cookie pass-through
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Classify route early so purely public pages skip Supabase Auth network latency
  const isCrmRoute = pathname.startsWith('/crm');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMfaRoute = pathname.startsWith('/mfa');
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isInvitePage = pathname.startsWith('/invite/');
  const isPublicRoute = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  const needsSessionCheck =
    isCrmRoute || isAdminRoute || isMfaRoute || (isAuthPage && !isInvitePage);

  // Apply Security Headers and Cache-Control
  if (isCrmRoute || isAdminRoute) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  if (!needsSessionCheck) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Verify session via cryptographic getClaims() first (~1ms with cached JWKS), falling back to getUser()
  let hasVerifiedUser = false;
  let userRole: UserRole | null = null;
  let aal: 'aal1' | 'aal2' = 'aal1';
  let isDeactivated = false;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    let claimRole: UserRole | null = null;
    let claimUserId: string | null = null;

    try {
      const jwks = await getCachedJwks(supabaseUrl, supabaseKey);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: claimsData } = await (supabase.auth as any).getClaims(
        undefined,
        jwks ? { jwks } : undefined
      );
      const claims = claimsData?.claims as Record<string, unknown> | undefined;
      if (claims) {
        if (typeof claims.sub === 'string' && claims.sub) {
          claimUserId = claims.sub;
        }
        if (isValidUserRole(claims.user_role)) {
          claimRole = claims.user_role;
        }
        if (claims.aal === 'aal2') {
          aal = 'aal2';
        }
      }
    } catch {
      // Fallback handled below
    }

    // Fast path: asymmetric JWT verified cryptographically with cached JWKS & user_role claim present
    if (claimUserId && claimRole && !isAuthPage) {
      hasVerifiedUser = true;
      userRole = claimRole;
    } else {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user || null;

      if (user) {
        hasVerifiedUser = true;

        // Decode session access token payload if getClaims() missed JWKS or claims were unavailable
        if (!claimRole || aal !== 'aal2') {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData?.session?.access_token;
            if (accessToken) {
              const payload = decodeJwtPayload(accessToken);
              if (!claimRole && isValidUserRole(payload?.user_role)) {
                claimRole = payload.user_role;
              }
              if (payload?.aal === 'aal2') {
                aal = 'aal2';
              }
            }
          } catch {
            // Fallback handled below
          }
        }

        // Check MFA assurance level via getAuthenticatorAssuranceLevel if still needed
        if (aal !== 'aal2') {
          try {
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalData?.currentLevel === 'aal2') {
              aal = 'aal2';
            }
          } catch {
            aal = 'aal1';
          }
        }

        // Authoritative DB fallback via user-scoped RLS (profiles__select__self) if JWT claim absent
        if (!claimRole) {
          try {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('role, is_active')
              .eq('id', user.id)
              .maybeSingle();

            if (profileRow) {
              if (profileRow.is_active === false) {
                isDeactivated = true;
              } else if (isValidUserRole(profileRow.role)) {
                claimRole = profileRow.role;
              }
            }
          } catch {
            // Fallback handled below
          }
        }

        const appMetaRole = isValidUserRole(user.app_metadata?.user_role)
          ? user.app_metadata.user_role
          : null;
        const userMetaRole = isValidUserRole(user.user_metadata?.role)
          ? user.user_metadata.role
          : null;

        userRole = claimRole || appMetaRole || userMetaRole;
      }
    }
  }

  if (!hasVerifiedUser || isDeactivated) {
    if (isCrmRoute || isAdminRoute || isMfaRoute) {
      const loginUrl = new URL('/login', request.url);
      if (isDeactivated) {
        loginUrl.searchParams.set('error', 'account_inactive');
      } else {
        loginUrl.searchParams.set('redirectTo', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (isPublicRoute) {
      return response;
    }
    return response;
  }

  // If authenticated user's role could not be determined from claims or profile, fail closed to /login
  if (!userRole) {
    if (isCrmRoute || isAdminRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return response;
  }

  const isMfaMandatory = userRole === 'system_admin' || userRole === 'business_owner';
  const mfaSatisfied = aal === 'aal2' || isDemoModeVerified();

  if (isAuthPage && !isInvitePage) {
    if (isMfaMandatory && !mfaSatisfied) {
      return NextResponse.redirect(new URL('/mfa', request.url));
    }
    const landing = getRoleLandingPage(userRole);
    return NextResponse.redirect(new URL(landing, request.url));
  }

  // 3. MFA enforcement for system_admin and business_owner (Decision D-02 & D-32 demo bypass)
  if (isMfaMandatory && !mfaSatisfied && (isCrmRoute || isAdminRoute)) {
    // If not aal2 (and not verified demo), redirect to MFA challenge or enroll
    return NextResponse.redirect(new URL('/mfa', request.url));
  }

  // 4. Role-based route access matrix (RBAC_PERMISSIONS.md §6)
  if (isAdminRoute) {
    if (userRole !== 'system_admin' || !mfaSatisfied) {
      return NextResponse.redirect(new URL('/403', request.url));
    }
  }

  if (isCrmRoute) {
    // Dashboard: SA, BO, MG, AC
    if (pathname === '/crm/dashboard') {
      if (!['system_admin', 'business_owner', 'manager', 'accountant'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Quotations: SA, BO, MG, AC
    if (pathname.startsWith('/crm/quotations')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Finance routes: Payments, Receipts, Credit Notes, Ledger, Expenses (SA, BO, AC only)
    const isFinanceRoute =
      pathname.startsWith('/crm/payments') ||
      pathname.startsWith('/crm/receipts') ||
      pathname.startsWith('/crm/credit-notes') ||
      pathname.startsWith('/crm/ledger') ||
      pathname.startsWith('/crm/expenses');

    if (isFinanceRoute) {
      if (!['system_admin', 'business_owner', 'accountant'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Invoices: SA, BO, AC, plus MG read-only
    if (pathname.startsWith('/crm/invoices')) {
      if (!['system_admin', 'business_owner', 'accountant', 'manager'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Clients & Enquiries: SA, BO, MG, AC, ST (not crew)
    if (pathname.startsWith('/crm/clients') || pathname.startsWith('/crm/enquiries')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant', 'staff'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Crew Directory & Profiles: SA, BO, MG, AC, CR (own) (not staff)
    if (pathname.startsWith('/crm/crew')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant', 'crew_member'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Services & Packages Catalogue: SA, BO, MG, AC, ST (not crew)
    if (pathname.startsWith('/crm/services') || pathname.startsWith('/crm/packages')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant', 'staff'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Delivery Pipeline: SA, BO, MG, ST, CR (not accountant)
    if (pathname.startsWith('/crm/delivery')) {
      if (!['system_admin', 'business_owner', 'manager', 'staff', 'crew_member'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Portfolio & Reviews Moderation: SA, BO, MG (not accountant, staff, crew)
    if (pathname.startsWith('/crm/portfolio') || pathname.startsWith('/crm/reviews')) {
      if (!['system_admin', 'business_owner', 'manager'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Audit log: SA and BO
    if (pathname.startsWith('/crm/audit-log')) {
      if (!['system_admin', 'business_owner'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }

    // Settings: SA, BO (numbering config is SA only)
    if (pathname.startsWith('/crm/settings')) {
      if (!['system_admin', 'business_owner'].includes(userRole || '')) {
        return NextResponse.redirect(new URL('/403', request.url));
      }
    }
  }

  return response;
}
