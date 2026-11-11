-- VOWS Studio — Migration 020: RLS Policies Part 7 (Review Requests & Reviews)
-- Reference: RBAC_PERMISSIONS.md §3.2, §3.5 Ruling R6, DECISION_LOG D-37, SECURITY_PLAN §10

-- 1. Enable Row Level Security
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 2. Review Requests Policies
-- Leadership & Management (SA, BO, MG) can select, insert, and update review requests (R6 ruling: reviews:request)
CREATE POLICY review_requests__select__leadership ON public.review_requests
  FOR SELECT TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));

CREATE POLICY review_requests__insert__leadership ON public.review_requests
  FOR INSERT TO authenticated
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));

CREATE POLICY review_requests__update__leadership ON public.review_requests
  FOR UPDATE TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));

-- 3. Reviews Policies
-- Public anonymous read: strictly approved reviews only (REV-07)
CREATE POLICY reviews__select__public ON public.reviews
  FOR SELECT
  USING (status = 'approved');

-- Studio internal read: SA, BO, MG can view all reviews (reviews:view)
CREATE POLICY reviews__select__internal ON public.reviews
  FOR SELECT TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));

-- Studio moderation (UPDATE): SA and BO only (RBAC R6 ruling: Manager strictly DENIED reviews:moderate)
CREATE POLICY reviews__update__moderator ON public.reviews
  FOR UPDATE TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner'))
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner'));

-- Studio leadership insert (or service role)
CREATE POLICY reviews__insert__moderator ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner'));
