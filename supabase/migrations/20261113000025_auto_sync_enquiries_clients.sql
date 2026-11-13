-- Migration 025: Automatically sync enquiries with clients
-- Ensures every enquiry has a corresponding client record in public.clients,
-- creating client_phones and client_emails records, and linking enquiries.client_id.

CREATE OR REPLACE FUNCTION app.sync_enquiry_to_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_client_id uuid;
  v_phone_e164 text;
  v_is_intl boolean;
  v_clean_email text;
BEGIN
  -- If client_id is already present, do nothing
  IF NEW.client_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If guest_name is null or too short, cannot create client
  IF NEW.guest_name IS NULL OR length(trim(NEW.guest_name)) < 2 THEN
    RETURN NEW;
  END IF;

  -- Normalize phone if provided
  IF NEW.guest_phone IS NOT NULL AND length(trim(NEW.guest_phone)) > 0 THEN
    v_phone_e164 := regexp_replace(trim(NEW.guest_phone), '[\s\-()]', '', 'g');
    IF v_phone_e164 !~ '^\+' THEN
      IF v_phone_e164 ~ '^[6-9][0-9]{9}$' THEN
        v_phone_e164 := '+91' || v_phone_e164;
      ELSE
        v_phone_e164 := '+' || v_phone_e164;
      END IF;
    END IF;
    v_is_intl := NOT (v_phone_e164 ~ '^\+91[6-9][0-9]{9}$');

    -- Check if client already exists with this phone
    SELECT cp.client_id INTO v_client_id
    FROM public.client_phones cp
    WHERE cp.phone_e164 = v_phone_e164
    LIMIT 1;
  END IF;

  -- Check email if no phone match
  IF v_client_id IS NULL AND NEW.guest_email IS NOT NULL AND length(trim(NEW.guest_email)) > 0 THEN
    v_clean_email := lower(trim(NEW.guest_email));
    SELECT ce.client_id INTO v_client_id
    FROM public.client_emails ce
    WHERE lower(ce.email) = v_clean_email
    LIMIT 1;
  END IF;

  -- If client does not exist, create new client
  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (
      full_name,
      city,
      referral_source,
      notes,
      created_by
    ) VALUES (
      trim(NEW.guest_name),
      NEW.venue,
      NEW.source,
      NEW.notes,
      NEW.created_by
    ) RETURNING id INTO v_client_id;

    -- Insert phone if provided
    IF v_phone_e164 IS NOT NULL THEN
      INSERT INTO public.client_phones (
        client_id,
        phone_e164,
        is_primary,
        is_international,
        label
      ) VALUES (
        v_client_id,
        v_phone_e164,
        true,
        v_is_intl,
        'Mobile'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Insert email if provided
    IF v_clean_email IS NOT NULL THEN
      INSERT INTO public.client_emails (
        client_id,
        email,
        is_primary
      ) VALUES (
        v_client_id,
        v_clean_email,
        true
      ) ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Set client_id on the enquiry row
  NEW.client_id := v_client_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enquiries_sync_client_trigger ON public.enquiries;
CREATE TRIGGER enquiries_sync_client_trigger
  BEFORE INSERT OR UPDATE ON public.enquiries
  FOR EACH ROW
  EXECUTE FUNCTION app.sync_enquiry_to_client();

-- Backfill any existing enquiries where client_id is NULL
DO $$
DECLARE
  r RECORD;
  v_cid uuid;
  v_p text;
  v_intl boolean;
  v_em text;
BEGIN
  FOR r IN SELECT * FROM public.enquiries WHERE client_id IS NULL AND guest_name IS NOT NULL LOOP
    v_cid := NULL;
    v_p := NULL;
    v_em := NULL;

    IF r.guest_phone IS NOT NULL AND length(trim(r.guest_phone)) > 0 THEN
      v_p := regexp_replace(trim(r.guest_phone), '[\s\-()]', '', 'g');
      IF v_p !~ '^\+' THEN
        IF v_p ~ '^[6-9][0-9]{9}$' THEN
          v_p := '+91' || v_p;
        ELSE
          v_p := '+' || v_p;
        END IF;
      END IF;
      v_intl := NOT (v_p ~ '^\+91[6-9][0-9]{9}$');

      SELECT cp.client_id INTO v_cid FROM public.client_phones cp WHERE cp.phone_e164 = v_p LIMIT 1;
    END IF;

    IF v_cid IS NULL AND r.guest_email IS NOT NULL AND length(trim(r.guest_email)) > 0 THEN
      v_em := lower(trim(r.guest_email));
      SELECT ce.client_id INTO v_cid FROM public.client_emails ce WHERE lower(ce.email) = v_em LIMIT 1;
    END IF;

    IF v_cid IS NULL THEN
      INSERT INTO public.clients (full_name, city, referral_source, notes, created_by)
      VALUES (trim(r.guest_name), r.venue, r.source, r.notes, r.created_by)
      RETURNING id INTO v_cid;

      IF v_p IS NOT NULL THEN
        INSERT INTO public.client_phones (client_id, phone_e164, is_primary, is_international, label)
        VALUES (v_cid, v_p, true, v_intl, 'Mobile') ON CONFLICT DO NOTHING;
      END IF;

      IF v_em IS NOT NULL THEN
        INSERT INTO public.client_emails (client_id, email, is_primary)
        VALUES (v_cid, v_em, true) ON CONFLICT DO NOTHING;
      END IF;
    END IF;

    UPDATE public.enquiries SET client_id = v_cid WHERE id = r.id;
  END LOOP;
END;
$$;
