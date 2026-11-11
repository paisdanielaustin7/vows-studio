-- VOWS Studio — Migration 022: Schema Usage Grants, Hook Hardening, & Auth Attempt RPCs
-- Ensures Supabase Auth Admin (custom_access_token_hook) and PostgREST roles have required schema/function grants,
-- and exposes auth_attempts via service_role-only public RPCs without exposing the internal app schema.

-- 1. Schema & Function Usage Grants
GRANT USAGE ON SCHEMA app TO supabase_auth_admin, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON TABLE public.profiles TO supabase_auth_admin;

GRANT EXECUTE ON FUNCTION app.role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.aal2() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.is_active() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.has_role(text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.crew_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.assigned_to_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.assigned_to_stage(uuid) TO authenticated, service_role;

-- 2. Harden custom_access_token_hook with SECURITY DEFINER and resilient claims handling
CREATE OR REPLACE FUNCTION app.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
DECLARE
  claims jsonb;
  v_user_id uuid;
  found_role text;
  user_is_active boolean;
BEGIN
  claims := COALESCE(event->'claims', '{}'::jsonb);
  v_user_id := (event->>'user_id')::uuid;

  SELECT role::text, is_active
  INTO found_role, user_is_active
  FROM public.profiles
  WHERE id = v_user_id;

  IF found_role IS NOT NULL AND user_is_active IS TRUE THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(found_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

REVOKE ALL ON FUNCTION app.custom_access_token_hook(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- 3. Service-role-only RPCs for app.auth_attempts (PostgREST does not expose app schema)
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
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: service_role only';
  END IF;

  IF p_ip IS NOT NULL AND trim(p_ip) <> '' THEN
    BEGIN
      v_ip := trim(p_ip)::inet;
    EXCEPTION WHEN OTHERS THEN
      v_ip := NULL;
    END;
  END IF;

  INSERT INTO app.auth_attempts (email_ci, ip, succeeded, attempted_at)
  VALUES (lower(trim(p_email)), v_ip, p_succeeded, now());
END;
$$;

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
BEGIN
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'Forbidden: service_role only';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_count
  FROM app.auth_attempts
  WHERE email_ci = lower(trim(p_email))
    AND succeeded = false
    AND attempted_at >= p_since;

  RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_auth_attempt(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_auth_attempt(text, text, boolean) TO service_role;

REVOKE ALL ON FUNCTION public.get_failed_auth_attempt_count(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_failed_auth_attempt_count(text, timestamptz) TO service_role;

-- 4. Clear any failed auth attempt lockouts created during initial setup
DELETE FROM app.auth_attempts WHERE succeeded = false;
UPDATE public.profiles SET locked_until = NULL WHERE locked_until IS NOT NULL;
