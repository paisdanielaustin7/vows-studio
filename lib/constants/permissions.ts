/**
 * VOWS — Role-Based Access Control Permissions Map
 * Generated from RBAC_PERMISSIONS.md §3 and §3.5 Rulings R1-R7
 */

export type UserRole =
  | 'system_admin'
  | 'business_owner'
  | 'manager'
  | 'accountant'
  | 'staff'
  | 'crew_member';

export type Permission =
  // Identity & Admin
  | 'users:manage'
  | 'users:update:self'
  | 'audit_log:view'
  | 'audit_log:view:scoped'
  | 'business_settings:view'
  | 'business_settings:update'
  | 'document_numbering:manage'
  | 'integrations:manage'
  | 'system:view'
  | 'data_reset:manage'
  | 'notifications:own'
  // Clients & Enquiries
  | 'clients:view'
  | 'clients:create'
  | 'clients:update'
  | 'clients:delete'
  | 'clients:export'
  | 'enquiries:view'
  | 'enquiries:create'
  | 'enquiries:update'
  | 'enquiries:delete'
  | 'enquiries:export'
  | 'follow_ups:view'
  | 'follow_ups:manage'
  // Quotations
  | 'quotations:view'
  | 'quotations:create'
  | 'quotations:update'
  | 'quotations:delete'
  | 'quotations:send'
  | 'quotations:approve'
  | 'quotation_templates:manage'
  // Bookings & Operations
  | 'bookings:view'
  | 'bookings:view:own'
  | 'bookings:view:nomoney'
  | 'bookings:create'
  | 'bookings:update'
  | 'bookings:delete'
  | 'bookings:cancel'
  | 'bookings:reopen'
  | 'events:view'
  | 'events:view:own'
  | 'events:manage'
  | 'crew_assignments:manage'
  | 'crew_conflict:override'
  | 'crew:view'
  | 'crew:manage'
  | 'crew:view:own'
  | 'crew:bank_details:view'
  | 'crew_unavailability:manage'
  | 'crew_unavailability:own'
  | 'crew_pay:view'
  | 'crew_pay:manage'
  | 'services:view'
  | 'services:manage'
  | 'delivery:view'
  | 'delivery:view:own'
  | 'delivery:manage'
  | 'delivery:update:assigned'
  | 'delivery:override'
  | 'reviews:request'
  | 'reviews:moderate'
  | 'reviews:view'
  | 'portfolio:view'
  | 'portfolio:manage'
  // Finance
  | 'invoices:view'
  | 'invoices:create'
  | 'invoices:update'
  | 'invoices:cancel'
  | 'invoices:send'
  | 'invoices:export'
  | 'payments:record'
  | 'payments:void'
  | 'payments:reallocate'
  | 'receipts:manage'
  | 'credit_notes:manage'
  | 'ledger:view'
  | 'expenses:view'
  | 'expenses:manage'
  | 'expenses:export'
  | 'manual_income:manage'
  | 'reports:view'
  // Dashboards
  | 'dashboard:financial'
  | 'dashboard:operations'
  | 'dashboard:view';

export const ROLE_PERMISSIONS: Record<UserRole, Set<Permission>> = {
  system_admin: new Set<Permission>([
    'users:manage',
    'users:update:self',
    'audit_log:view',
    'business_settings:view',
    'business_settings:update',
    'document_numbering:manage',
    'integrations:manage',
    'system:view',
    'data_reset:manage',
    'notifications:own',
    'clients:view',
    'clients:create',
    'clients:update',
    'clients:delete',
    'clients:export',
    'enquiries:view',
    'enquiries:create',
    'enquiries:update',
    'enquiries:delete',
    'enquiries:export',
    'follow_ups:view',
    'follow_ups:manage',
    'quotations:view',
    'quotations:create',
    'quotations:update',
    'quotations:delete',
    'quotations:send',
    'quotations:approve',
    'quotation_templates:manage',
    'bookings:view',
    'bookings:create',
    'bookings:update',
    'bookings:delete',
    'bookings:cancel',
    'bookings:reopen',
    'events:view',
    'events:manage',
    'crew_assignments:manage',
    'crew_conflict:override',
    'crew:view',
    'crew:manage',
    'crew:bank_details:view',
    'crew_unavailability:manage',
    'crew_pay:view',
    'crew_pay:manage',
    'services:view',
    'services:manage',
    'delivery:view',
    'delivery:manage',
    'delivery:override',
    'reviews:request',
    'reviews:moderate',
    'reviews:view',
    'portfolio:view',
    'portfolio:manage',
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:cancel',
    'invoices:send',
    'invoices:export',
    'payments:record',
    'payments:void',
    'payments:reallocate',
    'receipts:manage',
    'credit_notes:manage',
    'ledger:view',
    'expenses:view',
    'expenses:manage',
    'expenses:export',
    'manual_income:manage',
    'reports:view',
    'dashboard:financial',
    'dashboard:operations',
    'dashboard:view',
  ]),

  business_owner: new Set<Permission>([
    'users:update:self',
    'audit_log:view:scoped',
    'business_settings:view',
    'business_settings:update',
    'integrations:manage',
    'notifications:own',
    'clients:view',
    'clients:create',
    'clients:update',
    'clients:delete',
    'clients:export',
    'enquiries:view',
    'enquiries:create',
    'enquiries:update',
    'enquiries:delete',
    'enquiries:export',
    'follow_ups:view',
    'follow_ups:manage',
    'quotations:view',
    'quotations:create',
    'quotations:update',
    'quotations:delete',
    'quotations:send',
    'quotations:approve',
    'quotation_templates:manage',
    'bookings:view',
    'bookings:create',
    'bookings:update',
    'bookings:delete',
    'bookings:cancel',
    'bookings:reopen',
    'events:view',
    'events:manage',
    'crew_assignments:manage',
    'crew_conflict:override',
    'crew:view',
    'crew:manage',
    'crew:bank_details:view',
    'crew_unavailability:manage',
    'crew_pay:view',
    'crew_pay:manage',
    'services:view',
    'services:manage',
    'delivery:view',
    'delivery:manage',
    'delivery:override',
    'reviews:request',
    'reviews:moderate',
    'reviews:view',
    'portfolio:view',
    'portfolio:manage',
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:cancel',
    'invoices:send',
    'invoices:export',
    'payments:record',
    'payments:void',
    'payments:reallocate',
    'receipts:manage',
    'credit_notes:manage',
    'ledger:view',
    'expenses:view',
    'expenses:manage',
    'expenses:export',
    'manual_income:manage',
    'reports:view',
    'dashboard:financial',
    'dashboard:operations',
    'dashboard:view',
  ]),

  manager: new Set<Permission>([
    'users:update:self',
    'notifications:own',
    'clients:view',
    'clients:create', // R2 ruling
    'clients:update',
    'clients:export',
    'enquiries:view',
    'enquiries:create',
    'enquiries:update',
    'enquiries:delete',
    'enquiries:export',
    'follow_ups:view',
    'follow_ups:manage',
    'quotations:view',
    'quotations:create',
    'quotations:update',
    'quotations:send',
    'quotations:approve',
    'quotation_templates:manage',
    'bookings:view',
    'bookings:create',
    'bookings:update',
    'bookings:cancel',
    'events:view',
    'events:manage',
    'crew_assignments:manage',
    'crew_conflict:override',
    'crew:view',
    'crew:manage',
    'crew_unavailability:manage',
    'crew_pay:view',
    'services:view',
    'delivery:view',
    'delivery:manage',
    'reviews:request', // R6 ruling
    'reviews:view',
    'portfolio:view',
    'invoices:view', // R3 ruling: view only
    'dashboard:operations',
    'dashboard:view',
  ]),

  accountant: new Set<Permission>([
    'users:update:self',
    'notifications:own',
    'clients:view',
    'enquiries:view',
    'follow_ups:view',
    'quotations:view', // R4 ruling: view only
    'bookings:view', // R4 ruling: view only
    'events:view',
    'crew:view',
    'crew:bank_details:view',
    'crew_unavailability:manage',
    'crew_pay:view',
    'crew_pay:manage',
    'services:view',
    'invoices:view',
    'invoices:create',
    'invoices:update',
    'invoices:cancel',
    'invoices:send',
    'invoices:export',
    'payments:record',
    'payments:void',
    'payments:reallocate',
    'receipts:manage',
    'credit_notes:manage',
    'ledger:view',
    'expenses:view',
    'expenses:manage',
    'expenses:export',
    'manual_income:manage',
    'reports:view',
    'dashboard:financial',
    'dashboard:view',
  ]),

  staff: new Set<Permission>([
    'users:update:self',
    'notifications:own',
    'clients:view', // R1 ruling
    'enquiries:view',
    'bookings:view:nomoney', // No money columns
    'events:view',
    'services:view',
    'delivery:view',
    'delivery:update:assigned', // only assigned stages
  ]),

  crew_member: new Set<Permission>([
    'users:update:self',
    'notifications:own',
    'bookings:view:own',
    'events:view:own',
    'crew:view:own',
    'crew_unavailability:own',
    'delivery:view:own',
  ]),
};
