-- Migration 009: Billing, Invoices, Payments, Receipts, Credit Notes, Expenses, Manual Income
-- Strictly obeys DECISION_LOG D-21, D-22, D-23 and DATABASE_SCHEMA §9, §12.

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL,
  due_date date NOT NULL,
  subtotal_paise bigint NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_type public.discount_type,
  discount_value numeric(10, 4),
  discount_paise bigint NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  taxable_amount_paise bigint NOT NULL DEFAULT 0 CHECK (taxable_amount_paise >= 0),
  cgst_rate_bps integer NOT NULL DEFAULT 0 CHECK (cgst_rate_bps >= 0),
  cgst_paise bigint NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_rate_bps integer NOT NULL DEFAULT 0 CHECK (sgst_rate_bps >= 0),
  sgst_paise bigint NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_rate_bps integer NOT NULL DEFAULT 0 CHECK (igst_rate_bps >= 0),
  igst_paise bigint NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  total_tax_paise bigint NOT NULL DEFAULT 0 CHECK (total_tax_paise >= 0),
  total_paise bigint NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  paid_paise bigint NOT NULL DEFAULT 0 CHECK (paid_paise >= 0),
  credited_paise bigint NOT NULL DEFAULT 0 CHECK (credited_paise >= 0),
  notes_to_client text,
  internal_notes text,
  terms text,
  payment_terms text,
  pdf_path text,
  pdf_generated_at timestamptz,
  sent_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_invoice_due_date CHECK (due_date >= issue_date),
  CONSTRAINT check_invoice_paid_credited_cap CHECK (paid_paise + credited_paise <= total_paise)
);

CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON public.invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON public.invoices(status, due_date);

-- 2. Invoice Items Table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  service_id uuid REFERENCES public.services(id),
  package_id uuid REFERENCES public.packages(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise bigint NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise bigint NOT NULL CHECK (line_total_paise >= 0),
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- 3. Credit Notes Table
CREATE TABLE IF NOT EXISTS public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  status public.credit_note_status NOT NULL DEFAULT 'issued',
  issue_date date NOT NULL,
  reason text NOT NULL,
  subtotal_paise bigint NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_paise bigint NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  taxable_amount_paise bigint NOT NULL DEFAULT 0 CHECK (taxable_amount_paise >= 0),
  cgst_paise bigint NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_paise bigint NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_paise bigint NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  total_tax_paise bigint NOT NULL DEFAULT 0 CHECK (total_tax_paise >= 0),
  total_paise bigint NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  pdf_path text,
  pdf_generated_at timestamptz,
  sent_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON public.credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_client_id ON public.credit_notes(client_id);

-- 4. Credit Note Items Table
CREATE TABLE IF NOT EXISTS public.credit_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id uuid NOT NULL REFERENCES public.credit_notes(id) ON DELETE RESTRICT,
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise bigint NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise bigint NOT NULL CHECK (line_total_paise >= 0),
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note_id ON public.credit_note_items(credit_note_id);

-- 5. Payments Table (D-21)
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  payment_date date NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  method public.payment_method NOT NULL,
  reference_number text,
  notes text,
  status public.payment_status NOT NULL DEFAULT 'recorded',
  voided_at timestamptz,
  voided_by uuid REFERENCES public.profiles(id),
  void_reason text,
  recorded_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_payment_void_integrity CHECK (
    status <> 'voided' OR (voided_at IS NOT NULL AND void_reason IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_payments_client_id ON public.payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON public.payments(payment_date);

-- 6. Payment Allocations Table (D-21)
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE RESTRICT,
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE RESTRICT,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  reversed_at timestamptz,
  reversed_by uuid REFERENCES public.profiles(id),
  reversed_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_allocations_active_unique
  ON public.payment_allocations(payment_id, invoice_id)
  WHERE reversed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_allocations_invoice_id ON public.payment_allocations(invoice_id);

-- 7. Receipts Table (D-21)
CREATE TABLE IF NOT EXISTS public.receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text NOT NULL UNIQUE,
  payment_id uuid NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE RESTRICT,
  pdf_path text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON public.receipts(payment_id);

-- 8. Expenses Table (D-23)
CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL,
  category_id uuid NOT NULL REFERENCES public.expense_categories(id),
  description text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  vendor text,
  payment_method public.payment_method,
  reference_number text,
  receipt_path text,
  booking_id uuid REFERENCES public.bookings(id),
  crew_pay_id uuid REFERENCES public.crew_pay_records(id),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'system')),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_booking_id ON public.expenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_expenses_crew_pay_id ON public.expenses(crew_pay_id);

-- 9. Manual Income Entries Table
CREATE TABLE IF NOT EXISTS public.manual_income_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL,
  description text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise > 0),
  payment_method public.payment_method,
  reference_number text,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_manual_income_entry_date ON public.manual_income_entries(entry_date);

-- 10. Immutability & Mutation Guard Triggers (D-21, D-22, §14)
CREATE OR REPLACE FUNCTION public.fn_block_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Deletion of % is prohibited by regulatory and financial integrity rules (D-21, D-22)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.fn_payment_update_guard()
RETURNS trigger AS $$
BEGIN
  -- Payments are immutable; UPDATE is strictly restricted to voiding
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'Voided payments are permanently immutable';
  END IF;
  IF NEW.status = 'voided' AND OLD.status = 'recorded' THEN
    -- Allowed: only voided_at, voided_by, void_reason, status may change
    IF NEW.amount_paise <> OLD.amount_paise OR NEW.client_id <> OLD.client_id OR NEW.payment_date <> OLD.payment_date THEN
      RAISE EXCEPTION 'Financial properties of payments cannot be modified during voiding';
    END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Payments are immutable. To correct a payment, use void_payment.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_update_guard ON public.payments;
CREATE TRIGGER trg_payment_update_guard
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_payment_update_guard();

DROP TRIGGER IF EXISTS trg_block_delete_payments ON public.payments;
CREATE TRIGGER trg_block_delete_payments
  BEFORE DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation();

DROP TRIGGER IF EXISTS trg_block_delete_payment_allocations ON public.payment_allocations;
CREATE TRIGGER trg_block_delete_payment_allocations
  BEFORE DELETE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation();

DROP TRIGGER IF EXISTS trg_block_delete_receipts ON public.receipts;
CREATE TRIGGER trg_block_delete_receipts
  BEFORE DELETE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation();

DROP TRIGGER IF EXISTS trg_block_delete_invoices ON public.invoices;
CREATE TRIGGER trg_block_delete_invoices
  BEFORE DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_block_mutation();

-- Invoice Financial Immutability Trigger (INV-10 / D-22)
CREATE OR REPLACE FUNCTION public.fn_invoice_immutability_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.paid_paise > 0 THEN
    IF NEW.total_paise <> OLD.total_paise OR
       NEW.subtotal_paise <> OLD.subtotal_paise OR
       NEW.discount_paise <> OLD.discount_paise OR
       NEW.taxable_amount_paise <> OLD.taxable_amount_paise OR
       NEW.cgst_paise <> OLD.cgst_paise OR
       NEW.sgst_paise <> OLD.sgst_paise OR
       NEW.igst_paise <> OLD.igst_paise OR
       NEW.client_id <> OLD.client_id OR
       NEW.booking_id <> OLD.booking_id THEN
      RAISE EXCEPTION 'Financial columns of paid/partially-paid invoices are strictly immutable (INV-10 / D-22)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoice_immutability_guard ON public.invoices;
CREATE TRIGGER trg_invoice_immutability_guard
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_invoice_immutability_guard();

-- 11. Core Financial Functions (D-21, D-22, D-23)

-- A. Record Payment (Atomic lock, allocation, receipt generation, invoice update)
CREATE OR REPLACE FUNCTION public.record_payment(
  p_client_id uuid,
  p_payment_date date,
  p_amount_paise bigint,
  p_method public.payment_method,
  p_reference_number text,
  p_notes text,
  p_allocations jsonb,
  p_actor_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_alloc_total bigint := 0;
  v_alloc jsonb;
  v_inv_id uuid;
  v_alloc_amt bigint;
  v_inv record;
  v_remaining_balance bigint;
  v_payment_id uuid;
  v_receipt_id uuid;
  v_receipt_number text;
BEGIN
  IF p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- 1. Validate sum of allocations equals payment amount (D-21)
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_alloc_amt := (v_alloc->>'amount_paise')::bigint;
    IF v_alloc_amt <= 0 THEN
      RAISE EXCEPTION 'Allocation amount must be greater than zero';
    END IF;
    v_alloc_total := v_alloc_total + v_alloc_amt;
  END LOOP;

  IF v_alloc_total <> p_amount_paise THEN
    RAISE EXCEPTION 'Payment must be fully allocated. Total allocations (%) does not match payment amount (%)',
      v_alloc_total, p_amount_paise;
  END IF;

  -- 2. Lock target invoices FOR UPDATE and verify outstanding balance
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_inv_id := (v_alloc->>'invoice_id')::uuid;
    v_alloc_amt := (v_alloc->>'amount_paise')::bigint;

    SELECT * INTO v_inv
    FROM public.invoices
    WHERE id = v_inv_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invoice not found: %', v_inv_id;
    END IF;

    IF v_inv.status = 'cancelled' THEN
      RAISE EXCEPTION 'Cannot allocate payment to cancelled invoice %', v_inv.invoice_number;
    END IF;

    v_remaining_balance := v_inv.total_paise - v_inv.paid_paise - v_inv.credited_paise;

    IF v_alloc_amt > v_remaining_balance THEN
      RAISE EXCEPTION 'Over-payment rejected: allocation of % exceeds outstanding balance of % on invoice %',
        v_alloc_amt, v_remaining_balance, v_inv.invoice_number;
    END IF;
  END LOOP;

  -- 3. Insert payment row
  INSERT INTO public.payments (
    client_id,
    payment_date,
    amount_paise,
    method,
    reference_number,
    notes,
    status,
    recorded_by
  ) VALUES (
    p_client_id,
    p_payment_date,
    p_amount_paise,
    p_method,
    p_reference_number,
    p_notes,
    'recorded',
    p_actor_id
  ) RETURNING id INTO v_payment_id;

  -- 4. Insert allocations and update each invoice
  FOR v_alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    v_inv_id := (v_alloc->>'invoice_id')::uuid;
    v_alloc_amt := (v_alloc->>'amount_paise')::bigint;

    INSERT INTO public.payment_allocations (
      payment_id,
      invoice_id,
      amount_paise
    ) VALUES (
      v_payment_id,
      v_inv_id,
      v_alloc_amt
    );

    UPDATE public.invoices
    SET
      paid_paise = paid_paise + v_alloc_amt,
      status = CASE
        WHEN paid_paise + v_alloc_amt + credited_paise >= total_paise THEN 'paid'::public.invoice_status
        ELSE 'partially_paid'::public.invoice_status
      END,
      updated_at = now()
    WHERE id = v_inv_id;
  END LOOP;

  -- 5. Generate Receipt number (RCP) and create receipt
  v_receipt_number := app.next_document_number('RCP');

  INSERT INTO public.receipts (
    receipt_number,
    payment_id
  ) VALUES (
    v_receipt_number,
    v_payment_id
  ) RETURNING id INTO v_receipt_id;

  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'receipt_id', v_receipt_id,
    'receipt_number', v_receipt_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- B. Void Payment (D-21: reverses allocations, recomputes invoice paid balances)
CREATE OR REPLACE FUNCTION public.void_payment(
  p_payment_id uuid,
  p_reason text,
  p_actor_id uuid
)
RETURNS void AS $$
DECLARE
  v_pay record;
  v_alloc record;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A valid void reason is required';
  END IF;

  SELECT * INTO v_pay
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment not found';
  END IF;

  IF v_pay.status = 'voided' THEN
    RAISE EXCEPTION 'Payment is already voided';
  END IF;

  -- Reverse all active allocations
  FOR v_alloc IN
    SELECT * FROM public.payment_allocations
    WHERE payment_id = p_payment_id AND reversed_at IS NULL
    FOR UPDATE
  LOOP
    UPDATE public.payment_allocations
    SET
      reversed_at = now(),
      reversed_by = p_actor_id,
      reversed_reason = p_reason
    WHERE id = v_alloc.id;

    -- Update linked invoice
    UPDATE public.invoices
    SET
      paid_paise = GREATEST(0, paid_paise - v_alloc.amount_paise),
      status = CASE
        WHEN (paid_paise - v_alloc.amount_paise) <= 0 THEN 'sent'::public.invoice_status
        WHEN (paid_paise - v_alloc.amount_paise + credited_paise) < total_paise THEN 'partially_paid'::public.invoice_status
        ELSE 'paid'::public.invoice_status
      END,
      updated_at = now()
    WHERE id = v_alloc.invoice_id;
  END LOOP;

  -- Update payment to voided
  UPDATE public.payments
  SET
    status = 'voided',
    voided_at = now(),
    voided_by = p_actor_id,
    void_reason = p_reason
  WHERE id = p_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- C. Issue Credit Note (D-22: capped at unpaid balance)
CREATE OR REPLACE FUNCTION public.issue_credit_note(
  p_invoice_id uuid,
  p_issue_date date,
  p_reason text,
  p_items jsonb,
  p_actor_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_inv record;
  v_unpaid_balance bigint;
  v_cn_number text;
  v_cn_id uuid;
  v_item jsonb;
  v_subtotal bigint := 0;
  v_tax bigint := 0;
  v_total bigint := 0;
  v_item_total bigint;
  v_qty int;
  v_rate bigint;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required to issue a credit note';
  END IF;

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  v_unpaid_balance := v_inv.total_paise - v_inv.paid_paise - v_inv.credited_paise;

  -- Calculate total of credit note items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;
    v_rate := (v_item->>'unit_price_paise')::bigint;
    v_item_total := v_qty * v_rate;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  v_total := v_subtotal; -- V1 basic credit note total

  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Credit note total must be greater than zero';
  END IF;

  IF v_total > v_unpaid_balance THEN
    RAISE EXCEPTION 'Credit note cannot exceed unpaid invoice balance of % (attempted %)',
      v_unpaid_balance, v_total;
  END IF;

  v_cn_number := app.next_document_number('CN');

  INSERT INTO public.credit_notes (
    credit_note_number,
    invoice_id,
    client_id,
    status,
    issue_date,
    reason,
    subtotal_paise,
    taxable_amount_paise,
    total_paise,
    created_by
  ) VALUES (
    v_cn_number,
    p_invoice_id,
    v_inv.client_id,
    'issued',
    p_issue_date,
    p_reason,
    v_subtotal,
    v_subtotal,
    v_total,
    p_actor_id
  ) RETURNING id INTO v_cn_id;

  -- Insert items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO public.credit_note_items (
      credit_note_id,
      description,
      quantity,
      unit_price_paise,
      line_total_paise,
      sort
    ) VALUES (
      v_cn_id,
      v_item->>'description',
      (v_item->>'quantity')::int,
      (v_item->>'unit_price_paise')::bigint,
      (v_item->>'quantity')::int * (v_item->>'unit_price_paise')::bigint,
      COALESCE((v_item->>'sort')::int, 0)
    );
  END LOOP;

  -- Update credited_paise on invoice
  UPDATE public.invoices
  SET
    credited_paise = credited_paise + v_total,
    status = CASE
      WHEN paid_paise + credited_paise + v_total >= total_paise THEN 'paid'::public.invoice_status
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_invoice_id;

  RETURN jsonb_build_object(
    'credit_note_id', v_cn_id,
    'credit_note_number', v_cn_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- D. Cancel Invoice (D-22: allowed only when paid_paise = 0)
CREATE OR REPLACE FUNCTION public.cancel_invoice(
  p_invoice_id uuid,
  p_reason text,
  p_actor_id uuid
)
RETURNS void AS $$
DECLARE
  v_inv record;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A cancellation reason is required';
  END IF;

  SELECT * INTO v_inv
  FROM public.invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  IF v_inv.paid_paise > 0 THEN
    RAISE EXCEPTION 'Cannot cancel an invoice with payments (paid_paise = %). Issue a credit note instead.', v_inv.paid_paise;
  END IF;

  IF v_inv.status = 'cancelled' THEN
    RAISE EXCEPTION 'Invoice is already cancelled';
  END IF;

  UPDATE public.invoices
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancel_reason = p_reason,
    updated_at = now()
  WHERE id = p_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- E. Record Crew Payment (D-23: atomically creates linked expenses row in same txn)
CREATE OR REPLACE FUNCTION public.record_crew_payment(
  p_crew_pay_record_id uuid,
  p_payment_date date,
  p_amount_paise bigint,
  p_method public.payment_method,
  p_reference_number text,
  p_notes text,
  p_actor_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_rec record;
  v_cat_id uuid;
  v_expense_id uuid;
  v_new_paid bigint;
  v_new_status public.crew_pay_status;
BEGIN
  IF p_amount_paise <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  SELECT * INTO v_rec
  FROM public.crew_pay_records
  WHERE id = p_crew_pay_record_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Crew pay record not found';
  END IF;

  IF (v_rec.paid_paise + p_amount_paise) > v_rec.agreed_paise THEN
    RAISE EXCEPTION 'Payment exceeds agreed pay (agreed: %, already paid: %, attempting: %)',
      v_rec.agreed_paise, v_rec.paid_paise, p_amount_paise;
  END IF;

  -- Find crew_payment expense category
  SELECT id INTO v_cat_id
  FROM public.expense_categories
  WHERE code = 'crew_payment';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'System category crew_payment missing from expense_categories';
  END IF;

  -- 1. Create linked expense row atomically (D-23)
  INSERT INTO public.expenses (
    expense_date,
    category_id,
    description,
    amount_paise,
    payment_method,
    reference_number,
    booking_id,
    crew_pay_id,
    source,
    notes,
    created_by
  ) VALUES (
    p_payment_date,
    v_cat_id,
    'Crew Payment - ' || COALESCE(p_notes, 'Production Crew Fee'),
    p_amount_paise,
    p_method,
    p_reference_number,
    v_rec.booking_id,
    p_crew_pay_record_id,
    'system',
    p_notes,
    p_actor_id
  ) RETURNING id INTO v_expense_id;

  -- 2. Update crew pay record
  v_new_paid := v_rec.paid_paise + p_amount_paise;
  v_new_status := CASE
    WHEN v_new_paid >= v_rec.agreed_paise THEN 'paid'::public.crew_pay_status
    ELSE 'partially_paid'::public.crew_pay_status
  END;

  UPDATE public.crew_pay_records
  SET
    paid_paise = v_new_paid,
    status = v_new_status,
    updated_at = now()
  WHERE id = p_crew_pay_record_id;

  RETURN jsonb_build_object(
    'expense_id', v_expense_id,
    'crew_pay_record_id', p_crew_pay_record_id,
    'paid_paise', v_new_paid,
    'status', v_new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
