-- VOWS — Migration 030: Multiple Events Support per Single Enquiry & Booking Pipeline
-- Allows a single enquiry to contain multiple events with distinct dates & venues (e.g. Roce + Wedding)
-- which flow through into a single quotation, single booking (with multiple events), and single invoice.

-- 1. Add events jsonb column to enquiries and quotations
ALTER TABLE public.enquiries
  ADD COLUMN IF NOT EXISTS events jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS events jsonb DEFAULT '[]'::jsonb;

-- 2. Enhanced convert_enquiry_to_booking function
CREATE OR REPLACE FUNCTION public.convert_enquiry_to_booking(
  p_enquiry_id uuid,
  p_target_delivery_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_enquiry RECORD;
  v_client_id uuid;
  v_booking_id uuid;
  v_booking_number text;
  v_event_item jsonb;
  v_has_multi_events boolean := false;
  v_event_type text;
  v_event_name text;
  v_event_date text;
  v_venue_name text;
  v_sort int := 0;
BEGIN
  SELECT * INTO v_enquiry FROM public.enquiries WHERE id = p_enquiry_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enquiry % not found', p_enquiry_id;
  END IF;

  -- Ensure enquiry has client or create client from guest
  IF v_enquiry.client_id IS NOT NULL THEN
    v_client_id := v_enquiry.client_id;
  ELSE
    INSERT INTO public.clients (full_name, referral_source)
    VALUES (COALESCE(v_enquiry.guest_name, 'Guest Client'), v_enquiry.source::text)
    RETURNING id INTO v_client_id;

    IF v_enquiry.guest_phone IS NOT NULL THEN
      INSERT INTO public.client_phones (client_id, phone_e164, is_primary)
      VALUES (v_client_id, v_enquiry.guest_phone, true);
    END IF;

    IF v_enquiry.guest_email IS NOT NULL THEN
      INSERT INTO public.client_emails (client_id, email, is_primary)
      VALUES (v_client_id, v_enquiry.guest_email, true);
    END IF;

    UPDATE public.enquiries SET client_id = v_client_id WHERE id = p_enquiry_id;
  END IF;

  -- Generate atomic document number
  v_booking_number := app.next_document_number('BK');

  -- Create booking
  INSERT INTO public.bookings (
    booking_number,
    client_id,
    enquiry_id,
    status,
    contract_total_paise,
    target_delivery_date,
    created_by
  )
  VALUES (
    v_booking_number,
    v_client_id,
    p_enquiry_id,
    'confirmed',
    COALESCE(v_enquiry.budget_paise, 0),
    p_target_delivery_date,
    auth.uid()
  )
  RETURNING id INTO v_booking_id;

  -- Create events from v_enquiry.events jsonb if available
  IF v_enquiry.events IS NOT NULL AND jsonb_typeof(v_enquiry.events) = 'array' AND jsonb_array_length(v_enquiry.events) > 0 THEN
    v_has_multi_events := true;
    FOR v_event_item IN SELECT * FROM jsonb_array_elements(v_enquiry.events)
    LOOP
      v_sort := v_sort + 1;
      v_event_type := COALESCE(v_event_item->>'eventType', v_event_item->>'event_type', v_enquiry.event_type::text, 'wedding');
      v_event_name := COALESCE(v_event_item->>'name', v_event_item->>'venue', 'Celebration Event');
      v_event_date := COALESCE(v_event_item->>'eventDate', v_event_item->>'event_date', v_enquiry.event_date::text);
      v_venue_name := COALESCE(v_event_item->>'venue', v_event_item->>'venueName', v_enquiry.venue, 'TBD');

      IF v_event_date IS NOT NULL AND v_event_date <> '' THEN
        INSERT INTO public.events (
          booking_id,
          event_type,
          name,
          event_date,
          venue_name,
          sort
        )
        VALUES (
          v_booking_id,
          v_event_type::public.event_type,
          v_event_name,
          v_event_date::date,
          v_venue_name,
          v_sort
        );
      END IF;
    END LOOP;
  END IF;

  -- Fallback: If no multi-events were added, use primary enquiry event
  IF NOT v_has_multi_events AND v_enquiry.event_date IS NOT NULL THEN
    INSERT INTO public.events (
      booking_id,
      event_type,
      name,
      event_date,
      venue_name,
      sort
    )
    VALUES (
      v_booking_id,
      v_enquiry.event_type,
      COALESCE(v_enquiry.venue, 'Main Celebration'),
      v_enquiry.event_date,
      COALESCE(v_enquiry.venue, 'TBD'),
      1
    );
  END IF;

  -- Initialize 9 delivery stages
  PERFORM public.init_booking_delivery_pipeline(v_booking_id, p_target_delivery_date);

  -- Update enquiry status to won & link booking
  UPDATE public.enquiries
  SET
    status = 'won',
    converted_booking_id = v_booking_id,
    updated_at = now()
  WHERE id = p_enquiry_id;

  RETURN v_booking_id;
END;
$$;

-- 3. Enhanced create_booking_from_quotation function
CREATE OR REPLACE FUNCTION public.create_booking_from_quotation(
  p_quotation_id uuid,
  p_target_delivery_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quotation RECORD;
  v_enquiry RECORD;
  v_item RECORD;
  v_booking_id uuid;
  v_booking_number text;
  v_event_item jsonb;
  v_has_multi_events boolean := false;
  v_event_type text;
  v_event_name text;
  v_event_date text;
  v_venue_name text;
  v_sort int := 0;
BEGIN
  SELECT * INTO v_quotation FROM public.quotations WHERE id = p_quotation_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Quotation % not found', p_quotation_id;
  END IF;

  -- Generate atomic document number
  v_booking_number := app.next_document_number('BK');

  -- Create booking atomically
  INSERT INTO public.bookings (
    booking_number,
    client_id,
    enquiry_id,
    quotation_id,
    status,
    contract_total_paise,
    notes,
    target_delivery_date,
    created_by
  )
  VALUES (
    v_booking_number,
    v_quotation.client_id,
    v_quotation.enquiry_id,
    p_quotation_id,
    'confirmed',
    v_quotation.total_paise,
    v_quotation.notes_to_client,
    p_target_delivery_date,
    auth.uid()
  )
  RETURNING id INTO v_booking_id;

  -- Copy line items from quotation (BK-10)
  FOR v_item IN
    SELECT * FROM public.quotation_items WHERE quotation_id = p_quotation_id ORDER BY sort
  LOOP
    INSERT INTO public.booking_line_items (
      booking_id,
      sort,
      description,
      quantity,
      unit_price_paise,
      line_total_paise
    )
    VALUES (
      v_booking_id,
      v_item.sort,
      v_item.description,
      v_item.quantity,
      v_item.unit_price_paise,
      v_item.line_total_paise
    );
  END LOOP;

  -- Check quotation.events first
  IF v_quotation.events IS NOT NULL AND jsonb_typeof(v_quotation.events) = 'array' AND jsonb_array_length(v_quotation.events) > 0 THEN
    v_has_multi_events := true;
    FOR v_event_item IN SELECT * FROM jsonb_array_elements(v_quotation.events)
    LOOP
      v_sort := v_sort + 1;
      v_event_type := COALESCE(v_event_item->>'eventType', v_event_item->>'event_type', 'wedding');
      v_event_name := COALESCE(v_event_item->>'name', v_event_item->>'venue', 'Celebration Event');
      v_event_date := COALESCE(v_event_item->>'eventDate', v_event_item->>'event_date', v_quotation.event_date::text);
      v_venue_name := COALESCE(v_event_item->>'venue', v_event_item->>'venueName', 'Main Venue');

      IF v_event_date IS NOT NULL AND v_event_date <> '' THEN
        INSERT INTO public.events (
          booking_id,
          event_type,
          name,
          event_date,
          venue_name,
          sort
        )
        VALUES (
          v_booking_id,
          v_event_type::public.event_type,
          v_event_name,
          v_event_date::date,
          v_venue_name,
          v_sort
        );
      END IF;
    END LOOP;
  END IF;

  -- If not on quotation, check linked enquiry.events
  IF NOT v_has_multi_events AND v_quotation.enquiry_id IS NOT NULL THEN
    SELECT * INTO v_enquiry FROM public.enquiries WHERE id = v_quotation.enquiry_id;
    IF FOUND AND v_enquiry.events IS NOT NULL AND jsonb_typeof(v_enquiry.events) = 'array' AND jsonb_array_length(v_enquiry.events) > 0 THEN
      v_has_multi_events := true;
      FOR v_event_item IN SELECT * FROM jsonb_array_elements(v_enquiry.events)
      LOOP
        v_sort := v_sort + 1;
        v_event_type := COALESCE(v_event_item->>'eventType', v_event_item->>'event_type', v_enquiry.event_type::text, 'wedding');
        v_event_name := COALESCE(v_event_item->>'name', v_event_item->>'venue', 'Celebration Event');
        v_event_date := COALESCE(v_event_item->>'eventDate', v_event_item->>'event_date', v_enquiry.event_date::text);
        v_venue_name := COALESCE(v_event_item->>'venue', v_event_item->>'venueName', v_enquiry.venue, 'Main Venue');

        IF v_event_date IS NOT NULL AND v_event_date <> '' THEN
          INSERT INTO public.events (
            booking_id,
            event_type,
            name,
            event_date,
            venue_name,
            sort
          )
          VALUES (
            v_booking_id,
            v_event_type::public.event_type,
            v_event_name,
            v_event_date::date,
            v_venue_name,
            v_sort
          );
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Fallback to quotation event_date
  IF NOT v_has_multi_events AND v_quotation.event_date IS NOT NULL THEN
    INSERT INTO public.events (
      booking_id,
      event_type,
      name,
      event_date,
      venue_name,
      sort
    )
    VALUES (
      v_booking_id,
      'wedding',
      'Wedding Production',
      v_quotation.event_date,
      'Main Venue',
      1
    );
  END IF;

  -- Initialize 9 delivery stages
  PERFORM public.init_booking_delivery_pipeline(v_booking_id, p_target_delivery_date);

  -- Update quotation status to accepted
  UPDATE public.quotations
  SET
    status = 'accepted',
    accepted_at = COALESCE(accepted_at, now()),
    updated_at = now()
  WHERE id = p_quotation_id;

  -- If enquiry was linked, mark won
  IF v_quotation.enquiry_id IS NOT NULL THEN
    UPDATE public.enquiries
    SET
      status = 'won',
      converted_booking_id = v_booking_id,
      updated_at = now()
    WHERE id = v_quotation.enquiry_id;
  END IF;

  RETURN v_booking_id;
END;
$$;

-- 4. Schema grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, authenticated, service_role;
