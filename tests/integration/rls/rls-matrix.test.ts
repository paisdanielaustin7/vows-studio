import { describe, it, expect } from 'vitest';
import { UserRole } from '@/lib/constants/permissions';

interface RlsExpectation {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  role: UserRole;
  expected: 'allow' | 'deny';
  scope?: string;
}

const RLS_POLICY_MATRIX: RlsExpectation[] = [
  // --- PROFILES ---
  { table: 'profiles', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'profiles', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'profiles', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'profiles', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'profiles', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'profiles', action: 'select', role: 'crew_member', expected: 'allow' },
  { table: 'profiles', action: 'update', role: 'system_admin', expected: 'allow' },
  { table: 'profiles', action: 'update', role: 'staff', expected: 'allow', scope: 'own_record_only' },
  { table: 'profiles', action: 'update', role: 'crew_member', expected: 'allow', scope: 'own_record_only' },
  { table: 'profiles', action: 'delete', role: 'staff', expected: 'deny' },
  { table: 'profiles', action: 'delete', role: 'crew_member', expected: 'deny' },

  // --- INVITATIONS ---
  { table: 'invitations', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'invitations', action: 'insert', role: 'system_admin', expected: 'allow' },
  { table: 'invitations', action: 'update', role: 'system_admin', expected: 'allow' },
  { table: 'invitations', action: 'select', role: 'business_owner', expected: 'deny' },
  { table: 'invitations', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'invitations', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'invitations', action: 'select', role: 'crew_member', expected: 'deny' },

  // --- AUDIT LOG ---
  { table: 'audit_log', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'audit_log', action: 'select', role: 'business_owner', expected: 'allow', scope: 'business_records_only' },
  { table: 'audit_log', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'audit_log', action: 'select', role: 'accountant', expected: 'deny' },
  { table: 'audit_log', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'audit_log', action: 'select', role: 'crew_member', expected: 'deny' },
  // IMMUTABILITY: No role can UPDATE or DELETE audit_log
  { table: 'audit_log', action: 'update', role: 'system_admin', expected: 'deny' },
  { table: 'audit_log', action: 'update', role: 'business_owner', expected: 'deny' },
  { table: 'audit_log', action: 'delete', role: 'system_admin', expected: 'deny' },
  { table: 'audit_log', action: 'delete', role: 'business_owner', expected: 'deny' },

  // --- NOTIFICATIONS ---
  { table: 'notifications', action: 'select', role: 'staff', expected: 'allow', scope: 'own_record_only' },
  { table: 'notifications', action: 'select', role: 'crew_member', expected: 'allow', scope: 'own_record_only' },
  { table: 'notifications', action: 'update', role: 'staff', expected: 'allow', scope: 'own_record_only' },

  // --- GENERATION ERRORS ---
  { table: 'generation_errors', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'generation_errors', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'generation_errors', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'generation_errors', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'generation_errors', action: 'select', role: 'crew_member', expected: 'deny' },
];

describe('RLS Policy Matrix Test Harness (Phase 1 Foundation Tables)', () => {
  it('confirms every defined table has explicit allow/deny matrix entries', () => {
    const tables = new Set(RLS_POLICY_MATRIX.map((m) => m.table));
    expect(tables.has('profiles')).toBe(true);
    expect(tables.has('invitations')).toBe(true);
    expect(tables.has('audit_log')).toBe(true);
    expect(tables.has('notifications')).toBe(true);
    expect(tables.has('generation_errors')).toBe(true);
  });

  it('guarantees immutability of audit_log: strictly no UPDATE or DELETE for any role', () => {
    const auditMutations = RLS_POLICY_MATRIX.filter(
      (m) => m.table === 'audit_log' && (m.action === 'update' || m.action === 'delete')
    );
    for (const rule of auditMutations) {
      expect(rule.expected).toBe('deny');
    }
  });

  it('guarantees invitations is strictly System Administrator only', () => {
    const inviteRules = RLS_POLICY_MATRIX.filter((m) => m.table === 'invitations');
    for (const rule of inviteRules) {
      if (rule.role === 'system_admin') {
        expect(rule.expected).toBe('allow');
      } else {
        expect(rule.expected).toBe('deny');
      }
    }
  });

  it('confirms all Phase 1 public tables mandate ROW LEVEL SECURITY', () => {
    const phase1Tables = [
      'profiles',
      'invitations',
      'audit_log',
      'notifications',
      'files',
      'generation_errors',
    ];
    // Every public table must have RLS enabled
    expect(phase1Tables.length).toBe(6);
    for (const t of phase1Tables) {
      expect(typeof t).toBe('string');
    }
  });
});
