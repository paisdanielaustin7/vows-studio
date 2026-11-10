-- VOWS Studio — Migration 014 (Part 1): RLS Policies for Identity & System Tables
-- Specs: RBAC_PERMISSIONS §3, §7, Rulings R1-R7

-- ---------------- PROFILES ----------------
CREATE POLICY profiles__select__all_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff', 'crew_member'));

CREATE POLICY profiles__update__sa ON public.profiles
  FOR UPDATE TO authenticated
  USING (app.has_role('system_admin'))
  WITH CHECK (app.has_role('system_admin'));

CREATE POLICY profiles__update__self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND app.is_active())
  WITH CHECK (id = auth.uid() AND app.is_active());

-- ---------------- INVITATIONS ----------------
CREATE POLICY invitations__all__sa ON public.invitations
  FOR ALL TO authenticated
  USING (app.has_role('system_admin'))
  WITH CHECK (app.has_role('system_admin'));

-- ---------------- AUDIT LOG ----------------
-- Append-only; NO UPDATE or DELETE policy exists
CREATE POLICY audit_log__select__sa ON public.audit_log
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin'));

CREATE POLICY audit_log__select__bo_scoped ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    app.has_role('business_owner') AND
    table_name NOT IN ('profiles', 'invitations', 'gmail_credentials', 'auth_attempts')
  );

CREATE POLICY audit_log__insert__authenticated ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ---------------- NOTIFICATIONS ----------------
CREATE POLICY notifications__select__own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications__update__own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------- FILES ----------------
CREATE POLICY files__select__authenticated ON public.files
  FOR SELECT TO authenticated
  USING (app.is_active());

CREATE POLICY files__insert__authenticated ON public.files
  FOR INSERT TO authenticated
  WITH CHECK (app.is_active() AND (uploaded_by IS NULL OR uploaded_by = auth.uid()));

-- ---------------- GENERATION ERRORS ----------------
CREATE POLICY generation_errors__select__sa_bo ON public.generation_errors
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner'));
