-- ==============================================================================
-- VOWS STUDIO OS // SUPABASE POSTGRESQL SCHEMA & REAL-TIME PUBLICATION
-- Photography & Cinema Operating Engine & CRM // Owned by Reuben Serrao
-- ==============================================================================
-- Run this entire script in your new Supabase project's SQL Editor:
-- Supabase Dashboard -> Project -> SQL Editor -> New Query -> Run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & CREW AUTH MATRIX
CREATE TABLE IF NOT EXISTS public.lumina_users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'SECOND_SHOOTER',
  can_view_finances BOOLEAN NOT NULL DEFAULT false,
  can_access_settings BOOLEAN NOT NULL DEFAULT false,
  can_edit_quotes_and_orders BOOLEAN NOT NULL DEFAULT false,
  can_edit_ledger BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 2. STUDIO SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.lumina_settings (
  id TEXT PRIMARY KEY DEFAULT 'studio_settings',
  studio_name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  city TEXT NOT NULL,
  has_gst BOOLEAN DEFAULT false,
  gstin TEXT DEFAULT '',
  banking_details JSONB NOT NULL,
  contact_person TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  terms_and_conditions JSONB NOT NULL,
  pdf_theme_color TEXT DEFAULT 'sage',
  custom_palettes JSONB DEFAULT '[]'::jsonb,
  crew_roster JSONB DEFAULT '[]'::jsonb,
  ui_theme TEXT DEFAULT 'slate',
  package_requirements JSONB DEFAULT '[]'::jsonb,
  package_deliverables JSONB DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 3. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS public.lumina_quotations (
  id TEXT PRIMARY KEY,
  quotation_number TEXT NOT NULL,
  date TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_city TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  package_title TEXT NOT NULL,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb,
  crew_allocation JSONB NOT NULL DEFAULT '[]'::jsonb,
  terms_and_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_price NUMERIC NOT NULL,
  advance_percentage NUMERIC DEFAULT 50,
  hide_breakup BOOLEAN DEFAULT false,
  drive_file_url TEXT,
  status TEXT NOT NULL DEFAULT 'SENT',
  enquiry_id TEXT,
  booking_id TEXT,
  contact_person TEXT,
  contact_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 4. ENQUIRIES CRM TABLE
CREATE TABLE IF NOT EXISTS public.lumina_enquiries (
  id TEXT PRIMARY KEY,
  enquiry_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  city TEXT NOT NULL,
  event_date TEXT NOT NULL,
  event_type TEXT NOT NULL,
  estimated_budget NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',
  notes TEXT,
  quotation_id TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 5. SHOOT BOOKINGS & CALL SHEETS TABLE
CREATE TABLE IF NOT EXISTS public.lumina_bookings (
  id TEXT PRIMARY KEY,
  shoot_code TEXT NOT NULL,
  title TEXT NOT NULL,
  client JSONB NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  call_time TEXT NOT NULL,
  location JSONB NOT NULL,
  production_team JSONB NOT NULL DEFAULT '[]'::jsonb,
  financial_summary JSONB NOT NULL,
  schedule_timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  gear_allocated JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_stage TEXT DEFAULT 'RAW_INGESTED',
  hard_drive_received BOOLEAN DEFAULT false,
  client_selection_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 6. GENERAL LEDGER TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.lumina_ledger (
  id TEXT PRIMARY KEY,
  transaction_ref TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  counterparty TEXT NOT NULL,
  related_shoot_code TEXT,
  status TEXT NOT NULL DEFAULT 'CLEARED',
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 7. TAX INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.lumina_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL,
  production_fee_tax NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  balance_due NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'UNPAID',
  quotation_id TEXT,
  drive_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- 8. CLIENT FEEDBACK REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.lumina_feedback (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  shoot_id TEXT,
  event_date TEXT,
  event_type TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  service_ratings JSONB NOT NULL DEFAULT '{}'::jsonb,
  review TEXT NOT NULL,
  highlights TEXT,
  allow_social_sharing BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SECURE CLIENT-SIDE ANON ACCESS
-- =========================================================================
ALTER TABLE public.lumina_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lumina_feedback ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Public access lumina_users" ON public.lumina_users;
  CREATE POLICY "Public access lumina_users" ON public.lumina_users FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_settings" ON public.lumina_settings;
  CREATE POLICY "Public access lumina_settings" ON public.lumina_settings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_quotations" ON public.lumina_quotations;
  CREATE POLICY "Public access lumina_quotations" ON public.lumina_quotations FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_enquiries" ON public.lumina_enquiries;
  CREATE POLICY "Public access lumina_enquiries" ON public.lumina_enquiries FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_bookings" ON public.lumina_bookings;
  CREATE POLICY "Public access lumina_bookings" ON public.lumina_bookings FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_ledger" ON public.lumina_ledger;
  CREATE POLICY "Public access lumina_ledger" ON public.lumina_ledger FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_invoices" ON public.lumina_invoices;
  CREATE POLICY "Public access lumina_invoices" ON public.lumina_invoices FOR ALL USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "Public access lumina_feedback" ON public.lumina_feedback;
  CREATE POLICY "Public access lumina_feedback" ON public.lumina_feedback FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Explicitly grant permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE 
  public.lumina_users,
  public.lumina_settings,
  public.lumina_quotations,
  public.lumina_enquiries,
  public.lumina_bookings,
  public.lumina_ledger,
  public.lumina_invoices,
  public.lumina_feedback
TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- =========================================================================
-- REAL-TIME WEBSOCKET REPLICATION
-- =========================================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE 
      public.lumina_users, 
      public.lumina_settings, 
      public.lumina_quotations, 
      public.lumina_enquiries, 
      public.lumina_bookings, 
      public.lumina_ledger, 
      public.lumina_invoices,
      public.lumina_feedback;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- =========================================================================
-- SEED DATA (VOWS STUDIO // REUBEN SERRAO & DAN)
-- =========================================================================

-- 1. Seed Crew Accounts
INSERT INTO public.lumina_users (id, username, password, full_name, role, can_view_finances, can_access_settings, can_edit_quotes_and_orders, can_edit_ledger, is_locked)
VALUES 
  ('usr-reuben', 'reuben', 'vowsreuben2026', 'Reuben Serrao (Director)', 'ADMIN_ACCESS', true, true, true, true, false),
  ('usr-root', 'root', 'vowsroot2026', 'System Admin', 'ADMIN_ACCESS', true, true, true, true, false)
ON CONFLICT (id) DO UPDATE 
SET 
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  can_view_finances = EXCLUDED.can_view_finances,
  can_access_settings = EXCLUDED.can_access_settings,
  can_edit_quotes_and_orders = EXCLUDED.can_edit_quotes_and_orders,
  can_edit_ledger = EXCLUDED.can_edit_ledger,
  is_locked = EXCLUDED.is_locked;

-- 2. Seed Studio Settings
INSERT INTO public.lumina_settings (
  id, studio_name, tagline, city, has_gst, gstin, banking_details, contact_person, contact_phone, terms_and_conditions, pdf_theme_color, custom_palettes, crew_roster, ui_theme
) VALUES (
  'studio_settings',
  'VOWS',
  'Wedding Cinematics & Stills',
  'Mangalore, Karnataka',
  false,
  '',
  '{"accountName": "VOWS // REUBEN SERRAO", "bankName": "HDFC Bank Ltd", "branch": "Hampankatta Branch, Mangalore", "accountNumber": "50200084920194", "ifscCode": "HDFC0000084", "upiId": "vowsbyreuben@okaxis"}'::jsonb,
  'REUBEN SERRAO',
  '+91 93800 57445',
  '["A 50% advance is required to confirm the booking. Dates are secured only after payment.", "Remaining balance must be cleared on or before the event date.", "Advance is non-refundable. Date changes are subject to studio calendar availability.", "Final photos/videos will be delivered within 2-6 weeks following post-processing.", "Travel and accommodation need to be provided for outstation locations if requested.", "Accommodation is not included in the quotation and has to be provided by the client.", "We reserve the right to display selected frames for portfolio, editorial, and social presence (VOWS by Reuben).", "In case of unforeseen force majeure, studio liability is limited to the advance fee received.", "Delays from client side schedule may impact coverage. The studio is not responsible for shortened event timelines.", "Additional album sheets or parent albums will be billed separately upon proofing approval.", "Photo selection for master album is curated collaboratively with the couple.", "Client must provide a high-speed hard drive for collection of master RAW footage; archive kept for 6 months."]'::jsonb,
  'sage',
  '[]'::jsonb,
  '[{"id": "crw-01", "role": "Lead Cinematographer & Director", "defaultCount": 1, "defaultName": "Reuben Serrao", "phone": "+91 93800 57445"}, {"id": "crw-02", "role": "Candid Photographer", "defaultCount": 1, "defaultName": "Lead Photographer", "phone": "+91 93800 57445"}, {"id": "crw-03", "role": "Cinematographer", "defaultCount": 1, "defaultName": "Second Shooter Unit", "phone": "+91 98450 11234"}, {"id": "crw-04", "role": "Drone Pilot", "defaultCount": 1, "defaultName": "Aerial Cinema Unit", "phone": "+91 96110 33912"}, {"id": "crw-05", "role": "Grip & Lighting Assistant", "defaultCount": 1, "defaultName": "Production Assist", "phone": "+91 98440 77123"}]'::jsonb,
  'slate'
) ON CONFLICT (id) DO UPDATE 
SET 
  studio_name = EXCLUDED.studio_name,
  tagline = EXCLUDED.tagline,
  contact_person = EXCLUDED.contact_person,
  contact_phone = EXCLUDED.contact_phone;
