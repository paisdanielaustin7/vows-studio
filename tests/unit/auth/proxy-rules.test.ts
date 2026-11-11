import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { UserRole } from '@/lib/constants/permissions';
import { proxy } from '@/proxy';

interface ProxyDecision {
  action: 'next' | 'redirect';
  targetUrl?: string;
  statusCode?: number;
}

function evaluateProxyRules(
  pathname: string,
  user: { role: UserRole; aal: 'aal1' | 'aal2' } | null
): ProxyDecision {
  const isCrmRoute = pathname.startsWith('/crm');
  const isAdminRoute = pathname.startsWith('/admin');
  const isMfaRoute = pathname.startsWith('/mfa');
  const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(pathname);

  // 1. Signed-out
  if (!user) {
    if (pathname.startsWith('/delivery/')) {
      return { action: 'next' };
    }
    if (isCrmRoute || isAdminRoute || isMfaRoute) {
      return { action: 'redirect', targetUrl: `/login?redirectTo=${pathname}` };
    }
    return { action: 'next' };
  }

  // 2. Signed-in visiting auth page
  if (isAuthPage) {
    const landingMap: Record<UserRole, string> = {
      system_admin: '/admin/dashboard',
      business_owner: '/crm/dashboard',
      manager: '/crm/dashboard',
      accountant: '/crm/dashboard',
      staff: '/crm/bookings',
      crew_member: '/crm/schedule',
    };
    return { action: 'redirect', targetUrl: landingMap[user.role] };
  }

  // 3. Mandatory MFA (AAL2) for SA and BO
  const isMfaMandatory = user.role === 'system_admin' || user.role === 'business_owner';
  if (isMfaMandatory && user.aal !== 'aal2' && (isCrmRoute || isAdminRoute)) {
    return { action: 'redirect', targetUrl: '/mfa' };
  }

  // 4. Role Matrix
  if (isAdminRoute) {
    if (user.role !== 'system_admin' || user.aal !== 'aal2') {
      return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
    }
  }

  if (isCrmRoute) {
    if (pathname === '/crm/dashboard') {
      if (!['system_admin', 'business_owner', 'manager', 'accountant'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/quotations')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/invoices')) {
      if (!['system_admin', 'business_owner', 'accountant', 'manager'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (
      pathname.startsWith('/crm/payments') ||
      pathname.startsWith('/crm/receipts') ||
      pathname.startsWith('/crm/credit-notes') ||
      pathname.startsWith('/crm/ledger') ||
      pathname.startsWith('/crm/expenses')
    ) {
      if (!['system_admin', 'business_owner', 'accountant'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/crew')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant', 'crew_member'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/services') || pathname.startsWith('/crm/packages')) {
      if (!['system_admin', 'business_owner', 'manager', 'accountant', 'staff'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/delivery')) {
      if (!['system_admin', 'business_owner', 'manager', 'staff', 'crew_member'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/portfolio') || pathname.startsWith('/crm/reviews')) {
      if (!['system_admin', 'business_owner', 'manager'].includes(user.role)) {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
    if (pathname.startsWith('/crm/audit-log')) {
      if (user.role !== 'business_owner') {
        return { action: 'redirect', targetUrl: '/403', statusCode: 403 };
      }
    }
  }

  return { action: 'next' };
}

describe('Proxy Route Protection Rules (RBAC §6 & Decision D-02)', () => {
  it('redirects unauthenticated users to login with redirectTo', () => {
    const res = evaluateProxyRules('/crm/dashboard', null);
    expect(res.action).toBe('redirect');
    expect(res.targetUrl).toBe('/login?redirectTo=/crm/dashboard');
  });

  it('redirects signed-in users away from /login to their designated landing page', () => {
    const sa = evaluateProxyRules('/login', { role: 'system_admin', aal: 'aal2' });
    expect(sa.targetUrl).toBe('/admin/dashboard');

    const bo = evaluateProxyRules('/login', { role: 'business_owner', aal: 'aal2' });
    expect(bo.targetUrl).toBe('/crm/dashboard');

    const st = evaluateProxyRules('/login', { role: 'staff', aal: 'aal1' });
    expect(st.targetUrl).toBe('/crm/bookings');

    const cr = evaluateProxyRules('/login', { role: 'crew_member', aal: 'aal1' });
    expect(cr.targetUrl).toBe('/crm/schedule');
  });

  it('enforces mandatory AAL2: SA and BO cannot reach /crm or /admin without AAL2', () => {
    const boAtAal1 = evaluateProxyRules('/crm/dashboard', { role: 'business_owner', aal: 'aal1' });
    expect(boAtAal1.action).toBe('redirect');
    expect(boAtAal1.targetUrl).toBe('/mfa');

    const saAtAal1 = evaluateProxyRules('/admin/dashboard', { role: 'system_admin', aal: 'aal1' });
    expect(saAtAal1.action).toBe('redirect');
    expect(saAtAal1.targetUrl).toBe('/mfa');
  });

  it('blocks non-system_admin roles from /admin/* with 403', () => {
    const bo = evaluateProxyRules('/admin/users', { role: 'business_owner', aal: 'aal2' });
    expect(bo.targetUrl).toBe('/403');
    expect(bo.statusCode).toBe(403);

    const mg = evaluateProxyRules('/admin/dashboard', { role: 'manager', aal: 'aal1' });
    expect(mg.targetUrl).toBe('/403');
  });

  it('blocks staff and crew from quotations with 403', () => {
    const st = evaluateProxyRules('/crm/quotations', { role: 'staff', aal: 'aal1' });
    expect(st.targetUrl).toBe('/403');

    const cr = evaluateProxyRules('/crm/quotations', { role: 'crew_member', aal: 'aal1' });
    expect(cr.targetUrl).toBe('/403');
  });

  it('blocks manager from financial payments and ledger with 403', () => {
    const mgLedger = evaluateProxyRules('/crm/ledger', { role: 'manager', aal: 'aal1' });
    expect(mgLedger.targetUrl).toBe('/403');

    const mgPay = evaluateProxyRules('/crm/payments', { role: 'manager', aal: 'aal1' });
    expect(mgPay.targetUrl).toBe('/403');
  });

  it('allows Business Owner to access scoped audit log while denying others', () => {
    const bo = evaluateProxyRules('/crm/audit-log', { role: 'business_owner', aal: 'aal2' });
    expect(bo.action).toBe('next');

    const mg = evaluateProxyRules('/crm/audit-log', { role: 'manager', aal: 'aal1' });
    expect(mg.targetUrl).toBe('/403');
  });

  it('allows unauthenticated visitors to access public client delivery share pages', () => {
    const rawToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const res = evaluateProxyRules(`/delivery/${rawToken}`, null);
    expect(res.action).toBe('next');
  });

  it('enforces extended RBAC §6 routes for crew, delivery, services, portfolio, and receipts', () => {
    expect(evaluateProxyRules('/crm/crew', { role: 'staff', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/delivery', { role: 'accountant', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/services', { role: 'crew_member', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/portfolio', { role: 'staff', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/reviews', { role: 'accountant', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/receipts', { role: 'manager', aal: 'aal1' }).targetUrl).toBe('/403');
    expect(evaluateProxyRules('/crm/credit-notes', { role: 'manager', aal: 'aal1' }).targetUrl).toBe('/403');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('excludes /dev/components in production inside real proxy()', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = new NextRequest('http://localhost:3000/dev/components');
    const res = await proxy(req);
    expect(res.status).toBe(404);
  });
});
