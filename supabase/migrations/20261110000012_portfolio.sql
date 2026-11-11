-- VOWS Studio — Migration 012: Portfolio Tables and Constraints
-- Reference: DATABASE_SCHEMA §10, SECURITY_PLAN §10.2, DECISION_LOG D-29

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type public.event_type NOT NULL,
  description text,
  shoot_date date,
  cover_image_path text,
  video_url text,
  tags text[],
  sort integer NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  client_consent_confirmed_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT check_portfolio_consent_to_publish
    CHECK (NOT is_published OR client_consent_confirmed_at IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_published
  ON public.portfolio_items (is_published, sort ASC, shoot_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_items_event_type
  ON public.portfolio_items (event_type)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.portfolio_items(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  alt_text text NOT NULL,
  width integer,
  height integer,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_item
  ON public.portfolio_images (item_id, sort ASC);

-- Trigger for touch_updated_at on portfolio_items
DROP TRIGGER IF EXISTS trg_portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW
  EXECUTE FUNCTION app.touch_updated_at();

-- Seed Sample High-End Wedding Portfolio Work (Consent confirmed per SECURITY_PLAN §10)
INSERT INTO public.portfolio_items (
  id, title, event_type, description, shoot_date, cover_image_path, video_url, tags, sort, is_published, client_consent_confirmed_at
) VALUES
(
  'a0000000-0000-0000-0000-000000000001',
  'Derick & Samantha — Heritage Courtyard & Coastal Solemnization',
  'wedding',
  'A sacred Catholic nuptial celebration and sun-drenched coastal reception in South Goa. Captured across 35mm analog film and 4K cinema.',
  '2026-02-14',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
  'https://vimeo.com/76979871',
  ARRAY['35mm Film', 'Goa', 'Heritage Courtyard', 'Cathedral'],
  1,
  true,
  '2026-02-10 10:00:00+05:30'
),
(
  'a0000000-0000-0000-0000-000000000002',
  'St. Aloysius Chapel Solemn Nuptials — Kenneth & Rochelle',
  'wedding',
  'Intimate chapel vows beneath frescoed cathedral arches in Mangalore, followed by a lantern-lit estate reception.',
  '2026-01-20',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
  null,
  ARRAY['Chapel', 'Mangalore', 'Liturgical', 'Editorial'],
  2,
  true,
  '2026-01-18 11:30:00+05:30'
),
(
  'a0000000-0000-0000-0000-000000000003',
  'Bridal Veil & Heirloom Lace — Analog Monograph',
  'portrait',
  'Quiet moments of bridal preparation captured on Kodak Tri-X 400 black and white medium format film.',
  '2026-03-05',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1600&q=80',
  null,
  ARRAY['Kodak Tri-X', 'Analog', 'Bridal Portrait', 'Fine Art'],
  3,
  true,
  '2026-03-01 09:00:00+05:30'
),
(
  'a0000000-0000-0000-0000-000000000004',
  'Sunset Over Miramar — Neil & Alisha Pre-Wedding Session',
  'pre_wedding',
  'Gentle coastal ocean breeze, golden backlight, and natural movement along the historic Goa coastline.',
  '2026-02-28',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80',
  null,
  ARRAY['Pre-Wedding', 'Golden Hour', 'Miramar Beach', 'Goa'],
  4,
  true,
  '2026-02-25 16:00:00+05:30'
),
(
  'a0000000-0000-0000-0000-000000000005',
  'The Roce Blessing — Heritage Mangalorean Ceremony',
  'mehendi',
  'The sacred coconut milk blessing ceremony filled with generational warmth, laughter, and liturgical hymns.',
  '2026-01-15',
  'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&w=1600&q=80',
  null,
  ARRAY['Tradition', 'Roce', 'Mangalore', 'Cultural Heritage'],
  5,
  true,
  '2026-01-12 14:00:00+05:30'
),
(
  'a0000000-0000-0000-0000-000000000006',
  'Coastal Grand Ballroom Reception — Rohan & Nikita',
  'reception',
  'Twilight ballroom celebration overlooking the Arabian Sea, featuring brass jazz, candlelit dinner tables, and unscripted joy.',
  '2026-03-12',
  'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1600&q=80',
  null,
  ARRAY['Reception', 'Ballroom', 'Arabian Sea', 'Nightfall Stills'],
  6,
  true,
  '2026-03-10 18:00:00+05:30'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Gallery Images
INSERT INTO public.portfolio_images (
  id, item_id, storage_path, alt_text, sort
) VALUES
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1600&q=80',
  'Bride and groom walking through heritage stone arches in Goa during golden sunset',
  1
),
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
  'Bride in ivory lace veil exchanging vows before cathedral altar',
  2
),
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000002',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1600&q=80',
  'Solemn vows inside St. Aloysius Chapel with frescoed church ceiling',
  1
),
(
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000003',
  'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1600&q=80',
  'Close-up analog black and white portrait of bride holding vintage bouquet',
  1
)
ON CONFLICT (id) DO NOTHING;

-- Public Storage Buckets (portfolio, branding) per D-29 & GLOSSARY §10
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('portfolio', 'portfolio', true), ('branding', 'branding', true)
    ON CONFLICT (id) DO UPDATE SET public = true;
  END IF;
END $$;

-- Seed Default FAQ Items
INSERT INTO public.faq_items (question, answer, sort, is_published)
VALUES
(
  'When will we receive our wedding films and photographs?',
  'Our standard delivery timeline is 4 to 6 weeks for master-graded stills and 8 to 10 weeks for cinematic feature films. You receive an online gallery preview and private portal download.',
  1,
  true
),
(
  'Do you provide unedited RAW footage or images?',
  'We believe our craft includes meticulous culling, color science, and liturgical color grading. Unedited RAW files can be ordered as an archival vault package add-on.',
  2,
  true
),
(
  'Do you travel for destination weddings outside Goa and Mangalore?',
  'Yes. While our primary ateliers are in Mangalore and Goa, we document sacred solemnizations across India and worldwide. Travel and accommodation are billed at transparent actual cost.',
  3,
  true
),
(
  'What is the booking protocol and advance retainer?',
  'To secure your dates, a signed digital agreement and a 25% non-refundable advance retainer are required. The remaining schedule is balanced according to our standard 4-tranche plan.',
  4,
  true
),
(
  'Can we include 35mm chemical film coverage?',
  'Yes, authentic 35mm analog film and 120 medium format coverage are signature elements of VOWS Studio, processed in dedicated archival labs.',
  5,
  true
)
ON CONFLICT DO NOTHING;

-- Seed Default Site Page SEO
INSERT INTO public.site_page_seo (page_key, meta_title, meta_description)
VALUES
  ('/', 'VOWS Studio — Wedding Cinematic & Stills | Goa & Mangalore', 'Understated cinematic documentation and heirloom analog stills capturing sacred vows across heritage chapels and coastal weddings.'),
  ('/portfolio', 'Curated Portfolio — VOWS Studio', 'Selected monographs of chapel solemnizations, coastal receptions, and 35mm analog wedding moments.'),
  ('/services', 'Services & Investment Collections — VOWS Studio', 'Transparent pricing for signature wedding cinematography, heirloom photography, and analog film coverage.'),
  ('/about', 'Our Heritage & Philosophy — VOWS Studio', 'Founded by Reuben Serrao. Dedicated to quiet reverence, natural light, and authentic emotional legacy.'),
  ('/contact', 'Enquire for Your Wedding Date — VOWS Studio', 'Check atelier availability and begin your bespoke wedding film consultation.'),
  ('/reviews', 'Kind Words & Testimonials — VOWS Studio', 'Verified reviews from couples who celebrated their sacred vows with VOWS Studio.'),
  ('/faq', 'Frequently Asked Questions — VOWS Studio', 'Delivery timelines, analog film preservation, travel policies, and booking details.'),
  ('/privacy', 'Privacy Policy — VOWS Studio', 'Our commitments to client privacy, image consent governance, and data security under DPDP.'),
  ('/terms', 'Terms of Service — VOWS Studio', 'Standard terms of engagement, copyright protection, delivery SLAs, and client guidelines.')
ON CONFLICT (page_key) DO NOTHING;

-- Seed Default Site Content
INSERT INTO public.site_content (key, value)
VALUES
  ('home_settings', '{"heroTitle": "VOWS STUDIO", "heroSubtitle": "Wedding Cinematic & Stills", "heroDescription": "Understated cinematic documentation and heirloom analog stills capturing sacred vows across heritage chapels, coastal solemnizations, and intimate family gatherings with reverent stillness.", "tagline": "Fine Art Christian Wedding Cinematography & Analog Stills • Goa & Mangalore"}'),
  ('about_settings', '{"founderName": "Reuben Serrao", "founderRole": "Founder & Principal Cinematographer", "heritageStory": "Founded in Light House Hill, Mangalore, VOWS Studio was born from a desire to return to reverence. In an era of hurried wedding trends and loud spectacles, we stand for quiet, enduring beauty.", "artisticPhilosophy": "We honor natural light, chemical film stock, and unchoreographed honesty. Our team documents sacred vows with the unobtrusive respect of a church guest rather than an intrusive production crew.", "equipmentPhilosophy": "From Leica rangefinders and mechanical 35mm film cameras to cinema-grade prime glass, every tool is chosen to preserve emotional weight without distracting from the solemnity of your sacrament."}'),
  ('privacy_policy', '{"lastUpdated": "2026-11-10", "content": "VOWS Studio operates with the highest standard of client privacy. We strictly honor client image publishing consent. No wedding images or videos are published to our portfolio without explicit, recorded consent. Personal information submitted via our enquiry portal is never sold or shared with third parties."}'),
  ('terms_of_service', '{"lastUpdated": "2026-11-10", "content": "All engagements with VOWS Studio are subject to our formal booking agreement. Dates are secured exclusively upon receipt of the advance retainer and digital counter-signature. Copyright of all captured media remains with VOWS Studio, granting the client a perpetual personal reproduction and display license."}')
ON CONFLICT (key) DO NOTHING;
