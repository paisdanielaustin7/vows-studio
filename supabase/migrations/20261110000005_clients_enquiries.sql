-- VOWS Studio — Migration 005: Clients, Enquiries, Follow-ups, and Activities
-- Specs: DATABASE_SCHEMA §5, §13, §14, BUSINESS_WORKFLOWS §2.1, §2.2, §3.1, §3.2

-- 1. Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  state_code char(2),
  pincode text,
  gstin text,
  referral_source enquiry_source DEFAULT 'other',
  notes text,
  search tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(full_name, '') || ' ' || coalesce(city, ''))
  ) STORED,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS clients_search_idx ON public.clients USING GIN (search);
CREATE INDEX IF NOT EXISTS clients_full_name_trgm_idx ON public.clients USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS clients_created_at_idx ON public.clients (created_at DESC);

CREATE TRIGGER clients_touch_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER clients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 2. Client Phones (Max 3, exactly one primary)
CREATE TABLE IF NOT EXISTS public.client_phones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  phone_e164 text NOT NULL,
  label text DEFAULT 'Mobile',
  is_primary boolean NOT NULL DEFAULT false,
  is_international boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_phones_format CHECK (is_international OR phone_e164 ~ '^\+91[6-9][0-9]{9}$'),
  CONSTRAINT client_phones_unique UNIQUE (client_id, phone_e164)
);

CREATE INDEX IF NOT EXISTS client_phones_lookup_idx ON public.client_phones (phone_e164);
CREATE INDEX IF NOT EXISTS client_phones_client_idx ON public.client_phones (client_id);

-- Enforce max 3 phones per client and single primary
CREATE OR REPLACE FUNCTION app.client_phones_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_client_id uuid;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT count(*) INTO v_count
    FROM public.client_phones
    WHERE client_id = v_client_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_count >= 3 THEN
      RAISE EXCEPTION 'A client can have a maximum of 3 phone numbers.';
    END IF;

    -- If this is marked primary, unmark other phones
    IF NEW.is_primary = true THEN
      UPDATE public.client_phones
      SET is_primary = false
      WHERE client_id = v_client_id AND id <> NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER client_phones_guard_trigger
  BEFORE INSERT OR UPDATE ON public.client_phones
  FOR EACH ROW EXECUTE FUNCTION app.client_phones_guard();

-- 3. Client Emails (Max 2, exactly one primary)
CREATE TABLE IF NOT EXISTS public.client_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email citext NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_emails_unique UNIQUE (client_id, email)
);

CREATE INDEX IF NOT EXISTS client_emails_lookup_idx ON public.client_emails (email);
CREATE INDEX IF NOT EXISTS client_emails_client_idx ON public.client_emails (client_id);

CREATE OR REPLACE FUNCTION app.client_emails_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
  v_client_id uuid;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT count(*) INTO v_count
    FROM public.client_emails
    WHERE client_id = v_client_id AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

    IF v_count >= 2 THEN
      RAISE EXCEPTION 'A client can have a maximum of 2 email addresses.';
    END IF;

    IF NEW.is_primary = true THEN
      UPDATE public.client_emails
      SET is_primary = false
      WHERE client_id = v_client_id AND id <> NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER client_emails_guard_trigger
  BEFORE INSERT OR UPDATE ON public.client_emails
  FOR EACH ROW EXECUTE FUNCTION app.client_emails_guard();

-- 4. Enquiries
CREATE TABLE IF NOT EXISTS public.enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id),
  guest_name text,
  guest_phone text,
  guest_email citext,
  event_type event_type NOT NULL,
  event_date date,
  event_date_is_approx boolean DEFAULT true,
  venue text,
  guest_count integer,
  services_interested text[],
  budget_paise bigint,
  source enquiry_source NOT NULL DEFAULT 'other',
  status enquiry_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES public.profiles(id),
  message text,
  notes text,
  lost_reason text,
  converted_booking_id uuid,
  consent_given_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT enquiries_client_or_guest CHECK (client_id IS NOT NULL OR guest_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS enquiries_status_idx ON public.enquiries (status, created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_assigned_idx ON public.enquiries (assigned_to);
CREATE INDEX IF NOT EXISTS enquiries_client_idx ON public.enquiries (client_id);
CREATE INDEX IF NOT EXISTS enquiries_date_idx ON public.enquiries (event_date);

CREATE TRIGGER enquiries_touch_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER enquiries_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 5. Follow-ups
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enquiry_id uuid NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
  due_at timestamptz NOT NULL,
  note text,
  assigned_to uuid NOT NULL REFERENCES public.profiles(id),
  status follow_up_status NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  completed_by uuid REFERENCES public.profiles(id),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS follow_ups_status_due_idx ON public.follow_ups (status, due_at);
CREATE INDEX IF NOT EXISTS follow_ups_enquiry_idx ON public.follow_ups (enquiry_id);

CREATE TRIGGER follow_ups_touch_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- 6. Activities (Unified client feed)
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  actor_id uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activities_client_idx ON public.activities (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activities_entity_idx ON public.activities (entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
