-- Migration 008: Bookings, Events, Crew, and Schedule
-- Spec: DATABASE_SCHEMA §8, BUSINESS_WORKFLOWS §2.3, §3.4, §3.5, §3.8, D-34, D-35

-- 1. Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id),
  enquiry_id uuid REFERENCES public.enquiries(id),
  quotation_id uuid REFERENCES public.quotations(id),
  status public.booking_status NOT NULL DEFAULT 'confirmed',
  contract_total_paise bigint NOT NULL CHECK (contract_total_paise >= 0),
  notes text,
  target_delivery_date date,
  cancelled_at timestamptz,
  cancellation_reason text,
  cancellation_fee_paise bigint DEFAULT 0 CHECK (cancellation_fee_paise >= 0),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT check_booking_cancellation CHECK (status <> 'cancelled' OR cancellation_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_quotation_id ON public.bookings(quotation_id);
CREATE INDEX IF NOT EXISTS idx_bookings_deleted_at ON public.bookings(deleted_at);

-- 2. Booking Line Items Table
CREATE TABLE IF NOT EXISTS public.booking_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sort int NOT NULL DEFAULT 0,
  description text NOT NULL,
  quantity int NOT NULL CHECK (quantity > 0),
  unit_price_paise bigint NOT NULL CHECK (unit_price_paise >= 0),
  line_total_paise bigint NOT NULL CHECK (line_total_paise >= 0)
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id ON public.booking_line_items(booking_id);

-- 3. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  event_type public.event_type NOT NULL,
  name text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  venue_name text NOT NULL,
  venue_address text,
  requirements text,
  equipment_notes text,
  sort int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT check_event_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_events_booking_id ON public.events(booking_id);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_deleted_at ON public.events(deleted_at);

-- 4. Crew Members Table
CREATE TABLE IF NOT EXISTS public.crew_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid UNIQUE REFERENCES public.profiles(id),
  full_name text NOT NULL,
  role public.crew_role NOT NULL,
  crew_type public.crew_type NOT NULL,
  phone text NOT NULL,
  email citext,
  rate_paise bigint CHECK (rate_paise IS NULL OR rate_paise >= 0),
  rate_unit text CHECK (rate_unit IS NULL OR rate_unit IN ('per_day', 'per_event')),
  bank_details_enc text,
  portfolio_url text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_members_profile_id ON public.crew_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_role ON public.crew_members(role);
CREATE INDEX IF NOT EXISTS idx_crew_members_is_active ON public.crew_members(is_active);

-- 5. Event Crew Assignments Table
CREATE TABLE IF NOT EXISTS public.event_crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  crew_member_id uuid NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  role public.event_assignment_role NOT NULL,
  rate_override_paise bigint CHECK (rate_override_paise IS NULL OR rate_override_paise >= 0),
  confirmed_at timestamptz,
  notes text,
  override_reason text,
  override_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, crew_member_id)
);

CREATE INDEX IF NOT EXISTS idx_event_crew_assignments_event_id ON public.event_crew_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_crew_assignments_crew_member ON public.event_crew_assignments(crew_member_id);

-- 6. Crew Unavailability Table
CREATE TABLE IF NOT EXISTS public.crew_unavailability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id uuid NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,
  from_ts timestamptz NOT NULL,
  to_ts timestamptz NOT NULL,
  reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_crew_unavailability_range CHECK (to_ts > from_ts)
);

CREATE INDEX IF NOT EXISTS idx_crew_unavailability_crew_member ON public.crew_unavailability(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_crew_unavailability_range ON public.crew_unavailability(from_ts, to_ts);

-- 7. Crew Pay Records Table
CREATE TABLE IF NOT EXISTS public.crew_pay_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_member_id uuid NOT NULL REFERENCES public.crew_members(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id),
  event_id uuid REFERENCES public.events(id),
  work_dates date[],
  agreed_paise bigint NOT NULL CHECK (agreed_paise >= 0),
  paid_paise bigint NOT NULL DEFAULT 0 CHECK (paid_paise >= 0 AND paid_paise <= agreed_paise),
  status public.crew_pay_status NOT NULL DEFAULT 'unpaid',
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crew_pay_records_crew_member ON public.crew_pay_records(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_crew_pay_records_booking_id ON public.crew_pay_records(booking_id);

-- 8. Minimal Delivery Pipeline Placeholder (as instructed in Task 2)
CREATE TABLE IF NOT EXISTS public.delivery_pipelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  target_date date,
  completed_at timestamptz,
  notes text,
  share_token_hash text UNIQUE,
  share_expires_at timestamptz,
  share_revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.delivery_pipelines(id) ON DELETE CASCADE,
  stage_code public.delivery_stage_code NOT NULL,
  sort smallint NOT NULL CHECK (sort BETWEEN 1 AND 9),
  status public.delivery_stage_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  completed_at timestamptz,
  blocked_reason text,
  notes text,
  CONSTRAINT check_stage_blocked_reason CHECK (status <> 'blocked' OR blocked_reason IS NOT NULL),
  UNIQUE (pipeline_id, stage_code),
  UNIQUE (pipeline_id, sort)
);

-- 9. Views
-- A. Money-free View for Staff and Crew (RBAC §5, D-35)
CREATE OR REPLACE VIEW public.bookings_ops_v AS
SELECT
  b.id,
  b.booking_number,
  b.client_id,
  c.full_name AS client_name,
  b.enquiry_id,
  b.quotation_id,
  b.status,
  b.notes,
  b.target_delivery_date,
  b.cancelled_at,
  b.cancellation_reason,
  b.created_by,
  b.created_at,
  b.updated_at,
  b.deleted_at,
  COALESCE(
    (SELECT count(*)::int FROM public.events e WHERE e.booking_id = b.id AND e.deleted_at IS NULL),
    0
  ) AS event_count
FROM public.bookings b
JOIN public.clients c ON b.client_id = c.id;

-- B. Crew Event View (crew see only assigned events; client contact details stripped to prevent poaching)
CREATE OR REPLACE VIEW public.crew_event_v AS
SELECT
  eca.id AS assignment_id,
  eca.crew_member_id,
  cm.profile_id,
  e.id AS event_id,
  e.booking_id,
  b.booking_number,
  c.full_name AS client_name,
  e.name AS event_name,
  e.event_type,
  e.event_date,
  e.start_time,
  e.end_time,
  e.venue_name,
  e.venue_address,
  e.requirements,
  e.equipment_notes,
  eca.role AS assigned_role,
  eca.confirmed_at,
  eca.notes AS assignment_notes
FROM public.event_crew_assignments eca
JOIN public.events e ON eca.event_id = e.id AND e.deleted_at IS NULL
JOIN public.bookings b ON e.booking_id = b.id AND b.deleted_at IS NULL
JOIN public.clients c ON b.client_id = c.id
JOIN public.crew_members cm ON eca.crew_member_id = cm.id;

-- 10. Conflict Check Helper
CREATE OR REPLACE FUNCTION public.check_crew_conflicts(
  p_crew_member_id uuid,
  p_event_date date,
  p_start_time time DEFAULT NULL,
  p_end_time time DEFAULT NULL,
  p_exclude_event_id uuid DEFAULT NULL
)
RETURNS TABLE (
  conflict_type text,
  conflict_details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_start timestamptz;
  v_event_end timestamptz;
BEGIN
  -- Interpret start and end as timestamp in IST for the event date
  v_event_start := (p_event_date || ' ' || COALESCE(p_start_time, '00:00:00'::time))::timestamp AT TIME ZONE 'Asia/Kolkata';
  v_event_end := (p_event_date || ' ' || COALESCE(p_end_time, '23:59:59'::time))::timestamp AT TIME ZONE 'Asia/Kolkata';

  -- 1. Check unavailability
  RETURN QUERY
  SELECT
    'unavailability'::text,
    COALESCE(cu.reason, 'Crew marked unavailable from ' || cu.from_ts::text || ' to ' || cu.to_ts::text)::text
  FROM public.crew_unavailability cu
  WHERE cu.crew_member_id = p_crew_member_id
    AND tstzrange(cu.from_ts, cu.to_ts) && tstzrange(v_event_start, v_event_end);

  -- 2. Check other assigned events on the same date (excluding cancelled bookings)
  RETURN QUERY
  SELECT
    'assignment_overlap'::text,
    ('Assigned to event "' || e.name || '" on ' || e.event_date::text || ' (' || b.booking_number || ')')::text
  FROM public.event_crew_assignments eca
  JOIN public.events e ON eca.event_id = e.id AND e.deleted_at IS NULL
  JOIN public.bookings b ON e.booking_id = b.id AND b.deleted_at IS NULL AND b.status <> 'cancelled'
  WHERE eca.crew_member_id = p_crew_member_id
    AND e.event_date = p_event_date
    AND (p_exclude_event_id IS NULL OR e.id <> p_exclude_event_id)
    AND (
      -- If both events have times, check overlap; otherwise flag full-day conflict
      (p_start_time IS NULL OR p_end_time IS NULL OR e.start_time IS NULL OR e.end_time IS NULL)
      OR
      (p_start_time < e.end_time AND p_end_time > e.start_time)
    );
END;
$$;

-- 11. Assign Crew Function with Enforcement
CREATE OR REPLACE FUNCTION public.assign_crew(
  p_event_id uuid,
  p_crew_member_id uuid,
  p_role public.event_assignment_role,
  p_rate_override_paise bigint DEFAULT NULL,
  p_override_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_conflict RECORD;
  v_has_conflicts boolean := false;
  v_conflict_summary text := '';
  v_assignment_id uuid;
BEGIN
  -- Get event details
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event % not found', p_event_id;
  END IF;

  -- Check conflicts
  FOR v_conflict IN
    SELECT * FROM public.check_crew_conflicts(
      p_crew_member_id,
      v_event.event_date,
      v_event.start_time,
      v_event.end_time,
      p_event_id
    )
  LOOP
    v_has_conflicts := true;
    v_conflict_summary := v_conflict_summary || '[' || v_conflict.conflict_type || ': ' || v_conflict.conflict_details || '] ';
  END LOOP;

  -- Enforce override requirement if conflict exists (D-34, BK-05)
  IF v_has_conflicts AND (p_override_reason IS NULL OR trim(p_override_reason) = '') THEN
    RAISE EXCEPTION 'CREW_CONFLICT: Cannot assign crew member due to scheduling conflict: %. An explicit override reason is required.', v_conflict_summary;
  END IF;

  -- Upsert assignment
  INSERT INTO public.event_crew_assignments (
    event_id,
    crew_member_id,
    role,
    rate_override_paise,
    override_reason,
    override_by
  )
  VALUES (
    p_event_id,
    p_crew_member_id,
    p_role,
    p_rate_override_paise,
    CASE WHEN v_has_conflicts THEN p_override_reason ELSE NULL END,
    CASE WHEN v_has_conflicts THEN auth.uid() ELSE NULL END
  )
  ON CONFLICT (event_id, crew_member_id) DO UPDATE SET
    role = EXCLUDED.role,
    rate_override_paise = EXCLUDED.rate_override_paise,
    override_reason = EXCLUDED.override_reason,
    override_by = EXCLUDED.override_by
  RETURNING id INTO v_assignment_id;

  RETURN v_assignment_id;
END;
$$;

-- 12. Helper to Initialize the 9 Delivery Stages for a Booking
CREATE OR REPLACE FUNCTION public.init_booking_delivery_pipeline(
  p_booking_id uuid,
  p_target_date date DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pipeline_id uuid;
  v_stages public.delivery_stage_code[] := ARRAY[
    'raw_ingest',
    'culling',
    'audio_sync',
    'first_cut',
    'colour_grading',
    'sound_design',
    'client_review',
    'final_exports',
    'archival'
  ]::public.delivery_stage_code[];
  i int;
BEGIN
  INSERT INTO public.delivery_pipelines (booking_id, target_date)
  VALUES (p_booking_id, p_target_date)
  RETURNING id INTO v_pipeline_id;

  FOR i IN 1..9 LOOP
    INSERT INTO public.delivery_stages (pipeline_id, stage_code, sort, status)
    VALUES (v_pipeline_id, v_stages[i], i, 'pending');
  END LOOP;

  RETURN v_pipeline_id;
END;
$$;

-- 13. Convert Enquiry to Booking
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

  -- Create initial event if enquiry had date
  IF v_enquiry.event_date IS NOT NULL THEN
    INSERT INTO public.events (
      booking_id,
      event_type,
      name,
      event_date,
      venue_name
    )
    VALUES (
      v_booking_id,
      v_enquiry.eventType,
      COALESCE(v_enquiry.venue, 'Main Celebration'),
      v_enquiry.event_date,
      COALESCE(v_enquiry.venue, 'TBD')
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

-- 14. Create Booking from Quotation
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
  v_item RECORD;
  v_booking_id uuid;
  v_booking_number text;
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

  -- Create initial event if quotation had event_date
  IF v_quotation.event_date IS NOT NULL THEN
    INSERT INTO public.events (
      booking_id,
      event_type,
      name,
      event_date,
      venue_name
    )
    VALUES (
      v_booking_id,
      'wedding',
      'Wedding Production',
      v_quotation.event_date,
      'Main Venue'
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

-- 15. Cancel Booking Function
CREATE OR REPLACE FUNCTION public.cancel_booking(
  p_booking_id uuid,
  p_reason text,
  p_fee_paise bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Cancellation reason is strictly required';
  END IF;

  -- Invoices remain untouched per D-35
  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = trim(p_reason),
    cancellation_fee_paise = COALESCE(p_fee_paise, 0),
    updated_at = now()
  WHERE id = p_booking_id;
END;
$$;
