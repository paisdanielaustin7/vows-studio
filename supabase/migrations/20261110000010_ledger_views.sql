-- Migration 010: Ledger Views and Financial Analytics
-- Strictly obeys DECISION_LOG D-23, D-24, and DATABASE_SCHEMA §11.

-- 1. Invoices View with Derived Overdue Status & Balances (D-24, INV-03)
CREATE OR REPLACE VIEW public.invoices_v AS
SELECT
  i.*,
  c.full_name AS client_name,
  b.booking_number,
  (i.total_paise - i.paid_paise - i.credited_paise) AS balance_paise,
  CASE
    WHEN i.status = 'cancelled' THEN 'cancelled'
    WHEN i.status IN ('sent', 'partially_paid')
         AND i.due_date < CURRENT_DATE
         AND (i.total_paise - i.paid_paise - i.credited_paise) > 0
    THEN 'overdue'
    ELSE i.status::text
  END AS display_status
FROM public.invoices i
JOIN public.clients c ON i.client_id = c.id
JOIN public.bookings b ON i.booking_id = b.id;

-- 2. General Ledger View (D-23: UNION ALL of payments, manual income, expenses)
-- There is no duplicate ledger_entries table so ledger cannot drift from its sources.
CREATE OR REPLACE VIEW public.ledger_entries_v AS
-- Non-voided invoice payments (Income)
SELECT
  p.id,
  p.payment_date AS entry_date,
  'income' AS type,
  'invoice_payment' AS category,
  p.amount_paise,
  'invoice_payment' AS source,
  'payment' AS reference_type,
  p.id AS reference_id,
  COALESCE(p.notes, 'Invoice Payment Receipt') AS description,
  p.method AS payment_method,
  p.reference_number,
  p.created_at
FROM public.payments p
WHERE p.status <> 'voided'

UNION ALL

-- Non-deleted manual income entries (Income)
SELECT
  m.id,
  m.entry_date,
  'income' AS type,
  'manual_income' AS category,
  m.amount_paise,
  'manual' AS source,
  'manual_income' AS reference_type,
  m.id AS reference_id,
  m.description,
  m.payment_method,
  m.reference_number,
  m.created_at
FROM public.manual_income_entries m
WHERE m.deleted_at IS NULL

UNION ALL

-- Non-deleted expenses (Expense)
SELECT
  e.id,
  e.expense_date AS entry_date,
  'expense' AS type,
  c.code AS category,
  e.amount_paise,
  e.source,
  'expense' AS reference_type,
  e.id AS reference_id,
  e.description,
  e.payment_method,
  e.reference_number,
  e.created_at
FROM public.expenses e
JOIN public.expense_categories c ON e.category_id = c.id
WHERE e.deleted_at IS NULL;

-- 3. Client Financial Summary View
CREATE OR REPLACE VIEW public.client_summary_v AS
SELECT
  c.id AS client_id,
  c.full_name,
  COUNT(DISTINCT b.id) AS booking_count,
  COALESCE(SUM(i.total_paise), 0) AS total_billed_paise,
  COALESCE(SUM(i.paid_paise), 0) AS total_paid_paise,
  COALESCE(SUM(i.total_paise - i.paid_paise - i.credited_paise), 0) AS total_outstanding_paise
FROM public.clients c
LEFT JOIN public.bookings b ON b.client_id = c.id AND b.deleted_at IS NULL
LEFT JOIN public.invoices i ON i.client_id = c.id AND i.status <> 'cancelled'
GROUP BY c.id, c.full_name;
