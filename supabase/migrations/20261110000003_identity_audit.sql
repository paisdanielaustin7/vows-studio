-- VOWS Studio — Migration 003: Identity, System, Audit & Foundation Tables
-- Specs: DATABASE_SCHEMA §3, §14, RBAC §7, §9, SECURITY_PLAN §4, §5

-- 1. Profiles (linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  email citext NOT NULL UNIQUE,
  full_name text NOT NULL,
  role user_role NOT NULL,
  phone text,
  avatar_path text,
  is_active boolean NOT NULL DEFAULT true,
  locked_until timestamptz,
  deactivated_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Policy letting supabase_auth_admin read profiles for the custom token hook
CREATE POLICY profiles__auth_admin_read ON public.profiles
  FOR SELECT TO supabase_auth_admin USING (true);

-- 2. Invitations
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL,
  full_name text NOT NULL,
  role user_role NOT NULL CHECK (role <> 'system_admin'),
  token_hash text NOT NULL UNIQUE,
  invited_by uuid NOT NULL REFERENCES public.profiles(id),
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS invitations_active_email_idx
  ON public.invitations (email)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

-- 3. Auth Attempts (Schema app; service-role only for lockout tracking)
CREATE TABLE IF NOT EXISTS app.auth_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email_ci citext NOT NULL,
  ip inet,
  succeeded boolean NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_attempts_email_time_idx
  ON app.auth_attempts (email_ci, attempted_at DESC);

-- 4. Audit Log (Append-only immutable audit trail)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid,
  actor_role user_role,
  action audit_action NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_table_record_idx ON public.audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_user_id, created_at DESC);

-- 5. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_read_idx
  ON public.notifications (user_id, is_read, created_at DESC);

-- 6. Files Registry
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket text NOT NULL,
  storage_path text NOT NULL,
  original_name text,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL,
  entity_type text,
  entity_id uuid,
  uploaded_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT files_bucket_path_unique UNIQUE (bucket, storage_path)
);

-- 7. Generation Errors
CREATE TABLE IF NOT EXISTS public.generation_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('pdf', 'email', 'other')),
  resource_type text,
  resource_id uuid,
  message text NOT NULL,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------- TRIGGERS & GUARDS ----------------

-- Touch updated_at triggers
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Block mutation on audit_log
CREATE TRIGGER audit_log_block_mutation
  BEFORE UPDATE OR DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION app.block_mutation();

-- Role protection guard on profiles
CREATE OR REPLACE FUNCTION app.profile_role_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Service role or migration bypass
  IF (auth.jwt() ->> 'role') = 'service_role' OR current_setting('app.migration_in_progress', true) = 'on' THEN
    RETURN NEW;
  END IF;

  -- Block any non-system_admin from changing roles
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT (app.has_role('system_admin')) THEN
      RAISE EXCEPTION 'Access Denied: Only a System Administrator can modify user roles.';
    END IF;

    -- Block elevating anyone to system_admin through the application layer
    IF NEW.role = 'system_admin' THEN
      RAISE EXCEPTION 'Forbidden: system_admin accounts can only be provisioned via server bootstrap.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_role_guard_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app.profile_role_guard();

-- Last owner & last admin guard on profiles
CREATE OR REPLACE FUNCTION app.last_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_sa_count int;
  active_bo_count int;
BEGIN
  -- Check if system_admin is being demoted or deactivated
  IF OLD.role = 'system_admin' AND (NEW.role <> 'system_admin' OR NEW.is_active = false) THEN
    SELECT count(*) INTO active_sa_count
    FROM public.profiles
    WHERE role = 'system_admin' AND is_active = true AND id <> OLD.id;

    IF active_sa_count < 1 THEN
      RAISE EXCEPTION 'Cannot deactivate or demote the last active System Administrator.';
    END IF;
  END IF;

  -- Check if business_owner is being demoted or deactivated
  IF OLD.role = 'business_owner' AND (NEW.role <> 'business_owner' OR NEW.is_active = false) THEN
    SELECT count(*) INTO active_bo_count
    FROM public.profiles
    WHERE role = 'business_owner' AND is_active = true AND id <> OLD.id;

    IF active_bo_count < 1 THEN
      RAISE EXCEPTION 'Cannot deactivate or demote the last active Business Owner.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_last_owner_guard_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app.last_owner_guard();

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION app.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_old jsonb := null;
  v_new jsonb := null;
  v_action audit_action;
  v_actor_id uuid := auth.uid();
  v_actor_role user_role := app.role();
  v_record_id text;
  v_ip inet;
  v_ua text;
  v_secret_keys text[] := ARRAY['password', 'password_hash', 'token', 'token_hash', 'access_token', 'refresh_token', 'bank_account_number', 'pan', 'aadhaar', 'secret'];
  v_key text;
BEGIN
  BEGIN
    v_ip := NULLIF(current_setting('request.headers', true)::jsonb->>'x-forwarded-for', '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  BEGIN
    v_ua := current_setting('request.headers', true)::jsonb->>'user-agent';
  EXCEPTION WHEN OTHERS THEN
    v_ua := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id::text, '');
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role THEN
      v_action := 'role_change';
    ELSE
      v_action := 'update';
    END IF;
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE(NEW.id::text, OLD.id::text, '');
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'delete';
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE(OLD.id::text, '');
  END IF;

  FOREACH v_key IN ARRAY v_secret_keys LOOP
    IF v_old IS NOT NULL THEN
      v_old := v_old - v_key;
    END IF;
    IF v_new IS NOT NULL THEN
      v_new := v_new - v_key;
    END IF;
  END LOOP;

  INSERT INTO public.audit_log (
    actor_user_id,
    actor_role,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    v_actor_id,
    v_actor_role,
    v_action,
    TG_TABLE_NAME,
    v_record_id,
    v_old,
    v_new,
    jsonb_build_object('op', TG_OP),
    v_ip,
    v_ua,
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- Auth event logger helper function
CREATE OR REPLACE FUNCTION app.log_auth_event(
  p_actor_user_id uuid,
  p_actor_role user_role,
  p_action audit_action,
  p_record_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_ip inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
BEGIN
  INSERT INTO public.audit_log (
    actor_user_id,
    actor_role,
    action,
    table_name,
    record_id,
    metadata,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_actor_user_id,
    p_actor_role,
    p_action,
    'auth',
    p_record_id,
    p_metadata,
    p_ip,
    p_user_agent,
    now()
  );
END;
$$;

-- Enable RLS on every table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_errors ENABLE ROW LEVEL SECURITY;
