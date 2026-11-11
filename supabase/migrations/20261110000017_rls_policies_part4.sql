-- Migration 017: RLS Policies Part 4 (Billing, Finance, Ledger)
-- Strictly enforces RBAC §3.3 & Master Prompt: "Manager must not read payments or ledger_entries_v".

-- Enable RLS on all Phase 4 tables
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_income_entries ENABLE ROW LEVEL SECURITY;

-- 1. Invoices
CREATE POLICY "invoices_select_policy" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager', 'staff')
  );

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

-- 2. Invoice Items
CREATE POLICY "invoice_items_select_policy" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager', 'staff')
  );

CREATE POLICY "invoice_items_insert_policy" ON public.invoice_items
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

CREATE POLICY "invoice_items_update_policy" ON public.invoice_items
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

-- 3. Credit Notes
CREATE POLICY "credit_notes_select_policy" ON public.credit_notes
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

CREATE POLICY "credit_notes_insert_policy" ON public.credit_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "credit_notes_update_policy" ON public.credit_notes
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 4. Credit Note Items
CREATE POLICY "credit_note_items_select_policy" ON public.credit_note_items
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

CREATE POLICY "credit_note_items_insert_policy" ON public.credit_note_items
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 5. Payments (Manager MUST NOT read payments per Master Prompt & RBAC §3.3)
CREATE POLICY "payments_select_policy" ON public.payments
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "payments_insert_policy" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "payments_update_policy" ON public.payments
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 6. Payment Allocations
CREATE POLICY "payment_allocations_select_policy" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "payment_allocations_insert_policy" ON public.payment_allocations
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "payment_allocations_update_policy" ON public.payment_allocations
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 7. Receipts
CREATE POLICY "receipts_select_policy" ON public.receipts
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "receipts_insert_policy" ON public.receipts
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 8. Expenses
CREATE POLICY "expenses_select_policy" ON public.expenses
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant', 'manager')
  );

CREATE POLICY "expenses_insert_policy" ON public.expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "expenses_update_policy" ON public.expenses
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

-- 9. Manual Income Entries
CREATE POLICY "manual_income_select_policy" ON public.manual_income_entries
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "manual_income_insert_policy" ON public.manual_income_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );

CREATE POLICY "manual_income_update_policy" ON public.manual_income_entries
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'accountant')
  );
