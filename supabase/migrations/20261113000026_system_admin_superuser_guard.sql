-- Migration 026: Relax Business Owner last-owner guard when active System Administrator exists
-- Ensures a System Administrator (superadmin) can deactivate or demote any user account.

CREATE OR REPLACE FUNCTION app.last_owner_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
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
  -- Permitted if an active System Administrator exists to oversee and govern the studio
  IF OLD.role = 'business_owner' AND (NEW.role <> 'business_owner' OR NEW.is_active = false) THEN
    SELECT count(*) INTO active_sa_count
    FROM public.profiles
    WHERE role = 'system_admin' AND is_active = true;

    SELECT count(*) INTO active_bo_count
    FROM public.profiles
    WHERE role = 'business_owner' AND is_active = true AND id <> OLD.id;

    IF active_bo_count < 1 AND active_sa_count < 1 THEN
      RAISE EXCEPTION 'Cannot deactivate or demote the last active Business Owner when no active System Administrator exists.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
