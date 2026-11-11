-- VOWS Studio — Migration 021: Setup Mode, Sample Data, and Data Reset Functions
-- Reference: DATABASE_SCHEMA §12, DECISION_LOG D-43, SECURITY_PLAN §10.5, §12.5

-- 1. Setup Mode and Go-Live Lock on business_settings
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS setup_mode boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS setup_locked_at timestamptz;

-- 2. Add is_sample column to business entity tables for targeted sample resets
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.crew_members ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.portfolio_items ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.manual_income_entries ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false;

-- 3. Update public.fn_block_mutation to honour the transaction-local flag app.reset_in_progress
CREATE OR REPLACE FUNCTION public.fn_block_mutation()
RETURNS trigger AS $$
BEGIN
  IF current_setting('app.reset_in_progress', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Deletion of % is prohibited by regulatory and financial integrity rules (D-21, D-22)', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

-- 4. app.lock_setup: Permanent go-live lock (D-43, SECURITY_PLAN §12.5)
CREATE OR REPLACE FUNCTION app.lock_setup(p_actor_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_setup boolean;
BEGIN
  SELECT setup_mode INTO v_is_setup
  FROM public.business_settings
  WHERE id = 1
  FOR UPDATE;

  IF NOT v_is_setup THEN
    RAISE EXCEPTION 'Setup is already permanently locked. Re-locking is prohibited.';
  END IF;

  UPDATE public.business_settings
  SET setup_mode = false,
      setup_locked_at = now(),
      updated_at = now()
  WHERE id = 1;

  -- Write setup_lock audit entry
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    actor_user_id,
    new_values
  ) VALUES (
    'setup_lock',
    'business_settings',
    '00000000-0000-0000-0000-000000000001'::uuid,
    p_actor_id,
    jsonb_build_object(
      'setup_mode', false,
      'setup_locked_at', now(),
      'locked_by', p_actor_id
    )
  );
END;
$$;

-- 5. app.anonymise_client: DPDP 2023 compliance erasure (SECURITY_PLAN §10.5)
CREATE OR REPLACE FUNCTION app.anonymise_client(
  p_client_id uuid,
  p_actor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_exists boolean;
  v_short_id text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.clients WHERE id = p_client_id
  ) INTO v_exists;

  IF NOT v_exists THEN
    RAISE EXCEPTION 'Client % not found for anonymisation', p_client_id;
  END IF;

  v_short_id := substr(p_client_id::text, 1, 8);

  -- Remove personal contact records
  DELETE FROM public.client_phones WHERE client_id = p_client_id;
  DELETE FROM public.client_emails WHERE client_id = p_client_id;

  -- Replace client record details with neutral placeholders
  UPDATE public.clients
  SET full_name = 'Anonymised Client (' || v_short_id || ')',
      notes = NULL,
      address_line1 = NULL,
      address_line2 = NULL,
      city = NULL,
      state = NULL,
      pincode = NULL,
      gstin = NULL,
      updated_at = now()
  WHERE id = p_client_id;

  -- Scrub personal contact fields on linked enquiries (SECURITY_PLAN §10.5)
  UPDATE public.enquiries
  SET guest_name = 'Anonymised (' || v_short_id || ')',
      guest_phone = NULL,
      guest_email = NULL,
      message = NULL,
      updated_at = now()
  WHERE client_id = p_client_id;

  -- Write audit log entry
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    actor_user_id,
    new_values
  ) VALUES (
    'update',
    'clients',
    p_client_id,
    p_actor_id,
    jsonb_build_object(
      'anonymised', true,
      'anonymised_at', now(),
      'actor_id', p_actor_id
    )
  );
END;
$$;

-- 6. app.reset_business_data: Multi-scope business data reset wizard (D-43, DATABASE_SCHEMA §12)
CREATE OR REPLACE FUNCTION app.reset_business_data(
  p_scopes text[],
  p_restart_numbering boolean DEFAULT false,
  p_clear_audit boolean DEFAULT false,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setup_mode boolean;
  v_app_mode text;
  v_counts jsonb := '{}'::jsonb;
  v_del_count int;
  v_scope text;
BEGIN
  -- 1. Authorization & Refusal Check (D-43)
  SELECT setup_mode INTO v_setup_mode
  FROM public.business_settings
  WHERE id = 1;

  v_app_mode := coalesce(current_setting('app.mode', true), 'production');

  IF NOT v_setup_mode AND v_app_mode <> 'demo' THEN
    RAISE EXCEPTION 'Data reset is permanently disabled in production because setup is locked (D-43).';
  END IF;

  IF p_clear_audit AND NOT v_setup_mode THEN
    RAISE EXCEPTION 'Audit log can only be cleared during setup mode.';
  END IF;

  -- 2. Set transaction-local flag honoured by block_mutation triggers
  PERFORM set_config('app.reset_in_progress', 'on', true);

  -- 3. Execute deletes in dependency order per requested scopes
  FOREACH v_scope IN ARRAY p_scopes LOOP
    IF v_scope = 'sample_data_only' OR v_scope = 'sample' THEN
      -- Delete only sample data rows in FK dependency order
      DELETE FROM public.reviews WHERE booking_id IN (SELECT id FROM public.bookings WHERE is_sample = true);
      DELETE FROM public.review_requests WHERE booking_id IN (SELECT id FROM public.bookings WHERE is_sample = true);
      DELETE FROM public.delivery_pipelines WHERE booking_id IN (SELECT id FROM public.bookings WHERE is_sample = true);
      DELETE FROM public.receipts WHERE payment_id IN (SELECT id FROM public.payments WHERE is_sample = true);
      DELETE FROM public.payment_allocations WHERE payment_id IN (SELECT id FROM public.payments WHERE is_sample = true);
      DELETE FROM public.payments WHERE is_sample = true;
      DELETE FROM public.credit_note_items WHERE credit_note_id IN (SELECT id FROM public.credit_notes WHERE is_sample = true);
      DELETE FROM public.credit_notes WHERE is_sample = true;
      DELETE FROM public.invoice_items WHERE invoice_id IN (SELECT id FROM public.invoices WHERE is_sample = true);
      DELETE FROM public.invoices WHERE is_sample = true;
      DELETE FROM public.crew_pay_payments WHERE crew_pay_id IN (SELECT id FROM public.crew_pay_records WHERE booking_id IN (SELECT id FROM public.bookings WHERE is_sample = true));
      DELETE FROM public.crew_pay_records WHERE booking_id IN (SELECT id FROM public.bookings WHERE is_sample = true);
      DELETE FROM public.events WHERE is_sample = true;
      DELETE FROM public.bookings WHERE is_sample = true;
      DELETE FROM public.quotations WHERE is_sample = true;
      DELETE FROM public.expenses WHERE is_sample = true;
      DELETE FROM public.manual_income_entries WHERE is_sample = true;
      DELETE FROM public.portfolio_items WHERE is_sample = true;
      DELETE FROM public.crew_members WHERE is_sample = true;
      DELETE FROM public.packages WHERE is_sample = true;
      DELETE FROM public.services WHERE is_sample = true;
      DELETE FROM public.clients WHERE is_sample = true;
      v_counts := v_counts || jsonb_build_object('sample_data', 'purged');

    ELSIF v_scope = 'clients_and_dependants' OR v_scope = 'clients' THEN
      -- Full client graph deletion
      DELETE FROM public.reviews;
      DELETE FROM public.review_requests;
      DELETE FROM public.delivery_stages;
      DELETE FROM public.delivery_pipelines;
      DELETE FROM public.receipts;
      DELETE FROM public.payment_allocations;
      DELETE FROM public.payments;
      DELETE FROM public.credit_note_items;
      DELETE FROM public.credit_notes;
      DELETE FROM public.invoice_items;
      DELETE FROM public.invoices;
      DELETE FROM public.crew_pay_payments;
      DELETE FROM public.crew_pay_records;
      DELETE FROM public.event_crew_assignments;
      DELETE FROM public.events;
      DELETE FROM public.booking_line_items;
      DELETE FROM public.bookings;
      DELETE FROM public.quotation_items;
      DELETE FROM public.quotations;
      DELETE FROM public.follow_ups;
      DELETE FROM public.enquiries;
      DELETE FROM public.client_phones;
      DELETE FROM public.client_emails;
      GET DIAGNOSTICS v_del_count = ROW_COUNT;
      DELETE FROM public.clients;
      GET DIAGNOSTICS v_del_count = ROW_COUNT;
      v_counts := v_counts || jsonb_build_object('clients', v_del_count);

    ELSIF v_scope = 'finance_only' OR v_scope = 'finance' THEN
      -- Financial records only
      DELETE FROM public.receipts;
      DELETE FROM public.payment_allocations;
      DELETE FROM public.payments;
      DELETE FROM public.credit_note_items;
      DELETE FROM public.credit_notes;
      DELETE FROM public.invoice_items;
      DELETE FROM public.invoices;
      DELETE FROM public.crew_pay_payments;
      DELETE FROM public.crew_pay_records;
      DELETE FROM public.expenses;
      DELETE FROM public.manual_income_entries;
      v_counts := v_counts || jsonb_build_object('finance', 'cleared');

    ELSIF v_scope = 'crew' THEN
      -- Crew members and availability
      DELETE FROM public.crew_unavailability;
      DELETE FROM public.event_crew_assignments;
      DELETE FROM public.crew_pay_records;
      DELETE FROM public.crew_members;
      GET DIAGNOSTICS v_del_count = ROW_COUNT;
      v_counts := v_counts || jsonb_build_object('crew_members', v_del_count);

    ELSIF v_scope = 'catalogue' THEN
      -- Services, packages, quotation templates
      DELETE FROM public.quotation_template_items;
      DELETE FROM public.quotation_templates;
      DELETE FROM public.package_items;
      DELETE FROM public.package_prices;
      DELETE FROM public.packages;
      DELETE FROM public.service_prices;
      DELETE FROM public.services;
      v_counts := v_counts || jsonb_build_object('catalogue', 'cleared');

    ELSIF v_scope = 'portfolio_and_website' OR v_scope = 'portfolio' THEN
      -- Portfolio and website content
      DELETE FROM public.portfolio_images;
      DELETE FROM public.portfolio_items;
      DELETE FROM public.faq_items;
      v_counts := v_counts || jsonb_build_object('portfolio', 'cleared');

    ELSIF v_scope = 'notifications_activity' OR v_scope = 'notifications' THEN
      -- Notifications, activities, email logs
      DELETE FROM public.notifications;
      DELETE FROM public.activities;
      DELETE FROM public.email_send_log;
      v_counts := v_counts || jsonb_build_object('notifications_and_activity', 'cleared');
    END IF;
  END LOOP;

  -- 4. Optionally restart document numbering sequence at 000001
  IF p_restart_numbering THEN
    UPDATE app.document_sequences SET last_value = 0;
    v_counts := v_counts || jsonb_build_object('numbering_restarted', true);
  END IF;

  -- 5. Optionally clear audit log (allowed only in setup mode)
  IF p_clear_audit AND v_setup_mode THEN
    DELETE FROM public.audit_log;
    v_counts := v_counts || jsonb_build_object('audit_log_cleared', true);
  END IF;

  -- 6. Log data_reset in audit_log
  INSERT INTO public.audit_log (
    action,
    table_name,
    record_id,
    actor_user_id,
    new_values
  ) VALUES (
    'data_reset',
    'business_settings',
    '00000000-0000-0000-0000-000000000001'::uuid,
    p_actor_id,
    jsonb_build_object(
      'scopes', p_scopes,
      'restart_numbering', p_restart_numbering,
      'cleared_audit', p_clear_audit,
      'counts', v_counts,
      'reset_at', now(),
      'actor_id', p_actor_id
    )
  );

  RETURN v_counts;
END;
$$;

-- 7. app.load_sample_data: Synthetic "Lumina Studio" dataset (Portfolio Plan §6, D-43)
CREATE OR REPLACE FUNCTION app.load_sample_data(p_actor_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_setup_mode boolean;
  v_app_mode text;
  v_client_id uuid;
  v_service_id uuid;
  v_package_id uuid;
  v_crew_id uuid;
  v_booking_id uuid;
  v_invoice_id uuid;
  v_payment_id uuid;
  v_actor_id uuid;
  v_suffix text;
BEGIN
  -- Authorization check: setup mode or demo environment only
  SELECT setup_mode INTO v_setup_mode FROM public.business_settings WHERE id = 1;
  v_app_mode := coalesce(current_setting('app.mode', true), 'production');

  IF NOT v_setup_mode AND v_app_mode <> 'demo' THEN
    RAISE EXCEPTION 'Loading sample data is prohibited in locked production mode (D-43).';
  END IF;

  v_actor_id := COALESCE(p_actor_id, (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1));
  v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  -- 1. Sample Client
  INSERT INTO public.clients (
    full_name, address_line1, city, state, pincode, is_sample
  ) VALUES (
    'Kenneth & Rochelle Fernandes', 'Villa 4, Colva Road', 'Margao', 'Goa', '403601', true
  ) RETURNING id INTO v_client_id;

  INSERT INTO public.client_phones (client_id, phone_e164, is_primary)
  VALUES (v_client_id, '+910000000101', true);

  INSERT INTO public.client_emails (client_id, email, is_primary)
  VALUES (v_client_id, 'kenneth@demo.email', true);

  -- 2. Sample Catalogue Services
  INSERT INTO public.services (
    name, category, description, unit, is_sample
  ) VALUES (
    'Cinematic 35mm Wedding Reel', 'videography', 'Archival 35mm film grade documentary feature film', 'per_event', true
  ) RETURNING id INTO v_service_id;

  INSERT INTO public.service_prices (service_id, effective_from, price_paise)
  VALUES (v_service_id, '2026-01-01', 12500000);

  -- 3. Sample Catalogue Package
  INSERT INTO public.packages (
    name, description, is_sample
  ) VALUES (
    'Lumina Atelier Heirloom Collection', 'Full 3-day wedding celebration documentary with analog film stills and heirloom linen album', true
  ) RETURNING id INTO v_package_id;

  INSERT INTO public.package_prices (package_id, effective_from, price_paise)
  VALUES (v_package_id, '2026-01-01', 35000000);

  -- 4. Sample Crew Member
  INSERT INTO public.crew_members (
    full_name, phone, email, role, crew_type, is_sample
  ) VALUES (
    'Reuben Serrao', '+910000000102', 'reuben.serrao@demo.email', 'photographer', 'employee', true
  ) RETURNING id INTO v_crew_id;

  -- 5. Sample Booking (trigger initializes delivery pipeline)
  INSERT INTO public.bookings (
    client_id, booking_number, status, contract_total_paise, is_sample
  ) VALUES (
    v_client_id, 'BK-DEMO-' || v_suffix, 'confirmed', 35000000, true
  ) RETURNING id INTO v_booking_id;

  -- Sample Event
  INSERT INTO public.events (
    booking_id, name, event_type, event_date, start_time, end_time, venue_name, sort, is_sample
  ) VALUES (
    v_booking_id, 'Sanctuary Solemnization & Sunset Vows', 'wedding', CURRENT_DATE + interval '14 days', '10:00:00', '22:00:00', 'St. Aloysius Chapel & Heritage Courtyard', 1, true
  );

  -- 6. Update Sample Delivery Pipeline target_date created by booking trigger
  INSERT INTO public.delivery_pipelines (
    booking_id, target_date
  ) VALUES (
    v_booking_id, CURRENT_DATE + interval '45 days'
  )
  ON CONFLICT (booking_id) DO UPDATE
    SET target_date = EXCLUDED.target_date;

  -- 7. Sample Invoice & Payment (with allocation to preserve financial integrity)
  IF v_actor_id IS NOT NULL THEN
    INSERT INTO public.invoices (
      booking_id, client_id, invoice_number, status, issue_date, due_date,
      subtotal_paise, discount_paise, taxable_amount_paise, cgst_paise, sgst_paise, igst_paise, total_paise, paid_paise, credited_paise, created_by, is_sample
    ) VALUES (
      v_booking_id, v_client_id, 'INV-DEMO-' || v_suffix, 'paid', CURRENT_DATE - interval '7 days', CURRENT_DATE + interval '7 days',
      35000000, 0, 35000000, 0, 0, 0, 35000000, 35000000, 0, v_actor_id, true
    ) RETURNING id INTO v_invoice_id;

    INSERT INTO public.payments (
      client_id, payment_date, amount_paise, method, status, recorded_by, is_sample
    ) VALUES (
      v_client_id, CURRENT_DATE - interval '5 days', 35000000, 'bank_transfer', 'recorded', v_actor_id, true
    ) RETURNING id INTO v_payment_id;

    INSERT INTO public.payment_allocations (
      payment_id, invoice_id, amount_paise
    ) VALUES (
      v_payment_id, v_invoice_id, 35000000
    );
  END IF;

  RETURN jsonb_build_object(
    'sample_loaded', true,
    'client_id', v_client_id,
    'booking_id', v_booking_id
  );
END;
$$;
