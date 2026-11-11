-- VOWS Studio — Migration 011: Delivery Pipeline Enhancement
-- Adds override tracking, assignees, attachments, sequential completion trigger, auto-init trigger, and delivery_pipelines_v

-- 1. Enhance delivery_stages with override auditing
ALTER TABLE public.delivery_stages
  ADD COLUMN IF NOT EXISTS override_reason text,
  ADD COLUMN IF NOT EXISTS overridden_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

-- Ensure blocked reason check is strictly enforced
ALTER TABLE public.delivery_stages
  DROP CONSTRAINT IF EXISTS check_stage_blocked_reason;

ALTER TABLE public.delivery_stages
  ADD CONSTRAINT check_stage_blocked_reason
  CHECK (status <> 'blocked' OR (blocked_reason IS NOT NULL AND length(trim(blocked_reason)) > 0));

-- 2. Delivery Stage Assignees (Staff assigned to specific stages)
CREATE TABLE IF NOT EXISTS public.delivery_stage_assignees (
  stage_id uuid NOT NULL REFERENCES public.delivery_stages(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES public.profiles(id),
  PRIMARY KEY (stage_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_stage_assignees_profile
  ON public.delivery_stage_assignees(profile_id);

-- 3. Delivery Stage Attachments (Links & small files <= 50MB)
CREATE TABLE IF NOT EXISTS public.delivery_stage_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES public.delivery_stages(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('link', 'file')),
  label text NOT NULL,
  url text,
  file_id uuid REFERENCES public.files(id) ON DELETE SET NULL,
  file_path text,
  file_size_bytes bigint CHECK (file_size_bytes IS NULL OR file_size_bytes <= 52428800), -- 50 MB
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_delivery_stage_attachment_source CHECK (
    (kind = 'link' AND url IS NOT NULL) OR
    (kind = 'file' AND (file_id IS NOT NULL OR file_path IS NOT NULL))
  )
);

CREATE INDEX IF NOT EXISTS idx_delivery_stage_attachments_stage
  ON public.delivery_stage_attachments(stage_id);

-- 4. Update app.assigned_to_stage helper function to match schema
CREATE OR REPLACE FUNCTION app.assigned_to_stage(target_stage_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, app
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.delivery_stage_assignees
    WHERE stage_id = target_stage_id
      AND profile_id = auth.uid()
  );
END;
$$;

-- 5. Canonical init_booking_delivery_pipeline with the 9 GLOSSARY stages
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
    'raw_import',
    'culling',
    'editing',
    'client_preview',
    'revisions',
    'final_export',
    'quality_check',
    'delivery',
    'completed'
  ]::public.delivery_stage_code[];
  i int;
BEGIN
  -- Check if pipeline already exists
  SELECT id INTO v_pipeline_id
  FROM public.delivery_pipelines
  WHERE booking_id = p_booking_id;

  IF v_pipeline_id IS NULL THEN
    INSERT INTO public.delivery_pipelines (booking_id, target_date)
    VALUES (p_booking_id, p_target_date)
    RETURNING id INTO v_pipeline_id;

    FOR i IN 1..9 LOOP
      INSERT INTO public.delivery_stages (pipeline_id, stage_code, sort, status)
      VALUES (v_pipeline_id, v_stages[i], i, 'pending')
      ON CONFLICT (pipeline_id, sort) DO NOTHING;
    END LOOP;
  END IF;

  RETURN v_pipeline_id;
END;
$$;

-- 6. Sequential Stage Completion and Status Trigger
CREATE OR REPLACE FUNCTION public.fn_check_delivery_stage_sequential()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_prior_incomplete boolean;
  v_booking_id uuid;
BEGIN
  -- A. Blocked status validation
  IF NEW.status = 'blocked' THEN
    IF NEW.blocked_reason IS NULL OR length(trim(NEW.blocked_reason)) = 0 THEN
      RAISE EXCEPTION 'A blocked reason is required when marking a delivery stage as blocked.';
    END IF;

    -- Send notifications to business owners and managers
    IF OLD.status IS DISTINCT FROM 'blocked' THEN
      SELECT booking_id INTO v_booking_id
      FROM public.delivery_pipelines
      WHERE id = NEW.pipeline_id;

      INSERT INTO public.notifications (user_id, type, title, body, link, is_read)
      SELECT p.id,
             'delivery_blocked',
             'Delivery Stage Blocked',
             'Stage ' || NEW.stage_code::text || ' has been marked as blocked: ' || NEW.blocked_reason,
             '/crm/bookings/' || COALESCE(v_booking_id::text, '') || '?tab=delivery',
             false
      FROM public.profiles p
      WHERE p.role IN ('system_admin', 'business_owner', 'manager')
        AND p.is_active = true;
    END IF;
  END IF;

  -- B. Auto-stamp started_at when progressing
  IF NEW.status = 'in_progress' AND (OLD.status = 'pending' OR OLD.status IS NULL) AND NEW.started_at IS NULL THEN
    NEW.started_at := now();
  END IF;

  -- C. Completed status validation and sequential rule
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    NEW.completed_at := COALESCE(NEW.completed_at, now());

    -- Sequential check: check if any prior stage is incomplete
    IF NEW.sort > 1 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.delivery_stages
        WHERE pipeline_id = NEW.pipeline_id
          AND sort < NEW.sort
          AND status <> 'completed'
      ) INTO v_prior_incomplete;

      IF v_prior_incomplete THEN
        IF NOT app.has_role('system_admin', 'business_owner') THEN
          RAISE EXCEPTION 'Stage % cannot be completed until prior stages are completed. An override reason and Owner/Admin permissions are required to override sequential completion.', NEW.sort;
        END IF;

        IF NEW.override_reason IS NULL OR length(trim(NEW.override_reason)) = 0 THEN
          RAISE EXCEPTION 'An override reason is required to complete stage % before prior stages are completed.', NEW.sort;
        END IF;

        NEW.overridden_by := auth.uid();
        NEW.overridden_at := now();
      END IF;
    END IF;

    -- If stage 9 is completed, mark pipeline completed_at (DEL-03, D-36: does NOT change booking status)
    IF NEW.sort = 9 THEN
      UPDATE public.delivery_pipelines
      SET completed_at = now(),
          updated_at = now()
      WHERE id = NEW.pipeline_id;
    END IF;
  END IF;

  -- D. Reverting from completed (undo)
  IF NEW.status <> 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at := NULL;
    IF NEW.sort = 9 THEN
      UPDATE public.delivery_pipelines
      SET completed_at = NULL,
          updated_at = now()
      WHERE id = NEW.pipeline_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_delivery_stage_sequential ON public.delivery_stages;
CREATE TRIGGER trg_check_delivery_stage_sequential
  BEFORE INSERT OR UPDATE ON public.delivery_stages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_delivery_stage_sequential();

-- 7. Trigger to automatically initialize delivery pipeline upon booking creation
CREATE OR REPLACE FUNCTION public.fn_auto_init_booking_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.delivery_pipelines WHERE booking_id = NEW.id) THEN
    PERFORM public.init_booking_delivery_pipeline(NEW.id, NEW.target_delivery_date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_init_booking_delivery ON public.bookings;
CREATE TRIGGER trg_auto_init_booking_delivery
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_init_booking_delivery();

-- 8. Delivery Pipelines View (Derived behind_schedule, progress %, current stage)
CREATE OR REPLACE VIEW public.delivery_pipelines_v AS
SELECT
  dp.id,
  dp.booking_id,
  b.booking_number,
  b.client_id,
  c.full_name AS client_name,
  b.status AS booking_status,
  dp.target_date,
  dp.completed_at,
  dp.notes,
  dp.share_token_hash,
  dp.share_expires_at,
  dp.share_revoked_at,
  (dp.target_date IS NOT NULL AND dp.target_date < CURRENT_DATE AND dp.completed_at IS NULL) AS behind_schedule,
  (dp.share_token_hash IS NOT NULL AND (dp.share_expires_at IS NULL OR dp.share_expires_at > now()) AND dp.share_revoked_at IS NULL) AS is_share_active,
  COUNT(ds.id) FILTER (WHERE ds.status = 'completed') AS completed_stages_count,
  COUNT(ds.id) AS total_stages_count,
  ROUND((COUNT(ds.id) FILTER (WHERE ds.status = 'completed')::numeric / NULLIF(COUNT(ds.id), 0)::numeric) * 100) AS progress_percentage,
  BOOL_OR(ds.status = 'blocked') AS has_blocked_stage,
  (
    SELECT s.stage_code
    FROM public.delivery_stages s
    WHERE s.pipeline_id = dp.id AND s.status <> 'completed'
    ORDER BY s.sort ASC
    LIMIT 1
  ) AS current_stage_code,
  dp.created_at,
  dp.updated_at
FROM public.delivery_pipelines dp
JOIN public.bookings b ON b.id = dp.booking_id
LEFT JOIN public.clients c ON c.id = b.client_id
LEFT JOIN public.delivery_stages ds ON ds.pipeline_id = dp.id
GROUP BY dp.id, b.id, b.booking_number, b.client_id, c.full_name, b.status;
