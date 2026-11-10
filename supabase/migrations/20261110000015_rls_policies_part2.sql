-- VOWS Studio — Migration 015: RLS Policies (Part 2 — Sales, Catalogue, Settings)
-- Specs: RBAC_PERMISSIONS §3, §7, Rulings R1-R7

-- 1. Business Settings
CREATE POLICY business_settings__select ON public.business_settings
  FOR SELECT TO authenticated
  USING (app.is_active());

CREATE POLICY business_settings__update ON public.business_settings
  FOR UPDATE TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

-- 2. Document Number Config
CREATE POLICY document_number_config__select ON public.document_number_config
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner'));

CREATE POLICY document_number_config__update ON public.document_number_config
  FOR UPDATE TO authenticated
  USING (app.has_role('system_admin'))
  WITH CHECK (app.has_role('system_admin'));

-- 3. Email Templates
CREATE POLICY email_templates__select ON public.email_templates
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY email_templates__all__sa_bo ON public.email_templates
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

-- 4. Expense Categories
CREATE POLICY expense_categories__select ON public.expense_categories
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'accountant'));

CREATE POLICY expense_categories__all__sa_bo ON public.expense_categories
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

-- 5. Clients & Contacts
CREATE POLICY clients__select ON public.clients
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY clients__insert__update ON public.clients
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY clients__delete__sa_bo ON public.clients
  FOR DELETE TO authenticated
  USING (app.has_role('system_admin', 'business_owner'));

-- Client Phones
CREATE POLICY client_phones__select ON public.client_phones
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY client_phones__modify ON public.client_phones
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

-- Client Emails
CREATE POLICY client_emails__select ON public.client_emails
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY client_emails__modify ON public.client_emails
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

-- 6. Enquiries & Follow-ups
CREATE POLICY enquiries__select ON public.enquiries
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY enquiries__modify ON public.enquiries
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager', 'staff'));

CREATE POLICY follow_ups__select ON public.follow_ups
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY follow_ups__modify ON public.follow_ups
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'staff'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager', 'staff'));

-- 7. Activities
CREATE POLICY activities__select ON public.activities
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY activities__insert ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (app.is_active());

-- 8. Catalogue (Services & Packages)
CREATE POLICY services__select ON public.services
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY services__modify__sa_bo ON public.services
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY service_prices__select ON public.service_prices
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY service_prices__modify__sa_bo ON public.service_prices
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY packages__select ON public.packages
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY packages__modify__sa_bo ON public.packages
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY package_prices__select ON public.package_prices
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY package_prices__modify__sa_bo ON public.package_prices
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY package_items__select ON public.package_items
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant', 'staff'));

CREATE POLICY package_items__modify__sa_bo ON public.package_items
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

-- 9. Quotations & Items (SA, BO, MG, AC only; Staff/Crew DENIED)
CREATE POLICY quotations__select ON public.quotations
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY quotations__modify ON public.quotations
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY quotation_items__select ON public.quotation_items
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY quotation_items__modify ON public.quotation_items
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY quotation_templates__select ON public.quotation_templates
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY quotation_templates__modify ON public.quotation_templates
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

CREATE POLICY quotation_template_items__select ON public.quotation_template_items
  FOR SELECT TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager', 'accountant'));

CREATE POLICY quotation_template_items__modify ON public.quotation_template_items
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner', 'manager'))
  WITH CHECK (app.has_role('system_admin', 'business_owner', 'manager'));

-- 10. Public Site Content (Public read; SA/BO write)
CREATE POLICY site_content__select__public ON public.site_content
  FOR SELECT USING (true);

CREATE POLICY site_content__modify__sa_bo ON public.site_content
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY site_page_seo__select__public ON public.site_page_seo
  FOR SELECT USING (true);

CREATE POLICY site_page_seo__modify__sa_bo ON public.site_page_seo
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));

CREATE POLICY faq_items__select__public ON public.faq_items
  FOR SELECT USING (is_published = true);

CREATE POLICY faq_items__modify__sa_bo ON public.faq_items
  FOR ALL TO authenticated
  USING (app.has_role('system_admin', 'business_owner'))
  WITH CHECK (app.has_role('system_admin', 'business_owner'));
