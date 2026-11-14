-- Migration 027: Resilient payload parsing for create_quotation and create_quotation_version
-- Supports both snake_case and camelCase payload keys to eliminate null constraint errors

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
  v_client_id uuid;
  v_event_date date;
  v_valid_until date;
BEGIN
  v_client_id := (COALESCE(payload->>'client_id', payload->>'clientId'))::uuid;
  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'client_id is required to create a quotation';
  END IF;

  v_event_date := (COALESCE(payload->>'event_date', payload->>'eventDate'))::date;
  v_valid_until := COALESCE((COALESCE(payload->>'valid_until', payload->>'validUntil'))::date, current_date + 30);

  -- Generate gap-free quotation document number
  v_doc_no := app.next_document_number('QT', COALESCE(v_event_date, current_date));

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
    v_client_id,
    (COALESCE(payload->>'enquiry_id', payload->>'enquiryId'))::uuid,
    COALESCE((COALESCE(payload->>'status', 'draft'))::quotation_status, 'draft'),
    v_event_date,
    v_valid_until,
    (COALESCE(payload->>'subtotal_paise', payload->>'subtotalPaise'))::bigint,
    NULLIF(COALESCE(payload->>'discount_type', payload->>'discountType', ''), '')::discount_type,
    (COALESCE(payload->>'discount_bps', payload->>'discountBps'))::integer,
    (COALESCE(payload->>'discount_fixed_paise', payload->>'discountFixedPaise'))::bigint,
    COALESCE((COALESCE(payload->>'discount_paise', payload->>'discountPaise'))::bigint, 0),
    (COALESCE(payload->>'taxable_paise', payload->>'taxablePaise'))::bigint,
    COALESCE((COALESCE(payload->>'cgst_paise', payload->>'cgstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'sgst_paise', payload->>'sgstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'igst_paise', payload->>'igstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'tax_paise', payload->>'taxPaise'))::bigint, 0),
    (COALESCE(payload->>'total_paise', payload->>'totalPaise'))::bigint,
    COALESCE((COALESCE(payload->>'gst_applied', payload->>'gstApplied'))::boolean, false),
    COALESCE((COALESCE(payload->>'tax_type', payload->>'taxType'))::tax_type, 'none'),
    COALESCE(payload->>'business_gstin', payload->>'businessGstin'),
    COALESCE(payload->>'client_gstin', payload->>'clientGstin'),
    COALESCE(payload->>'place_of_supply_state_code', payload->>'placeOfSupplyStateCode'),
    COALESCE(payload->>'notes_to_client', payload->>'notesToClient'),
    COALESCE(payload->>'internal_notes', payload->>'internalNotes'),
    COALESCE(payload->>'terms', payload->>'terms'),
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
      (COALESCE(v_item->>'service_id', v_item->>'serviceId'))::uuid,
      (COALESCE(v_item->>'package_id', v_item->>'packageId'))::uuid,
      v_item->>'description',
      (COALESCE(v_item->>'quantity', '1'))::integer,
      (COALESCE(v_item->>'unit_price_paise', v_item->>'unitPricePaise'))::bigint,
      (COALESCE(v_item->>'line_total_paise', v_item->>'lineTotalPaise'))::bigint,
      COALESCE(v_item->>'hsn_sac_code', v_item->>'hsnSacCode'),
      (COALESCE(v_item->>'cgst_bps', v_item->>'cgstBps'))::integer,
      (COALESCE(v_item->>'sgst_bps', v_item->>'sgstBps'))::integer,
      (COALESCE(v_item->>'igst_bps', v_item->>'igstBps'))::integer,
      COALESCE((COALESCE(v_item->>'line_discount_paise', v_item->>'lineDiscountPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'line_taxable_paise', v_item->>'lineTaxablePaise'))::bigint, (COALESCE(v_item->>'line_total_paise', v_item->>'lineTotalPaise'))::bigint),
      COALESCE((COALESCE(v_item->>'cgst_paise', v_item->>'cgstPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'sgst_paise', v_item->>'sgstPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'igst_paise', v_item->>'igstPaise'))::bigint, 0)
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
  v_client_id uuid;
  v_event_date date;
  v_valid_until date;
BEGIN
  -- Fetch existing current version
  SELECT quotation_number, version_no, client_id
  INTO v_orig
  FROM public.quotations
  WHERE root_id = p_root_id AND is_current = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Root quotation % not found or has no active version.', p_root_id;
  END IF;

  v_next_version := v_orig.version_no + 1;

  v_client_id := COALESCE((COALESCE(payload->>'client_id', payload->>'clientId'))::uuid, v_orig.client_id);
  v_event_date := (COALESCE(payload->>'event_date', payload->>'eventDate'))::date;
  v_valid_until := COALESCE((COALESCE(payload->>'valid_until', payload->>'validUntil'))::date, current_date + 30);

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
    v_orig.quotation_number,
    v_client_id,
    (COALESCE(payload->>'enquiry_id', payload->>'enquiryId'))::uuid,
    'draft',
    v_event_date,
    v_valid_until,
    (COALESCE(payload->>'subtotal_paise', payload->>'subtotalPaise'))::bigint,
    NULLIF(COALESCE(payload->>'discount_type', payload->>'discountType', ''), '')::discount_type,
    (COALESCE(payload->>'discount_bps', payload->>'discountBps'))::integer,
    (COALESCE(payload->>'discount_fixed_paise', payload->>'discountFixedPaise'))::bigint,
    COALESCE((COALESCE(payload->>'discount_paise', payload->>'discountPaise'))::bigint, 0),
    (COALESCE(payload->>'taxable_paise', payload->>'taxablePaise'))::bigint,
    COALESCE((COALESCE(payload->>'cgst_paise', payload->>'cgstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'sgst_paise', payload->>'sgstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'igst_paise', payload->>'igstPaise'))::bigint, 0),
    COALESCE((COALESCE(payload->>'tax_paise', payload->>'taxPaise'))::bigint, 0),
    (COALESCE(payload->>'total_paise', payload->>'totalPaise'))::bigint,
    COALESCE((COALESCE(payload->>'gst_applied', payload->>'gstApplied'))::boolean, false),
    COALESCE((COALESCE(payload->>'tax_type', payload->>'taxType'))::tax_type, 'none'),
    COALESCE(payload->>'business_gstin', payload->>'businessGstin'),
    COALESCE(payload->>'client_gstin', payload->>'clientGstin'),
    COALESCE(payload->>'place_of_supply_state_code', payload->>'placeOfSupplyStateCode'),
    COALESCE(payload->>'notes_to_client', payload->>'notesToClient'),
    COALESCE(payload->>'internal_notes', payload->>'internalNotes'),
    COALESCE(payload->>'terms', payload->>'terms'),
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
      (COALESCE(v_item->>'service_id', v_item->>'serviceId'))::uuid,
      (COALESCE(v_item->>'package_id', v_item->>'packageId'))::uuid,
      v_item->>'description',
      (COALESCE(v_item->>'quantity', '1'))::integer,
      (COALESCE(v_item->>'unit_price_paise', v_item->>'unitPricePaise'))::bigint,
      (COALESCE(v_item->>'line_total_paise', v_item->>'lineTotalPaise'))::bigint,
      COALESCE(v_item->>'hsn_sac_code', v_item->>'hsnSacCode'),
      (COALESCE(v_item->>'cgst_bps', v_item->>'cgstBps'))::integer,
      (COALESCE(v_item->>'sgst_bps', v_item->>'sgstBps'))::integer,
      (COALESCE(v_item->>'igst_bps', v_item->>'igstBps'))::integer,
      COALESCE((COALESCE(v_item->>'line_discount_paise', v_item->>'lineDiscountPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'line_taxable_paise', v_item->>'lineTaxablePaise'))::bigint, (COALESCE(v_item->>'line_total_paise', v_item->>'lineTotalPaise'))::bigint),
      COALESCE((COALESCE(v_item->>'cgst_paise', v_item->>'cgstPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'sgst_paise', v_item->>'sgstPaise'))::bigint, 0),
      COALESCE((COALESCE(v_item->>'igst_paise', v_item->>'igstPaise'))::bigint, 0)
    );
  END LOOP;

  RETURN v_new_qid;
END;
$$;
