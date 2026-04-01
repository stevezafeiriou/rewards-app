BEGIN;

DROP VIEW IF EXISTS public.v_active_marketplace_businesses;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_business_url text;

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude;

CREATE OR REPLACE VIEW public.v_active_marketplace_businesses AS
SELECT
  b.id,
  b.name,
  b.slug,
  b.description,
  b.profile_image_url,
  b.cover_image_url,
  b.city,
  b.region,
  b.google_business_url,
  bc.name AS category_name,
  bc.slug AS category_slug,
  bc.icon AS category_icon,
  (
    SELECT COUNT(*)
    FROM public.offers o
    WHERE o.business_id = b.id
      AND o.status = 'active'
      AND o.starts_at <= now()
      AND (o.expires_at IS NULL OR o.expires_at > now())
  ) AS active_offers_count
FROM public.businesses b
LEFT JOIN public.business_categories bc ON bc.id = b.category_id
WHERE b.is_active = true
  AND b.is_verified = true
  AND b.subscription_status = 'active';

COMMIT;
