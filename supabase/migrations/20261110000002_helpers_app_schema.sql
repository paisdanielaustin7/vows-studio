-- VOWS Studio — Migration 002: Schema `app`, Security Helper Functions, & Token Hook
-- Specs: DATABASE_SCHEMA §12, RBAC_PERMISSIONS §7, DECISION_LOG D-02, D-05

CREATE SCHEMA IF NOT EXISTS app;

-- 1. Read role from verified JWT top-level claim (injected by token hook)
CREATE OR REPLACE FUNCTION app.role()
RETURNS user_role
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public, app
AS $$
  SELECT NULLIF(auth.jwt() ->> 'user_role', '')::user_role;
$$;

-- 2. Read Assurance Level (AAL) from verified JWT
CREATE OR REPLACE FUNCTION app.aal2()
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

-- 3. Check if user is active (cached per transaction)
CREATE OR REPLACE FUNCTION app.is_active()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 4. Check if authenticated user has one of the allowed roles, is active, and satisfies MFA requirement
CREATE OR REPLACE FUNCTION app.has_role(VARIADIC allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
DECLARE
  current_r text;
  current_role_val user_role;
BEGIN
  -- Service role bypass for explicit server maintenance tasks
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN true;
  END IF;

  -- Verify active profile
  IF NOT app.is_active() THEN
    RETURN false;
  END IF;

  current_role_val := app.role();
  IF current_role_val IS NULL THEN
    RETURN false;
  END IF;
  current_r := current_role_val::text;

  -- Check if user role is in the allowed list
  IF NOT (current_r = ANY(allowed_roles)) THEN
    RETURN false;
  END IF;

  -- System Admin and Business Owner MANDATE AAL2 (MFA)
  IF (current_r IN ('system_admin', 'business_owner')) AND NOT app.aal2() THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- 5. Helper to get crew_id for the current authenticated user
CREATE OR REPLACE FUNCTION app.crew_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
  SELECT id FROM public.crew_members WHERE profile_id = auth.uid() LIMIT 1;
$$;

-- 6. Helper to check if current user is assigned to an event
CREATE OR REPLACE FUNCTION app.assigned_to_event(target_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_crew_assignments
    WHERE event_id = target_event_id
      AND crew_member_id = app.crew_id()
  );
$$;

-- 7. Helper to check if current user is assigned to a delivery stage
CREATE OR REPLACE FUNCTION app.assigned_to_stage(target_stage_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.delivery_stage_assignees
    WHERE delivery_stage_id = target_stage_id
      AND user_id = auth.uid()
  );
$$;

-- 8. Custom Access Token Hook for Supabase Auth
-- Copies profiles.role into the top-level JWT claim `user_role`
CREATE OR REPLACE FUNCTION app.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = public, app
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  found_role text;
  user_is_active boolean;
BEGIN
  claims := event->'claims';
  user_id := (event->>'user_id')::uuid;

  SELECT role::text, is_active
  INTO found_role, user_is_active
  FROM public.profiles
  WHERE id = user_id;

  -- Set top-level user_role claim
  IF found_role IS NOT NULL AND user_is_active IS TRUE THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(found_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant execute on custom access token hook to supabase_auth_admin
GRANT EXECUTE ON FUNCTION app.custom_access_token_hook(jsonb) TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION app.custom_access_token_hook(jsonb) FROM authenticated, anon, public;

-- 9. Generic touch_updated_at trigger function
CREATE OR REPLACE FUNCTION app.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 10. Immutability block_mutation trigger function
-- Honours transaction-local flag for reset operations in setup mode
CREATE OR REPLACE FUNCTION app.block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.reset_in_progress', true) = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Table % is immutable. Mutations or deletes are strictly forbidden.', TG_TABLE_NAME;
END;
$$;
