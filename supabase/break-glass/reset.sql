-- ==============================================================================
-- VOWS STUDIO — MANUAL BREAK-GLASS DATABASE DATA RESET PROCEDURE
-- ==============================================================================
-- Reference: SECURITY_PLAN §12.5, DECISION_LOG D-43
--
-- CAUTION:
-- This script is strictly for MANUAL, EMERGENCY use by the Supabase Project Owner
-- via the Supabase SQL Editor. It CANNOT and MUST NOT be called through the application.
--
-- PRE-CONDITIONS BEFORE EXECUTING:
-- 1. Take a full manual database logical backup or export via the Supabase Dashboard.
-- 2. Ensure written sign-off from the Business Owner and System Administrator.
-- 3. Record an incident note in the offline security log with timestamp, operator,
--    and justification.
-- ==============================================================================

BEGIN;

-- 1. Set the transaction-local reset flag to bypass immutability triggers
SET LOCAL app.reset_in_progress = 'on';

-- 2. Delete data in strict dependency order (Bottom to Top)
-- Delivery & Reviews
DELETE FROM public.reviews;
DELETE FROM public.review_requests;
DELETE FROM public.delivery_stage_attachments;
DELETE FROM public.delivery_stage_assignees;
DELETE FROM public.delivery_stages;
DELETE FROM public.delivery_pipelines;

-- Billing, Receipts & Payments
DELETE FROM public.receipts;
DELETE FROM public.payment_allocations;
DELETE FROM public.payments;
DELETE FROM public.credit_note_items;
DELETE FROM public.credit_notes;
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;

-- Expenses & Income
DELETE FROM public.expenses;
DELETE FROM public.manual_income_entries;
DELETE FROM public.crew_pay_payments;
DELETE FROM public.crew_pay_records;

-- Bookings, Events & Crew
DELETE FROM public.event_crew_assignments;
DELETE FROM public.events;
DELETE FROM public.booking_line_items;
DELETE FROM public.bookings;
DELETE FROM public.crew_unavailability;
DELETE FROM public.crew_members;

-- Quotations & Enquiries
DELETE FROM public.quotation_items;
DELETE FROM public.quotations;
DELETE FROM public.quotation_template_items;
DELETE FROM public.quotation_templates;
DELETE FROM public.follow_ups;
DELETE FROM public.enquiries;

-- Clients
DELETE FROM public.client_phones;
DELETE FROM public.client_emails;
DELETE FROM public.clients;

-- Catalogue (Optional: comment out if preserving catalogue)
DELETE FROM public.package_items;
DELETE FROM public.package_prices;
DELETE FROM public.packages;
DELETE FROM public.service_prices;
DELETE FROM public.services;

-- Portfolio & Marketing
DELETE FROM public.portfolio_images;
DELETE FROM public.portfolio_items;
DELETE FROM public.faq_items;

-- Notifications & Activity
DELETE FROM public.notifications;
DELETE FROM public.activities;
DELETE FROM public.email_send_log;

-- 3. Reset document numbering sequences to 0 (so next document starts at 000001)
UPDATE app.document_sequences SET last_value = 0;

-- 4. Re-enable setup mode on business_settings
UPDATE public.business_settings
SET setup_mode = true,
    setup_locked_at = NULL,
    updated_at = now()
WHERE id = 1;

-- 5. Record mandatory break-glass audit entry
INSERT INTO public.audit_log (
  action,
  table_name,
  record_id,
  new_values
) VALUES (
  'data_reset',
  'business_settings',
  '00000000-0000-0000-0000-000000000001'::uuid,
  jsonb_build_object(
    'procedure', 'manual_break_glass_sql',
    'executed_at', now(),
    'reset_in_progress', 'completed'
  )
);

COMMIT;
-- ==============================================================================
-- BREAK-GLASS PROCEDURE COMPLETE
-- Verify counts: SELECT count(*) FROM public.bookings; (should be 0)
-- ==============================================================================
