import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { UserRole } from '@/lib/constants/permissions';
import { assertRuntimeBootGuard, isDemoModeVerified } from '@/lib/env';

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // Refresh session via Supabase SSR client
  let user = null;
  let userRole: UserRole | null = null;
  let aal: 'aal1' | 'aal2' = 'aal1';

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

    const { data: authData } = await supabase.auth.getUser();
    user = authData?.user || null;

    if (user) {
      // Read top-level user_role claim injected by app.custom_access_token_hook via getClaims()
      let claimRole: string | undefined;
      try {
        const { data: claimsData } = await supabase.auth.getClaims();
        const claims = claimsData?.claims as Record<string, unknown> | undefined;
        if (typeof claims?.user_role === 'string') {
          claimRole = claims.user_role;
        }
        if (claims?.aal === 'aal2') {
          aal = 'aal2';
        }
      } catch {
        // Fallback handled below
      }

      userRole = (claimRole ||
        user.app_metadata?.user_role ||
        user.user_metadata?.role ||
        'staff') as UserRole;

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
    }
  }

  // Apply Security Headers and Cache-Control
  if (pathname.startsWith('/crm') || pathname.startsWith('/admin')) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
  }

  // 1. Signed-out users accessing protected routes
  const isCrmRoute = pathname.startsWith('/crm');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMfaRoute = pathname.startsWith('/mfa');
  const isPublicRoute = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (!user) {
    if (isCrmRoute || isAdminRoute || isMfaRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Allow public or auth page
    if (isPublicRoute) {
      return response;
    }
    return response;
  }

  // 2. Signed-in users accessing auth pages (/login, /forgot-password, /reset-password)
  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const isInvitePage = pathname.startsWith('/invite/');

  if (isAuthPage && !isInvitePage) {
    const landing = getRoleLandingPage(userRole || 'staff');
    return NextResponse.redirect(new URL(landing, request.url));
  }

  // 3. MFA enforcement for system_admin and business_owner (Decision D-02 & D-32 demo bypass)
  const isMfaMandatory = userRole === 'system_admin' || userRole === 'business_owner';
  const mfaSatisfied = aal === 'aal2' || isDemoModeVerified();
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

    // Business Owner scoped audit log: BO only
    if (pathname.startsWith('/crm/audit-log')) {
      if (userRole !== 'business_owner') {
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
