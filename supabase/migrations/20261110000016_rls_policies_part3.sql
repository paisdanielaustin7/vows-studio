-- Migration 016: RLS Policies Part 3 (Bookings, Events, Crew, Schedule)
-- Specs: RBAC §3.2, §5 (money-free views), D-34, D-35

-- Enable RLS on all Phase 3 tables
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_unavailability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_pay_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_stages ENABLE ROW LEVEL SECURITY;

-- 1. Bookings Policies
-- SA, BO, MG can view, insert, update, soft-delete
CREATE POLICY bookings_admin_manager_select ON public.bookings
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY bookings_admin_manager_insert ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY bookings_admin_manager_update ON public.bookings
  FOR UPDATE TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY bookings_admin_owner_delete ON public.bookings
  FOR DELETE TO authenticated
  USING (app.has_role('system_admin', 'business_owner'));

-- 2. Booking Line Items Policies (contains money; Staff and Crew DENIED)
CREATE POLICY booking_line_items_select ON public.booking_line_items
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY booking_line_items_modify ON public.booking_line_items
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

-- 3. Events Policies
CREATE POLICY events_management_all ON public.events
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY events_staff_accountant_select ON public.events
  FOR SELECT TO authenticated
  USING (app.has_role('staff', 'accountant'));

CREATE POLICY events_crew_assigned_select ON public.events
  FOR SELECT TO authenticated
  USING (
    app.has_role('crew_member')
    AND id IN (
      SELECT eca.event_id
      FROM public.event_crew_assignments eca
      JOIN public.crew_members cm ON eca.crew_member_id = cm.id
      WHERE cm.profile_id = auth.uid()
    )
  );

-- 4. Crew Members Policies
CREATE POLICY crew_members_management_all ON public.crew_members
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY crew_members_staff_accountant_select ON public.crew_members
  FOR SELECT TO authenticated
  USING (app.has_role('staff', 'accountant'));

CREATE POLICY crew_members_self_select ON public.crew_members
  FOR SELECT TO authenticated
  USING (app.has_role('crew_member') AND profile_id = auth.uid());

-- 5. Event Crew Assignments Policies
CREATE POLICY assignments_management_all ON public.event_crew_assignments
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY assignments_staff_select ON public.event_crew_assignments
  FOR SELECT TO authenticated
  USING (app.has_role('staff'));

CREATE POLICY assignments_crew_self_select ON public.event_crew_assignments
  FOR SELECT TO authenticated
  USING (
    app.has_role('crew_member')
    AND crew_member_id IN (
      SELECT id FROM public.crew_members WHERE profile_id = auth.uid()
    )
  );

-- 6. Crew Unavailability Policies
CREATE POLICY unavailability_management_all ON public.crew_unavailability
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY unavailability_crew_self_all ON public.crew_unavailability
  FOR ALL TO authenticated
  USING (
    app.has_role('crew_member')
    AND crew_member_id IN (
      SELECT id FROM public.crew_members WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    app.has_role('crew_member')
    AND crew_member_id IN (
      SELECT id FROM public.crew_members WHERE profile_id = auth.uid()
    )
  );

-- 7. Crew Pay Records Policies (rate and payment records)
CREATE POLICY crew_pay_records_management_all ON public.crew_pay_records
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY crew_pay_records_self_select ON public.crew_pay_records
  FOR SELECT TO authenticated
  USING (
    app.has_role('crew_member')
    AND crew_member_id IN (
      SELECT id FROM public.crew_members WHERE profile_id = auth.uid()
    )
  );

-- 8. Delivery Pipelines & Stages Policies
CREATE POLICY delivery_pipelines_all ON public.delivery_pipelines
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY delivery_stages_select ON public.delivery_stages
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff', 'crew_member'));

CREATE POLICY delivery_stages_update ON public.delivery_stages
  FOR UPDATE TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager', 'staff'));
