-- VOWS Studio — Migration 013: Review Requests, Reviews, and Review Stats View
-- Reference: DATABASE_SCHEMA §10, §11, §12, BUSINESS_WORKFLOWS §2.8, §3.10, DECISION_LOG D-37

-- 1. Review Requests Table
-- Manages 30-day single-use invitation tokens for clients to submit testimonials.
CREATE TABLE IF NOT EXISTS public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  sent_at timestamptz,
  submitted_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Active unsubmitted review request partial unique index (D-37, REV-10)
-- Guarantees at most one active, non-revoked, unsubmitted review request per booking.
CREATE UNIQUE INDEX IF NOT EXISTS idx_review_requests_active_booking
  ON public.review_requests (booking_id)
  WHERE submitted_at IS NULL AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_review_requests_token_hash
  ON public.review_requests (token_hash);

CREATE INDEX IF NOT EXISTS idx_review_requests_booking
  ON public.review_requests (booking_id);

-- 2. Reviews Table
-- One submitted review per booking (REV-10). Status: pending -> approved | rejected.
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  review_request_id uuid REFERENCES public.review_requests(id) ON DELETE SET NULL,
  overall_rating smallint NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating smallint CHECK (communication_rating BETWEEN 1 AND 5),
  quality_rating smallint CHECK (quality_rating BETWEEN 1 AND 5),
  punctuality_rating smallint CHECK (punctuality_rating BETWEEN 1 AND 5),
  body text NOT NULL CHECK (char_length(body) >= 10),
  reviewer_name text NOT NULL,
  event_type public.event_type,
  event_date date,
  status public.review_status NOT NULL DEFAULT 'pending',
  moderation_note text,
  moderated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_status
  ON public.reviews (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_booking
  ON public.reviews (booking_id);

CREATE INDEX IF NOT EXISTS idx_reviews_client
  ON public.reviews (client_id);

-- Triggers for public.reviews
CREATE TRIGGER touch_updated_at_reviews
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER reviews_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 3. Review Stats View (DATABASE_SCHEMA §11)
-- Computes the aggregate overall rating, category averages, and approved count.
CREATE OR REPLACE VIEW public.review_stats_v AS
SELECT
  count(*)::integer AS total_reviews,
  coalesce(round(avg(overall_rating)::numeric, 2), 5.00) AS avg_overall_rating,
  coalesce(round(avg(communication_rating)::numeric, 2), 5.00) AS avg_communication_rating,
  coalesce(round(avg(quality_rating)::numeric, 2), 5.00) AS avg_quality_rating,
  coalesce(round(avg(punctuality_rating)::numeric, 2), 5.00) AS avg_punctuality_rating
FROM public.reviews
WHERE status = 'approved';

-- 4. Review Helper Functions (DATABASE_SCHEMA §12)

-- generate_review_request: Atomic creation of 30-day token request, revoking any previous active request
CREATE OR REPLACE FUNCTION public.generate_review_request(
  p_booking_id uuid,
  p_token_hash text,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id uuid;
  v_already_reviewed boolean;
BEGIN
  -- Check if review already exists for this booking (one review per booking rule)
  SELECT EXISTS (
    SELECT 1 FROM public.reviews WHERE booking_id = p_booking_id
  ) INTO v_already_reviewed;

  IF v_already_reviewed THEN
    RAISE EXCEPTION 'Booking % already has a submitted review', p_booking_id;
  END IF;

  -- Revoke any prior active unsubmitted review requests for this booking
  UPDATE public.review_requests
  SET revoked_at = now()
  WHERE booking_id = p_booking_id
    AND submitted_at IS NULL
    AND revoked_at IS NULL;

  -- Insert new review request with 30-day expiry
  INSERT INTO public.review_requests (
    booking_id,
    token_hash,
    expires_at,
    created_by
  ) VALUES (
    p_booking_id,
    p_token_hash,
    now() + interval '30 days',
    p_created_by
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- submit_review: Validates token, enforces single submission, marks request submitted, and inserts review
CREATE OR REPLACE FUNCTION public.submit_review(
  p_token_hash text,
  p_overall_rating smallint,
  p_communication_rating smallint,
  p_quality_rating smallint,
  p_punctuality_rating smallint,
  p_body text,
  p_reviewer_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request public.review_requests%ROWTYPE;
  v_booking public.bookings%ROWTYPE;
  v_event public.events%ROWTYPE;
  v_review_id uuid;
BEGIN
  -- 1. Validate request token
  SELECT * INTO v_request
  FROM public.review_requests
  WHERE token_hash = p_token_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid review token';
  END IF;

  IF v_request.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Review link has been revoked';
  END IF;

  IF v_request.submitted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Review has already been submitted for this commission';
  END IF;

  IF v_request.expires_at < now() THEN
    RAISE EXCEPTION 'Review link has expired';
  END IF;

  -- 2. Validate booking existence
  SELECT * INTO v_booking
  FROM public.bookings
  WHERE id = v_request.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Associated booking not found';
  END IF;

  -- 3. Check for primary/first event details
  SELECT * INTO v_event
  FROM public.events
  WHERE booking_id = v_booking.id
  ORDER BY event_date ASC
  LIMIT 1;

  -- 4. Mark request submitted
  UPDATE public.review_requests
  SET submitted_at = now()
  WHERE id = v_request.id;

  -- 5. Insert review in pending status
  INSERT INTO public.reviews (
    booking_id,
    client_id,
    review_request_id,
    overall_rating,
    communication_rating,
    quality_rating,
    punctuality_rating,
    body,
    reviewer_name,
    event_type,
    event_date,
    status
  ) VALUES (
    v_booking.id,
    v_booking.client_id,
    v_request.id,
    p_overall_rating,
    p_communication_rating,
    p_quality_rating,
    p_punctuality_rating,
    p_body,
    p_reviewer_name,
    v_event.event_type,
    v_event.event_date,
    'pending'
  )
  RETURNING id INTO v_review_id;

  RETURN v_review_id;
END;
$$;
