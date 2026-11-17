-- Migration 028: Flawless auth attempt tracking, reset on success, and System Admin lockout immunity

-- 1. Drop existing function to avoid parameter default mismatch (PostgreSQL error 42P13)
DROP FUNCTION IF EXISTS public.record_auth_attempt(text, text, boolean);
DROP FUNCTION IF EXISTS public.get_failed_auth_attempt_count(text, timestamptz);

-- 2. Update public.record_auth_attempt with defaults, cleanup on success, and instant profile unlock
CREATE OR REPLACE FUNCTION public.record_auth_attempt(
  p_email text,
  p_ip text DEFAULT NULL,
  p_succeeded boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_ip inet := NULL;
  v_norm_email text;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: service_role only';
  END IF;

  v_norm_email := lower(trim(p_email));

  IF p_ip IS NOT NULL AND trim(p_ip) <> '' THEN
    BEGIN
      v_ip := trim(p_ip)::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  -- On successful authentication:
  -- 1) Delete prior failed attempts for this email (resets consecutive failure counter)
  -- 2) Immediately clear any locked_until status on the profile
  IF p_succeeded = true THEN
    DELETE FROM app.auth_attempts
    WHERE email_ci = v_norm_email
      AND succeeded = false;

    UPDATE public.profiles
    SET locked_until = NULL
    WHERE lower(trim(email)) = v_norm_email
      AND locked_until IS NOT NULL;
  END IF;

  -- Record the current attempt
  INSERT INTO app.auth_attempts (email_ci, ip, succeeded, attempted_at)
  VALUES (v_norm_email, v_ip, p_succeeded, now());
END;
$$;

-- 3. Update public.get_failed_auth_attempt_count to only count consecutive failures SINCE the last successful login
CREATE OR REPLACE FUNCTION public.get_failed_auth_attempt_count(
  p_email text,
  p_since timestamptz
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
DECLARE
  v_count integer;
  v_norm_email text;
  v_last_success timestamptz;
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: service_role only';
  END IF;

  v_norm_email := lower(trim(p_email));

  -- Find the most recent successful login timestamp for this account
  SELECT MAX(attempted_at)
  INTO v_last_success
  FROM app.auth_attempts
  WHERE email_ci = v_norm_email
    AND succeeded = true;

  -- Count ONLY failed attempts occurring after the last successful login, within the 15-minute window
  SELECT COUNT(*)::integer
  INTO v_count
  FROM app.auth_attempts
  WHERE email_ci = v_norm_email
    AND succeeded = false
    AND attempted_at >= GREATEST(p_since, COALESCE(v_last_success, '-infinity'::timestamptz));

  RETURN COALESCE(v_count, 0);
END;
$$;

-- 4. Secure Grants (service_role only)
REVOKE ALL ON FUNCTION public.record_auth_attempt(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt(text, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.get_failed_auth_attempt_count(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_auth_attempt_count(text, timestamptz) TO service_role;

-- 5. Immediately clear all active lockouts across all profiles and flush stale failed attempts
UPDATE public.profiles SET locked_until = NULL WHERE locked_until IS NOT NULL;
DELETE FROM app.auth_attempts WHERE succeeded = false;
