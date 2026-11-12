-- Fix app.audit_trigger() failing with `record "old" has no field "role"`
-- on UPDATE for non-profile tables (e.g. business_settings, clients, enquiries, etc.).
-- In PL/pgSQL, `IF TG_TABLE_NAME = 'profiles' AND OLD.role IS DISTINCT FROM NEW.role`
-- still binds `OLD.role` / `NEW.role` against the triggering table's row type.
-- Reading `role` from the serialized `v_old` / `v_new` jsonb avoids referencing a
-- column that only exists on `public.profiles`.

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
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'profiles' AND (v_old->>'role') IS DISTINCT FROM (v_new->>'role') THEN
      v_action := 'role_change';
    ELSE
      v_action := 'update';
    END IF;
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
