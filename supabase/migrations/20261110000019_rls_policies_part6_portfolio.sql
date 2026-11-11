-- VOWS Studio — Migration 019: RLS Policies Part 6 (Portfolio Items & Images)
-- Reference: SECURITY_PLAN §10.2, RBAC_PERMISSIONS.md

-- 1. Enable RLS
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_images ENABLE ROW LEVEL SECURITY;

-- 2. Portfolio Items Policies
-- Public anonymous read: only published items with confirmed client consent
CREATE POLICY portfolio_items__select__public ON public.portfolio_items
  FOR SELECT
  USING (
    is_published = true
    AND client_consent_confirmed_at IS NOT NULL
    AND deleted_at IS NULL
  );

-- Studio internal read: SA, BO, MG, Staff, Crew can see items in CRM
CREATE POLICY portfolio_items__select__internal ON public.portfolio_items
  FOR SELECT TO authenticated
  USING (
    app.current_user_role() IN ('system_admin', 'business_owner', 'manager', 'staff', 'crew')
    AND deleted_at IS NULL
  );

-- Studio management: SA, BO, MG can create, update, delete portfolio items
CREATE POLICY portfolio_items__modify__leadership ON public.portfolio_items
  FOR ALL TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));

-- 3. Portfolio Images Policies
-- Public anonymous read: only for published, consented portfolio items
CREATE POLICY portfolio_images__select__public ON public.portfolio_images
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.portfolio_items pi
      WHERE pi.id = portfolio_images.item_id
        AND pi.is_published = true
        AND pi.client_consent_confirmed_at IS NOT NULL
        AND pi.deleted_at IS NULL
    )
  );

CREATE POLICY portfolio_images__select__internal ON public.portfolio_images
  FOR SELECT TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager', 'staff', 'crew'));

CREATE POLICY portfolio_images__modify__leadership ON public.portfolio_images
  FOR ALL TO authenticated
  USING (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.current_user_role() IN ('system_admin', 'business_owner', 'manager'));
