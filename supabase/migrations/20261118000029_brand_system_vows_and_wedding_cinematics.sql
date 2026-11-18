-- VOWS — Migration 029: Brand System Alignment ("VOWS" and "Wedding Cinematic & Stills")
-- Aligns database defaults, email templates, business settings, and website CMS entries.

-- 1. Update business_settings schema defaults and existing records
ALTER TABLE public.business_settings ALTER COLUMN studio_name SET DEFAULT 'VOWS';
ALTER TABLE public.business_settings ALTER COLUMN tagline SET DEFAULT 'Wedding Cinematic & Stills';

UPDATE public.business_settings
SET studio_name = 'VOWS',
    tagline = 'Wedding Cinematic & Stills',
    updated_at = now()
WHERE id = 1;

-- 2. Update email_templates subjects and bodies
UPDATE public.email_templates
SET subject = REPLACE(subject, 'VOWS Studio', 'VOWS'),
    body_html = REPLACE(body_html, 'VOWS Studio', 'VOWS'),
    updated_at = now()
WHERE subject LIKE '%VOWS Studio%' OR body_html LIKE '%VOWS Studio%';

-- Specific email template polish
UPDATE public.email_templates
SET subject = 'Quotation from VOWS — {{quotation_number}}',
    body_html = '<p>Dear {{client_name}},</p><p>Thank you for reaching out to VOWS. Please find attached your quotation <strong>{{quotation_number}}</strong> for your upcoming celebration on {{event_date}}.</p><p>Total Investment: <strong>{{total_amount}}</strong></p><p>This quotation is valid until {{valid_until}}.</p><p>Warm regards,<br>Reuben & the VOWS Team</p>',
    updated_at = now()
WHERE code = 'quotation';

UPDATE public.email_templates
SET subject = 'Invoice from VOWS — {{invoice_number}}',
    body_html = '<p>Dear {{client_name}},</p><p>Please find attached invoice <strong>{{invoice_number}}</strong> for the amount of <strong>{{total_amount}}</strong>.</p><p>Due Date: {{due_date}}</p><p>Warm regards,<br>Reuben & the VOWS Team</p>',
    updated_at = now()
WHERE code = 'invoice';

UPDATE public.email_templates
SET subject = 'Payment Receipt from VOWS — {{receipt_number}}',
    body_html = '<p>Dear {{client_name}},</p><p>We acknowledge receipt of your payment <strong>{{payment_amount}}</strong> towards invoice {{invoice_number}}.</p><p>Receipt Number: <strong>{{receipt_number}}</strong></p><p>Thank you for choosing VOWS!</p>',
    updated_at = now()
WHERE code = 'receipt';

UPDATE public.email_templates
SET subject = 'We would love your reflection — VOWS',
    body_html = '<p>Dear {{client_name}},</p><p>It was an absolute honor capturing your celebration! We would deeply appreciate your personal reflection on our work.</p><p><a href="{{review_link}}">Click here to leave your reflection</a></p>',
    updated_at = now()
WHERE code = 'review_request';

UPDATE public.email_templates
SET subject = 'Invitation to join VOWS CRM',
    body_html = '<p>Hello {{recipient_name}},</p><p>You have been invited to join the VOWS CRM platform as a <strong>{{role_name}}</strong>.</p><p><a href="{{invite_link}}">Click here to accept your invitation</a></p><p>This link is valid for 72 hours.</p>',
    updated_at = now()
WHERE code = 'invitation';

UPDATE public.email_templates
SET subject = 'Reset your VOWS password',
    body_html = '<p>Hello,</p><p>You requested a password reset for your VOWS account. Click the link below to set a new password:</p><p><a href="{{reset_link}}">Reset Password</a></p><p>This link is valid for 1 hour.</p>',
    updated_at = now()
WHERE code = 'password_reset';

-- 3. Update site_page_seo
UPDATE public.site_page_seo
SET meta_title = REPLACE(REPLACE(meta_title, 'VOWS Studio', 'VOWS'), 'Cinema & Stills', 'Wedding Cinematic & Stills'),
    meta_description = REPLACE(REPLACE(meta_description, 'VOWS Studio', 'VOWS'), 'Cinema & Stills', 'Wedding Cinematic & Stills'),
    updated_at = now()
WHERE meta_title LIKE '%VOWS Studio%' OR meta_title LIKE '%Cinema & Stills%'
   OR meta_description LIKE '%VOWS Studio%' OR meta_description LIKE '%Cinema & Stills%';

-- 4. Update site_content CMS values
UPDATE public.site_content
SET value = REPLACE(REPLACE(value, 'VOWS Studio', 'VOWS'), 'VOWS STUDIO', 'VOWS'),
    updated_at = now()
WHERE key IN ('home_settings', 'about_settings', 'privacy_policy', 'terms_of_service');
