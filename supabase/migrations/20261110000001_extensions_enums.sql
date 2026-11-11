-- VOWS Studio — Migration 001: Extensions and Canonical Enums
-- Specs: DATABASE_SCHEMA §2, GLOSSARY_AND_ENUMS §2, §3, §4

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Enums
CREATE TYPE user_role AS ENUM (
  'system_admin',
  'business_owner',
  'manager',
  'accountant',
  'staff',
  'crew_member'
);

CREATE TYPE enquiry_status AS ENUM (
  'new',
  'contacted',
  'quoted',
  'negotiating',
  'converted',
  'lost',
  'junk'
);

CREATE TYPE quotation_status AS ENUM (
  'draft',
  'sent',
  'accepted',
  'rejected',
  'superseded'
);

CREATE TYPE booking_status AS ENUM (
  'confirmed',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE invoice_status AS ENUM (
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'cancelled'
);

CREATE TYPE credit_note_status AS ENUM (
  'issued',
  'cancelled'
);

CREATE TYPE payment_status AS ENUM (
  'recorded',
  'voided'
);

CREATE TYPE delivery_stage_status AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'blocked'
);

CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

CREATE TYPE crew_pay_status AS ENUM (
  'unpaid',
  'partially_paid',
  'paid'
);

CREATE TYPE follow_up_status AS ENUM (
  'open',
  'done'
);

CREATE TYPE email_send_status AS ENUM (
  'sent',
  'failed'
);

CREATE TYPE gmail_connection_status AS ENUM (
  'connected',
  'needs_reconnect',
  'disconnected'
);

CREATE TYPE event_type AS ENUM (
  'wedding',
  'pre_wedding',
  'engagement',
  'mehendi',
  'haldi',
  'reception',
  'portrait',
  'birthday',
  'corporate',
  'other'
);

CREATE TYPE enquiry_source AS ENUM (
  'website',
  'instagram',
  'facebook',
  'google',
  'referral',
  'walk_in',
  'other'
);

CREATE TYPE crew_role AS ENUM (
  'photographer',
  'videographer',
  'drone_operator',
  'editor',
  'assistant',
  'coordinator',
  'other'
);

CREATE TYPE crew_type AS ENUM (
  'employee',
  'freelancer'
);

CREATE TYPE event_assignment_role AS ENUM (
  'lead_photographer',
  'second_photographer',
  'lead_videographer',
  'second_videographer',
  'drone_operator',
  'assistant',
  'coordinator',
  'other'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'upi',
  'bank_transfer',
  'cheque',
  'other'
);

CREATE TYPE service_category AS ENUM (
  'photography',
  'videography',
  'drone',
  'album',
  'editing',
  'travel',
  'miscellaneous'
);

CREATE TYPE service_unit AS ENUM (
  'per_event',
  'per_day',
  'per_hour',
  'per_unit'
);

CREATE TYPE discount_type AS ENUM (
  'percent',
  'fixed'
);

CREATE TYPE document_type AS ENUM (
  'quotation',
  'invoice',
  'receipt',
  'booking',
  'credit_note'
);

CREATE TYPE delivery_stage_code AS ENUM (
  'raw_import',
  'culling',
  'editing',
  'client_preview',
  'revisions',
  'final_export',
  'quality_check',
  'delivery',
  'completed'
);

CREATE TYPE tax_type AS ENUM (
  'none',
  'cgst_sgst',
  'igst'
);

CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'soft_delete',
  'restore',
  'delete',
  'login_success',
  'login_failure',
  'mfa_success',
  'mfa_failure',
  'password_change',
  'password_reset',
  'role_change',
  'lockout',
  'unlock',
  'gst_toggle',
  'gmail_connect',
  'gmail_disconnect',
  'data_reset',
  'setup_lock'
);
