-- VOWS Studio — Migration 004: Business Configuration & Document Numbering
-- Specs: DATABASE_SCHEMA §4, §12, §15, DECISION_LOG D-03, D-18, D-19, D-43

-- 1. Business Settings (Singleton)
CREATE TABLE IF NOT EXISTS public.business_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  studio_name text NOT NULL DEFAULT 'VOWS Studio',
  tagline text DEFAULT 'Cinema & Stills',
  phone text DEFAULT '+91 98400 12345',
  email text DEFAULT 'hello@vowsstudio.com',
  website text DEFAULT 'https://vowsstudio.com',
  address_line1 text DEFAULT '12 Studio Lane',
  address_line2 text DEFAULT 'Arts District',
  city text DEFAULT 'Chennai',
  state text DEFAULT 'Tamil Nadu',
  state_code char(2) DEFAULT '33',
  pincode text DEFAULT '600001',
  gstin text,
  pan text,
  bank_name text,
  bank_account_holder text,
  bank_account_number text,
  bank_ifsc text,
  upi_id text,
  setup_mode boolean NOT NULL DEFAULT true,
  setup_locked_at timestamptz,
  gst_enabled boolean NOT NULL DEFAULT false,
  default_cgst_bps integer DEFAULT 900,
  default_sgst_bps integer DEFAULT 900,
  default_igst_bps integer DEFAULT 1800,
  logo_path text,
  primary_color text DEFAULT '#4c6452',
  secondary_color text DEFAULT '#ceead2',
  letterhead_layout text DEFAULT 'classic',
  email_signature text DEFAULT 'Warm regards,\nVOWS Studio Team',
  social_links jsonb DEFAULT '{}'::jsonb,
  default_quote_validity_days integer DEFAULT 30,
  default_quote_terms text DEFAULT '1. 50% advance to confirm booking.\n2. Balance payable on completion of delivery.',
  default_invoice_terms text DEFAULT 'Payment due within 15 days of issue date.',
  default_payment_terms text DEFAULT 'Net 15 days.',
  receipt_note text DEFAULT 'Thank you for your payment.',
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed singleton business settings
INSERT INTO public.business_settings (id, studio_name)
VALUES (1, 'VOWS Studio')
ON CONFLICT (id) DO NOTHING;

-- Trigger touch updated_at
CREATE TRIGGER business_settings_touch_updated_at
  BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

-- Trigger audit on business_settings
CREATE TRIGGER business_settings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 2. Document Numbering Configuration
CREATE TABLE IF NOT EXISTS public.document_number_config (
  doc_type document_type PRIMARY KEY,
  prefix text NOT NULL,
  padding smallint NOT NULL DEFAULT 6,
  year_format text NOT NULL DEFAULT 'YYYY' CHECK (year_format IN ('YYYY', 'YY')),
  fy_start_month smallint NOT NULL DEFAULT 4 CHECK (fy_start_month BETWEEN 1 AND 12),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed document number config
INSERT INTO public.document_number_config (doc_type, prefix, padding, year_format, fy_start_month)
VALUES
  ('QT', 'QT', 6, 'YYYY', 4),
  ('INV', 'INV', 6, 'YYYY', 4),
  ('RCP', 'RCP', 6, 'YYYY', 4),
  ('BK', 'BK', 6, 'YYYY', 4),
  ('CN', 'CN', 6, 'YYYY', 4)
ON CONFLICT (doc_type) DO NOTHING;

-- 3. Document Sequences (Schema app, for atomic concurrency safety)
CREATE TABLE IF NOT EXISTS app.document_sequences (
  doc_type document_type NOT NULL,
  fy integer NOT NULL,
  last_value integer NOT NULL DEFAULT 0,
  PRIMARY KEY (doc_type, fy)
);

-- 4. Atomic Document Numbering Function
CREATE OR REPLACE FUNCTION app.next_document_number(
  p_doc_type document_type,
  p_date date DEFAULT current_date
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, app
AS $$
DECLARE
  v_cfg record;
  v_month integer;
  v_year integer;
  v_fy integer;
  v_seq integer;
  v_fy_str text;
  v_seq_str text;
BEGIN
  -- Read config
  SELECT prefix, padding, year_format, fy_start_month
  INTO v_cfg
  FROM public.document_number_config
  WHERE doc_type = p_doc_type;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration missing for document type: %', p_doc_type;
  END IF;

  v_month := EXTRACT(MONTH FROM p_date)::integer;
  v_year := EXTRACT(YEAR FROM p_date)::integer;

  -- Compute Financial Year (April start = 4)
  IF v_month < v_cfg.fy_start_month THEN
    v_fy := v_year - 1;
  ELSE
    v_fy := v_year;
  END IF;

  -- Atomic Sequence Increment
  INSERT INTO app.document_sequences (doc_type, fy, last_value)
  VALUES (p_doc_type, v_fy, 1)
  ON CONFLICT (doc_type, fy)
  DO UPDATE SET last_value = app.document_sequences.last_value + 1
  RETURNING last_value INTO v_seq;

  -- Format Year
  IF v_cfg.year_format = 'YY' THEN
    v_fy_str := to_char(v_fy % 100, 'FM00');
  ELSE
    v_fy_str := v_fy::text;
  END IF;

  -- Format Sequence
  v_seq_str := lpad(v_seq::text, v_cfg.padding, '0');

  RETURN v_cfg.prefix || '-' || v_fy_str || '-' || v_seq_str;
END;
$$;

-- 5. Service Category Tax (GST-05)
CREATE TABLE IF NOT EXISTS public.service_category_tax (
  category service_category PRIMARY KEY,
  hsn_sac_code text,
  cgst_bps integer,
  sgst_bps integer,
  igst_bps integer
);

-- Seed service categories
INSERT INTO public.service_category_tax (category, hsn_sac_code, cgst_bps, sgst_bps, igst_bps)
VALUES
  ('photography', '998381', 900, 900, 1800),
  ('videography', '998382', 900, 900, 1800),
  ('cinematography', '998382', 900, 900, 1800),
  ('drone', '998381', 900, 900, 1800),
  ('album', '998912', 600, 600, 1200),
  ('editing', '998384', 900, 900, 1800),
  ('other', '998389', 900, 900, 1800)
ON CONFLICT (category) DO NOTHING;

-- 6. Email Templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  code text PRIMARY KEY CHECK (code IN (
    'quotation',
    'invoice',
    'receipt',
    'payment_reminder',
    'review_request',
    'invitation',
    'password_reset'
  )),
  subject text NOT NULL,
  body_html text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed default email templates
INSERT INTO public.email_templates (code, subject, body_html)
VALUES
  (
    'quotation',
    'Quotation from VOWS Studio — {{quotation_number}}',
    '<p>Dear {{client_name}},</p><p>Thank you for reaching out to VOWS Studio. Please find attached your quotation <strong>{{quotation_number}}</strong> for your upcoming event on {{event_date}}.</p><p>Total Amount: <strong>{{total_amount}}</strong></p><p>This quotation is valid until {{valid_until}}.</p><p>Warm regards,<br>VOWS Studio</p>'
  ),
  (
    'invoice',
    'Invoice from VOWS Studio — {{invoice_number}}',
    '<p>Dear {{client_name}},</p><p>Please find attached invoice <strong>{{invoice_number}}</strong> for the amount of <strong>{{total_amount}}</strong>.</p><p>Due Date: {{due_date}}</p><p>Warm regards,<br>VOWS Studio</p>'
  ),
  (
    'receipt',
    'Payment Receipt from VOWS Studio — {{receipt_number}}',
    '<p>Dear {{client_name}},</p><p>We acknowledge receipt of your payment <strong>{{payment_amount}}</strong> towards invoice {{invoice_number}}.</p><p>Receipt Number: <strong>{{receipt_number}}</strong></p><p>Thank you for choosing VOWS Studio!</p>'
  ),
  (
    'payment_reminder',
    'Payment Reminder — Invoice {{invoice_number}}',
    '<p>Dear {{client_name}},</p><p>This is a gentle reminder regarding unpaid invoice <strong>{{invoice_number}}</strong> with an outstanding balance of <strong>{{balance_due}}</strong>, due on {{due_date}}.</p>'
  ),
  (
    'review_request',
    'We would love your feedback — VOWS Studio',
    '<p>Dear {{client_name}},</p><p>It was an absolute pleasure capturing your memories! We would deeply appreciate your feedback on our service.</p><p><a href="{{review_link}}">Click here to leave a review</a></p>'
  ),
  (
    'invitation',
    'Invitation to join VOWS Studio workspace',
    '<p>Hello {{recipient_name}},</p><p>You have been invited to join the VOWS Studio management platform as a <strong>{{role_name}}</strong>.</p><p><a href="{{invite_link}}">Click here to accept your invitation</a></p><p>This link is valid for 72 hours.</p>'
  ),
  (
    'password_reset',
    'Reset your VOWS Studio password',
    '<p>Hello,</p><p>You requested a password reset for your VOWS Studio account. Click the link below to set a new password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>This link is valid for 1 hour.</p>'
  )
ON CONFLICT (code) DO NOTHING;

-- 7. Gmail Credentials (Singleton, Service-role only)
CREATE TABLE IF NOT EXISTS public.gmail_credentials (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  google_email text NOT NULL,
  from_name text,
  reply_to text,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  scopes text[] NOT NULL,
  status gmail_connection_status NOT NULL DEFAULT 'disconnected',
  connected_by uuid REFERENCES public.profiles(id),
  connected_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Email Send Log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type document_type,
  document_id uuid,
  client_id uuid,
  recipient text NOT NULL,
  subject text NOT NULL,
  sender_email text NOT NULL,
  gmail_message_id text,
  status email_send_status NOT NULL,
  error text,
  idempotency_key text NOT NULL UNIQUE,
  sent_by uuid NOT NULL REFERENCES public.profiles(id),
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_client_idx ON public.email_send_log (client_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS email_send_log_doc_idx ON public.email_send_log (document_type, document_id);

-- 9. Expense Categories
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  is_builtin boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  sort integer DEFAULT 0
);

-- Seed expense categories
INSERT INTO public.expense_categories (code, name, is_builtin, sort)
VALUES
  ('equipment', 'Equipment & Gear', true, 1),
  ('travel', 'Travel & Conveyance', true, 2),
  ('crew_payment', 'Crew Payment', true, 3),
  ('marketing', 'Marketing & Advertising', true, 4),
  ('software', 'Software & Cloud Subscriptions', true, 5),
  ('rent', 'Studio Space & Rent', true, 6),
  ('utilities', 'Utilities & Electricity', true, 7),
  ('miscellaneous', 'Miscellaneous Expenses', true, 8)
ON CONFLICT (code) DO NOTHING;

-- 10. Site Content & SEO
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_page_seo (
  page_key text PRIMARY KEY,
  meta_title text,
  meta_description text,
  og_image_path text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_number_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_category_tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_page_seo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
