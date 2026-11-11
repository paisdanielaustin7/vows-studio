-- VOWS Studio — Migration 018: RLS Policies Part 5 (Delivery Pipeline, Assignees, Attachments)
-- Enforces RBAC permissions for Delivery Pipeline, Stage Assignee guards, and Attachments

-- 1. Enable RLS on new delivery tables
ALTER TABLE public.delivery_stage_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_stage_attachments ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing delivery_stages policies to refine staff-assigned update rule
DROP POLICY IF EXISTS delivery_stages_select ON public.delivery_stages;
DROP POLICY IF EXISTS delivery_stages_update ON public.delivery_stages;

-- Delivery Stages Policies
CREATE POLICY delivery_stages_select ON public.delivery_stages
  FOR SELECT TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'manager', 'staff')
    OR (
      app.has_role('crew_member')
      AND EXISTS (
        SELECT 1
        FROM public.delivery_pipelines dp
        JOIN public.events e ON e.booking_id = dp.booking_id
        JOIN public.event_crew_assignments eca ON eca.event_id = e.id
        WHERE dp.id = delivery_stages.pipeline_id
          AND eca.crew_member_id = app.crew_id()
      )
    )
  );

-- Staff can update ONLY stages where they are assigned; SA, BO, MG can update any stage
CREATE POLICY delivery_stages_update ON public.delivery_stages
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (
      app.has_role('staff')
      AND app.assigned_to_stage(id)
    )
  )
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (
      app.has_role('staff')
      AND app.assigned_to_stage(id)
    )
  );

-- 3. Delivery Stage Assignees Policies
CREATE POLICY delivery_stage_assignees_select ON public.delivery_stage_assignees
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff', 'crew_member'));

CREATE POLICY delivery_stage_assignees_all ON public.delivery_stage_assignees
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

-- 4. Delivery Stage Attachments Policies
CREATE POLICY delivery_stage_attachments_select ON public.delivery_stage_attachments
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff', 'crew_member'));

CREATE POLICY delivery_stage_attachments_insert ON public.delivery_stage_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (
      app.has_role('staff')
      AND app.assigned_to_stage(stage_id)
    )
  );

CREATE POLICY delivery_stage_attachments_update ON public.delivery_stage_attachments
  FOR UPDATE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (app.is_active() AND created_by = auth.uid())
  )
  WITH CHECK (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (app.is_active() AND created_by = auth.uid())
  );

CREATE POLICY delivery_stage_attachments_delete ON public.delivery_stage_attachments
  FOR DELETE TO authenticated
  USING (
    app.has_role('system_admin', 'business_owner', 'manager')
    OR (app.is_active() AND created_by = auth.uid())
  );
