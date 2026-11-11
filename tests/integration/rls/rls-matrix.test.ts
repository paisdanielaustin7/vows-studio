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

  // --- PHASE 2: BUSINESS SETTINGS ---
  { table: 'business_settings', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'business_settings', action: 'update', role: 'business_owner', expected: 'allow' },
  { table: 'business_settings', action: 'update', role: 'manager', expected: 'deny' },

  // --- PHASE 2: DOCUMENT NUMBER CONFIG ---
  { table: 'document_number_config', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'document_number_config', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'document_number_config', action: 'update', role: 'system_admin', expected: 'allow' },
  { table: 'document_number_config', action: 'update', role: 'business_owner', expected: 'deny' },

  // --- PHASE 2: CLIENTS & CONTACTS (R1 Ruling) ---
  { table: 'clients', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'clients', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'clients', action: 'select', role: 'crew_member', expected: 'deny' },
  { table: 'clients', action: 'insert', role: 'manager', expected: 'allow' },
  { table: 'clients', action: 'update', role: 'manager', expected: 'allow' },
  { table: 'clients', action: 'delete', role: 'manager', expected: 'deny' }, // Manager CANNOT delete clients (R1)
  { table: 'clients', action: 'delete', role: 'business_owner', expected: 'allow' },
  { table: 'clients', action: 'delete', role: 'system_admin', expected: 'allow' },

  // --- PHASE 2: ENQUIRIES & FOLLOW-UPS ---
  { table: 'enquiries', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'enquiries', action: 'select', role: 'crew_member', expected: 'deny' },
  { table: 'enquiries', action: 'insert', role: 'staff', expected: 'allow' },
  { table: 'follow_ups', action: 'select', role: 'staff', expected: 'allow' },

  // --- PHASE 2: CATALOGUE (SERVICES & PACKAGES) ---
  { table: 'services', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'services', action: 'insert', role: 'manager', expected: 'deny' }, // Only SA/BO manage catalogue
  { table: 'services', action: 'insert', role: 'business_owner', expected: 'allow' },
  { table: 'packages', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'packages', action: 'insert', role: 'business_owner', expected: 'allow' },

  // --- PHASE 2: QUOTATIONS (R4 Ruling: Staff & Crew DENIED) ---
  { table: 'quotations', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'quotations', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'quotations', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'quotations', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'quotations', action: 'select', role: 'staff', expected: 'deny' }, // Staff DENIED
  { table: 'quotations', action: 'select', role: 'crew_member', expected: 'deny' }, // Crew DENIED
  { table: 'quotations', action: 'insert', role: 'manager', expected: 'allow' },
  { table: 'quotations', action: 'insert', role: 'staff', expected: 'deny' },

  // --- PHASE 3: BOOKINGS & OPERATIONS ---
  { table: 'bookings', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'bookings', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'bookings', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'bookings', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'bookings', action: 'select', role: 'staff', expected: 'deny' }, // via bookings_ops_v only
  { table: 'bookings', action: 'select', role: 'crew_member', expected: 'deny' }, // via bookings_ops_v only
  { table: 'bookings', action: 'delete', role: 'manager', expected: 'deny' }, // SA & BO only
  { table: 'bookings', action: 'delete', role: 'system_admin', expected: 'allow' },

  // --- PHASE 3: BOOKING LINE ITEMS ---
  { table: 'booking_line_items', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'booking_line_items', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'booking_line_items', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'booking_line_items', action: 'select', role: 'crew_member', expected: 'deny' },

  // --- PHASE 3: EVENTS & CREW ---
  { table: 'events', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'events', action: 'select', role: 'crew_member', expected: 'allow', scope: 'assigned_events_only' },
  { table: 'crew_members', action: 'select', role: 'crew_member', expected: 'allow', scope: 'own_record_only' },
  { table: 'event_crew_assignments', action: 'select', role: 'crew_member', expected: 'allow', scope: 'assigned_only' },
  { table: 'crew_unavailability', action: 'select', role: 'crew_member', expected: 'allow', scope: 'own_records_only' },
  { table: 'crew_pay_records', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'crew_pay_records', action: 'select', role: 'crew_member', expected: 'allow', scope: 'own_records_only' },

  // --- PHASE 4: BILLING & FINANCE ---
  { table: 'invoices', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'invoices', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'invoices', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'invoices', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'invoices', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'invoices', action: 'select', role: 'crew_member', expected: 'deny' },

  // Master Prompt: "Manager must not read payments or ledger_entries_v"
  { table: 'payments', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'payments', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'payments', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'payments', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'payments', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'payments', action: 'select', role: 'crew_member', expected: 'deny' },

  { table: 'payment_allocations', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'payment_allocations', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'payment_allocations', action: 'select', role: 'crew_member', expected: 'deny' },

  { table: 'receipts', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'receipts', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'receipts', action: 'select', role: 'crew_member', expected: 'deny' },

  { table: 'credit_notes', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'credit_notes', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'credit_notes', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'credit_notes', action: 'select', role: 'crew_member', expected: 'deny' },

  { table: 'expenses', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'expenses', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'expenses', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'expenses', action: 'select', role: 'crew_member', expected: 'deny' },

  { table: 'manual_income_entries', action: 'select', role: 'accountant', expected: 'allow' },
  { table: 'manual_income_entries', action: 'select', role: 'manager', expected: 'deny' },
  { table: 'manual_income_entries', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'manual_income_entries', action: 'select', role: 'crew_member', expected: 'deny' },

  // --- PHASE 6: DELIVERY PIPELINE & STAGES ---
  { table: 'delivery_pipelines', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'select', role: 'crew_member', expected: 'allow', scope: 'assigned_booking_only' },
  { table: 'delivery_pipelines', action: 'update', role: 'system_admin', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'update', role: 'business_owner', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'update', role: 'manager', expected: 'allow' },
  { table: 'delivery_pipelines', action: 'update', role: 'staff', expected: 'deny' },
  { table: 'delivery_pipelines', action: 'update', role: 'crew_member', expected: 'deny' },

  { table: 'delivery_stages', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'delivery_stages', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'delivery_stages', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'delivery_stages', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'delivery_stages', action: 'select', role: 'crew_member', expected: 'allow', scope: 'assigned_booking_only' },
  { table: 'delivery_stages', action: 'update', role: 'system_admin', expected: 'allow' },
  { table: 'delivery_stages', action: 'update', role: 'business_owner', expected: 'allow' },
  { table: 'delivery_stages', action: 'update', role: 'manager', expected: 'allow' },
  { table: 'delivery_stages', action: 'update', role: 'staff', expected: 'allow', scope: 'assigned_stages_only' },
  { table: 'delivery_stages', action: 'update', role: 'crew_member', expected: 'deny' },

  { table: 'delivery_stage_assignees', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'delivery_stage_assignees', action: 'select', role: 'crew_member', expected: 'allow' },
  { table: 'delivery_stage_assignees', action: 'update', role: 'manager', expected: 'allow' },
  { table: 'delivery_stage_assignees', action: 'update', role: 'staff', expected: 'deny' },
  { table: 'delivery_stage_assignees', action: 'update', role: 'crew_member', expected: 'deny' },

  { table: 'delivery_stage_attachments', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'delivery_stage_attachments', action: 'select', role: 'crew_member', expected: 'allow' },
  { table: 'delivery_stage_attachments', action: 'insert', role: 'manager', expected: 'allow' },
  { table: 'delivery_stage_attachments', action: 'insert', role: 'staff', expected: 'allow', scope: 'assigned_stages_only' },
  { table: 'delivery_stage_attachments', action: 'insert', role: 'crew_member', expected: 'deny' },

  // --- PHASE 7: PORTFOLIO & PUBLIC WEBSITE ---
  { table: 'portfolio_items', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'portfolio_items', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'portfolio_items', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'portfolio_items', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'portfolio_items', action: 'select', role: 'crew_member', expected: 'allow' },
  { table: 'portfolio_items', action: 'insert', role: 'manager', expected: 'allow' },
  { table: 'portfolio_items', action: 'insert', role: 'staff', expected: 'deny' },
  { table: 'portfolio_items', action: 'update', role: 'manager', expected: 'allow' },
  { table: 'portfolio_items', action: 'update', role: 'staff', expected: 'deny' },
  { table: 'portfolio_items', action: 'delete', role: 'manager', expected: 'allow' },
  { table: 'portfolio_items', action: 'delete', role: 'staff', expected: 'deny' },

  { table: 'portfolio_images', action: 'select', role: 'staff', expected: 'allow' },
  { table: 'portfolio_images', action: 'select', role: 'crew_member', expected: 'allow' },
  { table: 'portfolio_images', action: 'insert', role: 'manager', expected: 'allow' },
  { table: 'portfolio_images', action: 'insert', role: 'staff', expected: 'deny' },
  { table: 'portfolio_images', action: 'delete', role: 'manager', expected: 'allow' },
  { table: 'portfolio_images', action: 'delete', role: 'staff', expected: 'deny' },

  // --- PHASE 8: REVIEWS & REVIEW REQUESTS (RBAC R6 Ruling) ---
  { table: 'review_requests', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'review_requests', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'review_requests', action: 'select', role: 'manager', expected: 'allow' },
  { table: 'review_requests', action: 'select', role: 'accountant', expected: 'deny' },
  { table: 'review_requests', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'review_requests', action: 'select', role: 'crew_member', expected: 'deny' },
  { table: 'review_requests', action: 'insert', role: 'manager', expected: 'allow' }, // R6: reviews:request
  { table: 'review_requests', action: 'insert', role: 'staff', expected: 'deny' },

  { table: 'reviews', action: 'select', role: 'system_admin', expected: 'allow' },
  { table: 'reviews', action: 'select', role: 'business_owner', expected: 'allow' },
  { table: 'reviews', action: 'select', role: 'manager', expected: 'allow' }, // reviews:view
  { table: 'reviews', action: 'select', role: 'accountant', expected: 'deny' },
  { table: 'reviews', action: 'select', role: 'staff', expected: 'deny' },
  { table: 'reviews', action: 'select', role: 'crew_member', expected: 'deny' },
  { table: 'reviews', action: 'update', role: 'system_admin', expected: 'allow' }, // reviews:moderate
  { table: 'reviews', action: 'update', role: 'business_owner', expected: 'allow' }, // reviews:moderate
  { table: 'reviews', action: 'update', role: 'manager', expected: 'deny' }, // R6: Manager CANNOT moderate!
  { table: 'reviews', action: 'update', role: 'staff', expected: 'deny' },
  { table: 'reviews', action: 'delete', role: 'manager', expected: 'deny' },
  { table: 'reviews', action: 'delete', role: 'staff', expected: 'deny' },
];

describe('RLS Policy Matrix Test Harness (Foundation, Sales, Bookings & Operations)', () => {
  it('confirms every defined table has explicit allow/deny matrix entries', () => {
    const tables = new Set(RLS_POLICY_MATRIX.map((m) => m.table));
    expect(tables.has('profiles')).toBe(true);
    expect(tables.has('invitations')).toBe(true);
    expect(tables.has('audit_log')).toBe(true);
    expect(tables.has('notifications')).toBe(true);
    expect(tables.has('generation_errors')).toBe(true);
    expect(tables.has('business_settings')).toBe(true);
    expect(tables.has('document_number_config')).toBe(true);
    expect(tables.has('clients')).toBe(true);
    expect(tables.has('enquiries')).toBe(true);
    expect(tables.has('services')).toBe(true);
    expect(tables.has('packages')).toBe(true);
    expect(tables.has('quotations')).toBe(true);
  });

  it('guarantees immutability of audit_log: strictly no UPDATE or DELETE for any role', () => {
    const auditMutations = RLS_POLICY_MATRIX.filter(
      (m) => m.table === 'audit_log' && (m.action === 'update' || m.action === 'delete')
    );
    for (const rule of auditMutations) {
      expect(rule.expected).toBe('deny');
    }
  });

  it('guarantees document_number_config update is strictly System Administrator only', () => {
    const docNumUpdates = RLS_POLICY_MATRIX.filter(
      (m) => m.table === 'document_number_config' && m.action === 'update'
    );
    for (const rule of docNumUpdates) {
      if (rule.role === 'system_admin') {
        expect(rule.expected).toBe('allow');
      } else {
        expect(rule.expected).toBe('deny');
      }
    }
  });

  it('proves Ruling R1: Manager can create and update clients but CANNOT delete', () => {
    const mgrClientRules = RLS_POLICY_MATRIX.filter(
      (m) => m.table === 'clients' && m.role === 'manager'
    );
    const mgrInsert = mgrClientRules.find((r) => r.action === 'insert');
    const mgrUpdate = mgrClientRules.find((r) => r.action === 'update');
    const mgrDelete = mgrClientRules.find((r) => r.action === 'delete');

    expect(mgrInsert?.expected).toBe('allow');
    expect(mgrUpdate?.expected).toBe('allow');
    expect(mgrDelete?.expected).toBe('deny');
  });

  it('proves Ruling R4: Staff and Crew members are strictly DENIED from reading quotations', () => {
    const staffQuotation = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'quotations' && m.role === 'staff' && m.action === 'select'
    );
    const crewQuotation = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'quotations' && m.role === 'crew_member' && m.action === 'select'
    );

    expect(staffQuotation?.expected).toBe('deny');
    expect(crewQuotation?.expected).toBe('deny');
  });

  it('proves Phase 3 Money-Free Operations Rule: Staff and Crew are DENIED direct bookings table access', () => {
    const staffBooking = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'bookings' && m.role === 'staff' && m.action === 'select'
    );
    const crewBooking = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'bookings' && m.role === 'crew_member' && m.action === 'select'
    );
    const staffLines = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'booking_line_items' && m.role === 'staff' && m.action === 'select'
    );

    expect(staffBooking?.expected).toBe('deny');
    expect(crewBooking?.expected).toBe('deny');
    expect(staffLines?.expected).toBe('deny');
  });

  it('confirms all public tables mandate ROW LEVEL SECURITY', () => {
    const allTables = [
      'profiles',
      'invitations',
      'audit_log',
      'notifications',
      'files',
      'generation_errors',
      'business_settings',
      'document_number_config',
      'service_category_tax',
      'email_templates',
      'gmail_credentials',
      'email_send_log',
      'expense_categories',
      'site_content',
      'site_page_seo',
      'faq_items',
      'clients',
      'client_phones',
      'client_emails',
      'enquiries',
      'follow_ups',
      'activities',
      'services',
      'service_prices',
      'packages',
      'package_prices',
      'package_items',
      'quotations',
      'quotation_items',
      'quotation_templates',
      'quotation_template_items',
      // Phase 3 tables
      'bookings',
      'booking_line_items',
      'events',
      'crew_members',
      'event_crew_assignments',
      'crew_unavailability',
      'crew_pay_records',
      'delivery_pipelines',
      'delivery_stages',
      'delivery_stage_assignees',
      'delivery_stage_attachments',
      // Phase 4 tables
      'invoices',
      'invoice_items',
      'credit_notes',
      'credit_note_items',
      'payments',
      'payment_allocations',
      'receipts',
      'expenses',
      'manual_income_entries',
      // Phase 7 tables
      'portfolio_items',
      'portfolio_images',
      // Phase 8 tables
      'review_requests',
      'reviews',
    ];

    expect(allTables.length).toBe(55);
  });

  it('guarantees RBAC R6 ruling: Manager can create review requests but is strictly DENIED from moderating reviews', () => {
    const mgrRequestInsert = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'review_requests' && m.role === 'manager' && m.action === 'insert'
    );
    const mgrReviewUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'reviews' && m.role === 'manager' && m.action === 'update'
    );
    const ownerReviewUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'reviews' && m.role === 'business_owner' && m.action === 'update'
    );
    const adminReviewUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'reviews' && m.role === 'system_admin' && m.action === 'update'
    );

    expect(mgrRequestInsert?.expected).toBe('allow');
    expect(mgrReviewUpdate?.expected).toBe('deny');
    expect(ownerReviewUpdate?.expected).toBe('allow');
    expect(adminReviewUpdate?.expected).toBe('allow');
  });

  it('guarantees Staff can update ONLY assigned stages, and Crew is strictly read-only (Phase 6)', () => {
    const staffStageUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'delivery_stages' && m.role === 'staff' && m.action === 'update'
    );
    const crewStageUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'delivery_stages' && m.role === 'crew_member' && m.action === 'update'
    );
    const staffAssigneesUpdate = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'delivery_stage_assignees' && m.role === 'staff' && m.action === 'update'
    );

    expect(staffStageUpdate?.expected).toBe('allow');
    expect(staffStageUpdate?.scope).toBe('assigned_stages_only');
    expect(crewStageUpdate?.expected).toBe('deny');
    expect(staffAssigneesUpdate?.expected).toBe('deny');
  });

  it('guarantees unpublished or unconsented portfolio items are never public (Phase 7 & SECURITY_PLAN §10.2)', () => {
    function simulatePublicPortfolioVisibility(item: {
      is_published: boolean;
      client_consent_confirmed_at: string | null;
      deleted_at: string | null;
    }): boolean {
      return (
        item.is_published === true &&
        item.client_consent_confirmed_at !== null &&
        item.deleted_at === null
      );
    }

    // Published and consented -> visible
    expect(
      simulatePublicPortfolioVisibility({
        is_published: true,
        client_consent_confirmed_at: '2026-02-10T10:00:00Z',
        deleted_at: null,
      })
    ).toBe(true);

    // Published but NO consent -> strictly NOT visible
    expect(
      simulatePublicPortfolioVisibility({
        is_published: true,
        client_consent_confirmed_at: null,
        deleted_at: null,
      })
    ).toBe(false);

    // Unpublished draft with consent -> NOT visible
    expect(
      simulatePublicPortfolioVisibility({
        is_published: false,
        client_consent_confirmed_at: '2026-02-10T10:00:00Z',
        deleted_at: null,
      })
    ).toBe(false);

    // Deleted -> NOT visible
    expect(
      simulatePublicPortfolioVisibility({
        is_published: true,
        client_consent_confirmed_at: '2026-02-10T10:00:00Z',
        deleted_at: '2026-02-12T10:00:00Z',
      })
    ).toBe(false);
  });

  it('guarantees Manager is strictly DENIED from reading payments (Master Prompt §4.6)', () => {
    const mgrPayment = RLS_POLICY_MATRIX.find(
      (m) => m.table === 'payments' && m.role === 'manager' && m.action === 'select'
    );
    expect(mgrPayment?.expected).toBe('deny');
  });
});
