-- VOWS Studio — Migration 007: Quotations, Items, Templates, Versioning & Sum Checks
-- Specs: DATABASE_SCHEMA §7, §11, §12, §14, BUSINESS_WORKFLOWS §2.2, §3.3, §3.4, D-16 to D-20

-- 1. Quotations
CREATE TABLE IF NOT EXISTS public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_id uuid NOT NULL,
  version_no integer NOT NULL DEFAULT 1,
  is_current boolean NOT NULL DEFAULT true,
  quotation_number text NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  enquiry_id uuid REFERENCES public.enquiries(id),
  status quotation_status NOT NULL DEFAULT 'draft',
  event_date date,
  valid_until date NOT NULL,

  -- Money & GST Pattern (Integer Paise, Basis Points)
  subtotal_paise bigint NOT NULL DEFAULT 0 CHECK (subtotal_paise >= 0),
  discount_type discount_type,
  discount_bps integer CHECK (discount_bps IS NULL OR (discount_bps >= 0 AND discount_bps <= 10000)),
  discount_fixed_paise bigint CHECK (discount_fixed_paise IS NULL OR discount_fixed_paise >= 0),
  discount_paise bigint NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  taxable_paise bigint NOT NULL DEFAULT 0 CHECK (taxable_paise >= 0),
  cgst_paise bigint NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_paise bigint NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_paise bigint NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  tax_paise bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise bigint NOT NULL DEFAULT 0 CHECK (total_paise >= 0),
  gst_applied boolean NOT NULL DEFAULT false,
  tax_type tax_type NOT NULL DEFAULT 'none',
  business_gstin text,
  client_gstin text,
  place_of_supply_state_code char(2),

  notes_to_client text,
  internal_notes text,
  terms text,
  pdf_path text,
  pdf_generated_at timestamptz,
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,

  CONSTRAINT quotations_version_unique UNIQUE (quotation_number, version_no),
  CONSTRAINT quotations_discount_check CHECK (
    (discount_type = 'percent' AND discount_bps IS NOT NULL AND discount_fixed_paise IS NULL) OR
    (discount_type = 'fixed' AND discount_fixed_paise IS NOT NULL AND discount_bps IS NULL) OR
    discount_type IS NULL
  ),
  CONSTRAINT quotations_discount_capped CHECK (discount_paise <= subtotal_paise)
);

CREATE UNIQUE INDEX IF NOT EXISTS quotations_root_current_idx
  ON public.quotations (root_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS quotations_client_idx ON public.quotations (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_status_idx ON public.quotations (status);
CREATE INDEX IF NOT EXISTS quotations_valid_until_idx ON public.quotations (valid_until);

CREATE TRIGGER quotations_touch_updated_at
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER quotations_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- Trigger: Sent / accepted quotations are immutable except for status transitions
CREATE OR REPLACE FUNCTION app.quotation_immutability_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IN ('sent', 'accepted') THEN
    -- If non-status fields are being changed, raise
    IF OLD.subtotal_paise <> NEW.subtotal_paise OR
       OLD.total_paise <> NEW.total_paise OR
       OLD.client_id <> NEW.client_id OR
       OLD.discount_paise <> NEW.discount_paise THEN
      RAISE EXCEPTION 'Quotation % is in % status. Financial columns are immutable. Create a new version instead.',
        OLD.quotation_number, OLD.status;
    END IF;
  END IF;

  -- Only drafts may be soft-deleted
  IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
    IF OLD.status <> 'draft' THEN
      RAISE EXCEPTION 'Only draft quotations can be archived or deleted. Quotation % is in % status.',
        OLD.quotation_number, OLD.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER quotations_immutability_trigger
  BEFORE UPDATE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION app.quotation_immutability_guard();

-- 2. Quotation Items
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  sort integer NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id),
  package_id uuid REFERENCES public.packages(id),
  service_archived_flag boolean DEFAULT false,
  description text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_paise bigint NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise bigint NOT NULL,
  hsn_sac_code text,
  cgst_bps integer,
  sgst_bps integer,
  igst_bps integer,
  line_discount_paise bigint NOT NULL DEFAULT 0,
  line_taxable_paise bigint NOT NULL DEFAULT 0,
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  CONSTRAINT quotation_items_line_total CHECK (line_total_paise = quantity * unit_price_paise)
);

CREATE INDEX IF NOT EXISTS quotation_items_quotation_idx
  ON public.quotation_items (quotation_id, sort ASC);

-- 3. Quotation Templates
CREATE TABLE IF NOT EXISTS public.quotation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event_type event_type,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quotation_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.quotation_templates(id) ON DELETE CASCADE,
  sort integer NOT NULL DEFAULT 0,
  service_id uuid REFERENCES public.services(id),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_paise bigint NOT NULL CHECK (unit_price_paise >= 0)
);

CREATE INDEX IF NOT EXISTS quotation_template_items_idx
  ON public.quotation_template_items (template_id, sort ASC);

-- 4. Quotations View with dynamic expiry derivation (DATABASE_SCHEMA §11)
CREATE OR REPLACE VIEW public.quotations_v AS
SELECT
  q.*,
  CASE
    WHEN q.status IN ('draft', 'sent') AND current_date > q.valid_until THEN 'expired'
    ELSE q.status::text
  END AS derived_status
FROM public.quotations q;

-- 5. Deferred Sum Check Trigger
CREATE OR REPLACE FUNCTION app.check_quotation_sums()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_qid uuid;
  v_items_subtotal bigint;
  v_q_subtotal bigint;
  v_q_discount bigint;
  v_q_taxable bigint;
  v_q_tax bigint;
  v_q_total bigint;
BEGIN
  v_qid := COALESCE(NEW.quotation_id, NEW.id, OLD.quotation_id, OLD.id);

  SELECT coalesce(sum(line_total_paise), 0)
  INTO v_items_subtotal
  FROM public.quotation_items
  WHERE quotation_id = v_qid;

  SELECT subtotal_paise, discount_paise, taxable_paise, tax_paise, total_paise
  INTO v_q_subtotal, v_q_discount, v_q_taxable, v_q_tax, v_q_total
  FROM public.quotations
  WHERE id = v_qid;

  IF v_q_subtotal IS NOT NULL THEN
    IF v_items_subtotal <> v_q_subtotal THEN
      RAISE EXCEPTION 'Quotation subtotal mismatch: items sum (%) does not equal header subtotal (%)',
        v_items_subtotal, v_q_subtotal;
    END IF;

    IF v_q_taxable <> (v_q_subtotal - v_q_discount) THEN
      RAISE EXCEPTION 'Quotation taxable mismatch: subtotal (%) - discount (%) does not equal taxable (%)',
        v_q_subtotal, v_q_discount, v_q_taxable;
    END IF;

    IF v_q_total <> (v_q_taxable + v_q_tax) THEN
      RAISE EXCEPTION 'Quotation total mismatch: taxable (%) + tax (%) does not equal total (%)',
        v_q_taxable, v_q_tax, v_q_total;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER quotations_sum_check_items
  AFTER INSERT OR UPDATE OR DELETE ON public.quotation_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app.check_quotation_sums();

-- 6. Functions for creating quotations and quotation versions
CREATE OR REPLACE FUNCTION public.create_quotation(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_doc_no text;
  v_qid uuid := gen_random_uuid();
  v_item jsonb;
  v_sort integer := 0;
BEGIN
  -- Generate gap-free quotation document number
  v_doc_no := app.next_document_number('QT', COALESCE((payload->>'event_date')::date, current_date));

  INSERT INTO public.quotations (
    id,
    root_id,
    version_no,
    is_current,
    quotation_number,
    client_id,
    enquiry_id,
    status,
    event_date,
    valid_until,
    subtotal_paise,
    discount_type,
    discount_bps,
    discount_fixed_paise,
    discount_paise,
    taxable_paise,
    cgst_paise,
    sgst_paise,
    igst_paise,
    tax_paise,
    total_paise,
    gst_applied,
    tax_type,
    business_gstin,
    client_gstin,
    place_of_supply_state_code,
    notes_to_client,
    internal_notes,
    terms,
    created_by
  ) VALUES (
    v_qid,
    v_qid, -- root_id is self for version 1
    1,
    true,
    v_doc_no,
    (payload->>'client_id')::uuid,
    (payload->>'enquiry_id')::uuid,
    COALESCE((payload->>'status')::quotation_status, 'draft'),
    (payload->>'event_date')::date,
    COALESCE((payload->>'valid_until')::date, current_date + 30),
    (payload->>'subtotal_paise')::bigint,
    NULLIF(payload->>'discount_type', '')::discount_type,
    (payload->>'discount_bps')::integer,
    (payload->>'discount_fixed_paise')::bigint,
    COALESCE((payload->>'discount_paise')::bigint, 0),
    (payload->>'taxable_paise')::bigint,
    COALESCE((payload->>'cgst_paise')::bigint, 0),
    COALESCE((payload->>'sgst_paise')::bigint, 0),
    COALESCE((payload->>'igst_paise')::bigint, 0),
    COALESCE((payload->>'tax_paise')::bigint, 0),
    (payload->>'total_paise')::bigint,
    COALESCE((payload->>'gst_applied')::boolean, false),
    COALESCE((payload->>'tax_type')::tax_type, 'none'),
    payload->>'business_gstin',
    payload->>'client_gstin',
    payload->>'place_of_supply_state_code',
    payload->>'notes_to_client',
    payload->>'internal_notes',
    payload->>'terms',
    auth.uid()
  );

  -- Insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_sort := v_sort + 1;
    INSERT INTO public.quotation_items (
      quotation_id,
      sort,
      service_id,
      package_id,
      description,
      quantity,
      unit_price_paise,
      line_total_paise,
      hsn_sac_code,
      cgst_bps,
      sgst_bps,
      igst_bps,
      line_discount_paise,
      line_taxable_paise,
      cgst_paise,
      sgst_paise,
      igst_paise
    ) VALUES (
      v_qid,
      v_sort,
      (v_item->>'service_id')::uuid,
      (v_item->>'package_id')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_paise')::bigint,
      (v_item->>'line_total_paise')::bigint,
      v_item->>'hsn_sac_code',
      (v_item->>'cgst_bps')::integer,
      (v_item->>'sgst_bps')::integer,
      (v_item->>'igst_bps')::integer,
      COALESCE((v_item->>'line_discount_paise')::bigint, 0),
      COALESCE((v_item->>'line_taxable_paise')::bigint, (v_item->>'line_total_paise')::bigint),
      COALESCE((v_item->>'cgst_paise')::bigint, 0),
      COALESCE((v_item->>'sgst_paise')::bigint, 0),
      COALESCE((v_item->>'igst_paise')::bigint, 0)
    );
  END LOOP;

  RETURN v_qid;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_quotation_version(
  p_root_id uuid,
  payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_orig record;
  v_next_version integer;
  v_new_qid uuid := gen_random_uuid();
  v_item jsonb;
  v_sort integer := 0;
BEGIN
  -- Fetch existing current version
  SELECT quotation_number, version_no
  INTO v_orig
  FROM public.quotations
  WHERE root_id = p_root_id AND is_current = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Root quotation % not found or has no active version.', p_root_id;
  END IF;

  v_next_version := v_orig.version_no + 1;

  -- Mark all previous versions as superseded and is_current = false
  UPDATE public.quotations
  SET is_current = false,
      status = CASE WHEN status = 'draft' THEN 'superseded'::quotation_status ELSE status END
  WHERE root_id = p_root_id AND is_current = true;

  -- Insert new version
  INSERT INTO public.quotations (
    id,
    root_id,
    version_no,
    is_current,
    quotation_number,
    client_id,
    enquiry_id,
    status,
    event_date,
    valid_until,
    subtotal_paise,
    discount_type,
    discount_bps,
    discount_fixed_paise,
    discount_paise,
    taxable_paise,
    cgst_paise,
    sgst_paise,
    igst_paise,
    tax_paise,
    total_paise,
    gst_applied,
    tax_type,
    business_gstin,
    client_gstin,
    place_of_supply_state_code,
    notes_to_client,
    internal_notes,
    terms,
    created_by
  ) VALUES (
    v_new_qid,
    p_root_id,
    v_next_version,
    true,
    v_orig.quotation_number, -- Reuses original document number
    (payload->>'client_id')::uuid,
    (payload->>'enquiry_id')::uuid,
    'draft', -- New versions start as draft
    (payload->>'event_date')::date,
    COALESCE((payload->>'valid_until')::date, current_date + 30),
    (payload->>'subtotal_paise')::bigint,
    NULLIF(payload->>'discount_type', '')::discount_type,
    (payload->>'discount_bps')::integer,
    (payload->>'discount_fixed_paise')::bigint,
    COALESCE((payload->>'discount_paise')::bigint, 0),
    (payload->>'taxable_paise')::bigint,
    COALESCE((payload->>'cgst_paise')::bigint, 0),
    COALESCE((payload->>'sgst_paise')::bigint, 0),
    COALESCE((payload->>'igst_paise')::bigint, 0),
    COALESCE((payload->>'tax_paise')::bigint, 0),
    (payload->>'total_paise')::bigint,
    COALESCE((payload->>'gst_applied')::boolean, false),
    COALESCE((payload->>'tax_type')::tax_type, 'none'),
    payload->>'business_gstin',
    payload->>'client_gstin',
    payload->>'place_of_supply_state_code',
    payload->>'notes_to_client',
    payload->>'internal_notes',
    payload->>'terms',
    auth.uid()
  );

  -- Insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
  LOOP
    v_sort := v_sort + 1;
    INSERT INTO public.quotation_items (
      quotation_id,
      sort,
      service_id,
      package_id,
      description,
      quantity,
      unit_price_paise,
      line_total_paise,
      hsn_sac_code,
      cgst_bps,
      sgst_bps,
      igst_bps,
      line_discount_paise,
      line_taxable_paise,
      cgst_paise,
      sgst_paise,
      igst_paise
    ) VALUES (
      v_new_qid,
      v_sort,
      (v_item->>'service_id')::uuid,
      (v_item->>'package_id')::uuid,
      v_item->>'description',
      (v_item->>'quantity')::integer,
      (v_item->>'unit_price_paise')::bigint,
      (v_item->>'line_total_paise')::bigint,
      v_item->>'hsn_sac_code',
      (v_item->>'cgst_bps')::integer,
      (v_item->>'sgst_bps')::integer,
      (v_item->>'igst_bps')::integer,
      COALESCE((v_item->>'line_discount_paise')::bigint, 0),
      COALESCE((v_item->>'line_taxable_paise')::bigint, (v_item->>'line_total_paise')::bigint),
      COALESCE((v_item->>'cgst_paise')::bigint, 0),
      COALESCE((v_item->>'sgst_paise')::bigint, 0),
      COALESCE((v_item->>'igst_paise')::bigint, 0)
    );
  END LOOP;

  RETURN v_new_qid;
END;
$$;

-- Enable RLS
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_template_items ENABLE ROW LEVEL SECURITY;
