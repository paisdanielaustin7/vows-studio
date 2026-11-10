-- VOWS Studio — Migration 006: Catalogue (Services, Packages, Price History)
-- Specs: DATABASE_SCHEMA §6, §11, §14, BUSINESS_WORKFLOWS §2.2

-- 1. Services
CREATE TABLE IF NOT EXISTS public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category service_category NOT NULL,
  description text,
  unit service_unit NOT NULL DEFAULT 'day',
  is_active boolean NOT NULL DEFAULT true,
  show_on_website boolean NOT NULL DEFAULT false,
  sort integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER services_touch_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER services_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.services
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 2. Service Prices (Price History)
CREATE TABLE IF NOT EXISTS public.service_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  price_paise bigint NOT NULL CHECK (price_paise >= 0),
  effective_from date NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT service_prices_unique UNIQUE (service_id, effective_from)
);

CREATE INDEX IF NOT EXISTS service_prices_lookup_idx
  ON public.service_prices (service_id, effective_from DESC);

-- 3. Packages
CREATE TABLE IF NOT EXISTS public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  show_on_website boolean NOT NULL DEFAULT false,
  sort integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER packages_touch_updated_at
  BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TRIGGER packages_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION app.audit_trigger();

-- 4. Package Prices (Price History)
CREATE TABLE IF NOT EXISTS public.package_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  price_paise bigint NOT NULL CHECK (price_paise >= 0),
  effective_from date NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT package_prices_unique UNIQUE (package_id, effective_from)
);

CREATE INDEX IF NOT EXISTS package_prices_lookup_idx
  ON public.package_prices (package_id, effective_from DESC);

-- 5. Package Items (Services included in package)
CREATE TABLE IF NOT EXISTS public.package_items (
  package_id uuid NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  PRIMARY KEY (package_id, service_id)
);

-- 6. Current Price Views (DATABASE_SCHEMA §11)
CREATE OR REPLACE VIEW public.services_current_price_v AS
SELECT DISTINCT ON (s.id)
  s.id,
  s.name,
  s.category,
  s.description,
  s.unit,
  s.is_active,
  s.show_on_website,
  s.sort,
  s.deleted_at,
  sp.price_paise AS current_price_paise,
  sp.effective_from AS price_effective_from
FROM public.services s
LEFT JOIN public.service_prices sp
  ON sp.service_id = s.id AND sp.effective_from <= current_date
ORDER BY s.id, sp.effective_from DESC;

CREATE OR REPLACE VIEW public.packages_current_price_v AS
SELECT DISTINCT ON (p.id)
  p.id,
  p.name,
  p.description,
  p.is_active,
  p.show_on_website,
  p.sort,
  p.deleted_at,
  pp.price_paise AS current_price_paise,
  pp.effective_from AS price_effective_from
FROM public.packages p
LEFT JOIN public.package_prices pp
  ON pp.package_id = p.id AND pp.effective_from <= current_date
ORDER BY p.id, pp.effective_from DESC;

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_items ENABLE ROW LEVEL SECURITY;
