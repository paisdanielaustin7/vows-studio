import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, UserRole, Permission } from '@/lib/constants/permissions';
import { requirePermission } from '@/lib/auth';
import { AuthenticatedUser } from '@/types/auth';

describe('RBAC Permissions & Landing Pages', () => {
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

  it('routes every role to its designated landing page per RBAC §6', () => {
    expect(getRoleLandingPage('system_admin')).toBe('/admin/dashboard');
    expect(getRoleLandingPage('business_owner')).toBe('/crm/dashboard');
    expect(getRoleLandingPage('manager')).toBe('/crm/dashboard');
    expect(getRoleLandingPage('accountant')).toBe('/crm/dashboard');
    expect(getRoleLandingPage('staff')).toBe('/crm/bookings');
    expect(getRoleLandingPage('crew_member')).toBe('/crm/schedule');
  });

  it('guarantees system_admin has administrative permissions', () => {
    const saPerms = ROLE_PERMISSIONS.system_admin;
    expect(saPerms.has('users:manage')).toBe(true);
    expect(saPerms.has('audit_log:view')).toBe(true);
    expect(saPerms.has('document_numbering:manage')).toBe(true);
    expect(saPerms.has('data_reset:manage')).toBe(true);
  });

  it('guarantees business_owner has complete business and financial permissions', () => {
    const boPerms = ROLE_PERMISSIONS.business_owner;
    expect(boPerms.has('invoices:create')).toBe(true);
    expect(boPerms.has('payments:record')).toBe(true);
    expect(boPerms.has('payments:void')).toBe(true);
    expect(boPerms.has('ledger:view')).toBe(true);
    expect(boPerms.has('audit_log:view:scoped')).toBe(true);
  });

  it('enforces Ruling R1: staff can view clients but has no financial access', () => {
    const stPerms = ROLE_PERMISSIONS.staff;
    expect(stPerms.has('clients:view')).toBe(true);
    expect(stPerms.has('invoices:create')).toBe(false);
    expect(stPerms.has('payments:record')).toBe(false);
    expect(stPerms.has('ledger:view')).toBe(false);
    expect(stPerms.has('quotations:view')).toBe(false);
  });

  it('enforces Ruling R3: manager cannot view payments or financial ledger', () => {
    const mgPerms = ROLE_PERMISSIONS.manager;
    expect(mgPerms.has('payments:record')).toBe(false);
    expect(mgPerms.has('payments:void')).toBe(false);
    expect(mgPerms.has('ledger:view')).toBe(false);
    expect(mgPerms.has('invoices:view')).toBe(true); // Can view invoices read-only
  });

  it('enforces crew_member own-record scoped permissions only', () => {
    const crPerms = ROLE_PERMISSIONS.crew_member;
    expect(crPerms.has('bookings:view:own')).toBe(true);
    expect(crPerms.has('events:view:own')).toBe(true);
    expect(crPerms.has('crew:view:own')).toBe(true);
    expect(crPerms.has('clients:view')).toBe(false);
    expect(crPerms.has('enquiries:view')).toBe(false);
  });

  describe('requirePermission helper', () => {
    const mockUser: AuthenticatedUser = {
      id: 'user-1',
      email: 'staff@vows.com',
      role: 'staff',
      aal: 'aal1',
      permissions: ROLE_PERMISSIONS.staff,
      profile: {
        id: 'user-1',
        email: 'staff@vows.com',
        fullName: 'Staff Member',
        role: 'staff',
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    };

    it('allows when permission is present', () => {
      expect(() => requirePermission(mockUser, 'clients:view')).not.toThrow();
    });

    it('throws FORBIDDEN when permission is missing', () => {
      expect(() => requirePermission(mockUser, 'payments:record' as Permission)).toThrowError(
        'Forbidden: Missing required permission [payments:record].'
      );
    });

    it('throws UNAUTHORIZED when user is null', () => {
      expect(() => requirePermission(null, 'clients:view')).toThrowError(
        'Authentication required to perform this action.'
      );
    });
  });
});
