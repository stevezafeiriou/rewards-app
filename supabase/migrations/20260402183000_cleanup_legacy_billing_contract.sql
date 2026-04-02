UPDATE public.subscription_plans
SET
  audience = COALESCE(audience, plan_type),
  monthly_price_cents = COALESCE(monthly_price_cents, price_monthly_cents)
WHERE audience IS DISTINCT FROM COALESCE(audience, plan_type)
   OR monthly_price_cents IS DISTINCT FROM COALESCE(monthly_price_cents, price_monthly_cents);

UPDATE public.businesses
SET setup_fee_paid_at = COALESCE(setup_fee_paid_at, subscription_started_at, created_at)
WHERE setup_fee_paid_at IS NULL
  AND COALESCE(one_time_fee_paid, false) = true;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_monthly_price_cents_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_monthly_price_cents_check
  CHECK (monthly_price_cents >= 0);

CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_count integer;
  v_total_spent numeric;
  v_businesses_visited integer;
  v_total_rewards integer;
  v_account_age integer;
  v_subscription_tier public.subscription_tier;
  badge_rec record;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(amount_spent), 0),
    COUNT(DISTINCT business_id)
  INTO v_transaction_count, v_total_spent, v_businesses_visited
  FROM public.transactions
  WHERE user_id = p_user_id;

  SELECT total_rewards_points, subscription_tier
  INTO v_total_rewards, v_subscription_tier
  FROM public.end_user_profiles
  WHERE id = p_user_id;

  SELECT EXTRACT(day FROM now() - created_at)::integer
  INTO v_account_age
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT public.is_paid_end_user_tier(v_subscription_tier) THEN
    RETURN;
  END IF;

  FOR badge_rec IN
    SELECT *
    FROM public.badges
    WHERE is_active = true
  LOOP
    CONTINUE WHEN EXISTS (
      SELECT 1
      FROM public.user_badges
      WHERE user_id = p_user_id
        AND badge_id = badge_rec.id
    );

    IF (badge_rec.criteria_type = 'transaction_count' AND v_transaction_count >= badge_rec.criteria_value)
       OR (badge_rec.criteria_type = 'total_spent' AND v_total_spent >= badge_rec.criteria_value)
       OR (badge_rec.criteria_type = 'businesses_visited' AND v_businesses_visited >= badge_rec.criteria_value)
       OR (badge_rec.criteria_type = 'rewards_earned' AND v_total_rewards >= badge_rec.criteria_value)
       OR (badge_rec.criteria_type = 'account_age_days' AND v_account_age >= badge_rec.criteria_value)
    THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, badge_rec.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      INSERT INTO public.notifications (user_id, title, body, type, metadata)
      VALUES (
        p_user_id,
        'New Badge Earned!',
        format('You earned the "%s" badge!', badge_rec.name),
        'badge',
        jsonb_build_object(
          'badge_id', badge_rec.id,
          'badge_name', badge_rec.name
        )
      );
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.lookup_member(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_month_start date := public.current_athens_month_start();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT public.current_user_has_role('admin') AND NOT EXISTS (
    SELECT 1
    FROM public.business_staff bs
    JOIN public.businesses b ON b.id = bs.business_id
    WHERE bs.user_id = auth.uid()
      AND bs.is_active = true
      AND b.is_active = true
      AND b.subscription_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'user_id', p.id,
    'public_user_id', p.public_user_id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'avatar_url', p.avatar_url,
    'subscription_tier', eup.subscription_tier,
    'subscription_status', eup.subscription_status,
    'remaining_monthly_redemptions',
      GREATEST(
        public.get_end_user_monthly_redemption_limit(eup.subscription_tier)
        - COALESCE(eumu.offer_redemptions_used, 0),
        0
      ),
    'remaining_monthly_unlocks',
      GREATEST(
        public.get_end_user_monthly_unlock_limit(eup.subscription_tier)
        - COALESCE(eumu.offers_unlocked_used, 0),
        0
      ),
    'is_active', p.is_active
  )
  INTO result
  FROM public.profiles p
  JOIN public.end_user_profiles eup ON eup.id = p.id
  LEFT JOIN public.end_user_monthly_usage eumu
    ON eumu.user_id = p.id
   AND eumu.month_start = v_month_start
  WHERE p.public_user_id = p_identifier
    AND p.role = 'end_user'
    AND p.is_active = true;

  IF result IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.unlock_offer(p_offer_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.end_user_profiles%ROWTYPE;
  v_offer public.offers%ROWTYPE;
  v_month_start date := public.current_athens_month_start();
  v_usage public.end_user_monthly_usage%ROWTYPE;
  v_unlock_limit integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.end_user_profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile not found';
  END IF;

  SELECT *
  INTO v_offer
  FROM public.offers
  WHERE id = p_offer_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found';
  END IF;

  IF v_offer.status <> 'active'
     OR v_offer.starts_at > now()
     OR (v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now()) THEN
    RAISE EXCEPTION 'Offer is not available';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = v_offer.business_id
      AND b.is_active = true
      AND b.subscription_status = 'active'
      AND b.is_verified = true
  ) THEN
    RAISE EXCEPTION 'Offer business is not active';
  END IF;

  PERFORM public.ensure_end_user_monthly_usage_row(v_user_id, v_month_start);

  IF EXISTS (
    SELECT 1
    FROM public.end_user_offer_unlocks
    WHERE user_id = v_user_id
      AND offer_id = p_offer_id
      AND month_start = v_month_start
  ) THEN
    SELECT *
    INTO v_usage
    FROM public.end_user_monthly_usage
    WHERE user_id = v_user_id
      AND month_start = v_month_start;

    RETURN jsonb_build_object(
      'offer_id', p_offer_id,
      'already_unlocked', true,
      'remaining_unlocks', GREATEST(public.get_end_user_monthly_unlock_limit(v_profile.subscription_tier) - COALESCE(v_usage.offers_unlocked_used, 0), 0)
    );
  END IF;

  v_unlock_limit := public.get_end_user_monthly_unlock_limit(v_profile.subscription_tier);

  SELECT *
  INTO v_usage
  FROM public.end_user_monthly_usage
  WHERE user_id = v_user_id
    AND month_start = v_month_start
  FOR UPDATE;

  IF COALESCE(v_usage.offers_unlocked_used, 0) >= v_unlock_limit THEN
    RAISE EXCEPTION 'Monthly offer unlock limit reached';
  END IF;

  INSERT INTO public.end_user_offer_unlocks (
    user_id,
    offer_id,
    business_id,
    month_start
  )
  VALUES (
    v_user_id,
    p_offer_id,
    v_offer.business_id,
    v_month_start
  );

  UPDATE public.end_user_monthly_usage
  SET offers_unlocked_used = offers_unlocked_used + 1,
      updated_at = now()
  WHERE user_id = v_user_id
    AND month_start = v_month_start;

  RETURN jsonb_build_object(
    'offer_id', p_offer_id,
    'already_unlocked', false,
    'remaining_unlocks', GREATEST(v_unlock_limit - COALESCE(v_usage.offers_unlocked_used, 0) - 1, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_marketplace_offers(
  p_user_id uuid DEFAULT NULL,
  p_category_slug text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  offer_id uuid,
  title text,
  description text,
  offer_type public.offer_type,
  discount_value numeric,
  image_url text,
  starts_at timestamptz,
  expires_at timestamptz,
  requires_paid_membership boolean,
  business_id uuid,
  business_name text,
  business_slug text,
  business_profile_image text,
  business_category_name text,
  is_favorited boolean,
  is_unlocked boolean,
  remaining_monthly_unlocks integer,
  remaining_monthly_redemptions integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier public.subscription_tier := 'end_user_free'::public.subscription_tier;
  v_month_start date := public.current_athens_month_start();
  v_unlocks_used integer := 0;
  v_redemptions_used integer := 0;
BEGIN
  IF p_user_id IS NOT NULL THEN
    IF p_user_id <> auth.uid() AND NOT public.current_user_has_role('admin') THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(subscription_tier, 'end_user_free'::public.subscription_tier)
    INTO v_tier
    FROM public.end_user_profiles
    WHERE id = p_user_id;

    SELECT COALESCE(offers_unlocked_used, 0),
           COALESCE(offer_redemptions_used, 0)
    INTO v_unlocks_used, v_redemptions_used
    FROM public.end_user_monthly_usage
    WHERE user_id = p_user_id
      AND month_start = v_month_start;
  END IF;

  RETURN QUERY
  SELECT
    o.id AS offer_id,
    o.title,
    o.description,
    o.offer_type,
    o.discount_value,
    o.image_url,
    o.starts_at,
    o.expires_at,
    o.requires_paid_membership,
    b.id AS business_id,
    b.name AS business_name,
    b.slug AS business_slug,
    b.profile_image_url AS business_profile_image,
    bc.name AS business_category_name,
    COALESCE(uf.id IS NOT NULL, false) AS is_favorited,
    COALESCE(eou.id IS NOT NULL, false) AS is_unlocked,
    GREATEST(public.get_end_user_monthly_unlock_limit(v_tier) - COALESCE(v_unlocks_used, 0), 0) AS remaining_monthly_unlocks,
    GREATEST(public.get_end_user_monthly_redemption_limit(v_tier) - COALESCE(v_redemptions_used, 0), 0) AS remaining_monthly_redemptions
  FROM public.offers o
  JOIN public.businesses b ON b.id = o.business_id
  LEFT JOIN public.business_categories bc ON bc.id = b.category_id
  LEFT JOIN public.user_favorites uf
    ON uf.offer_id = o.id
   AND p_user_id IS NOT NULL
   AND uf.user_id = p_user_id
  LEFT JOIN public.end_user_offer_unlocks eou
    ON eou.offer_id = o.id
   AND p_user_id IS NOT NULL
   AND eou.user_id = p_user_id
   AND eou.month_start = v_month_start
  WHERE o.status = 'active'
    AND o.starts_at <= now()
    AND (o.expires_at IS NULL OR o.expires_at > now())
    AND b.is_active = true
    AND b.is_verified = true
    AND b.subscription_status = 'active'
    AND (o.max_redemptions IS NULL OR o.current_redemptions < o.max_redemptions)
    AND (p_category_slug IS NULL OR bc.slug = p_category_slug)
    AND (
      p_search IS NULL
      OR o.title ILIKE '%' || p_search || '%'
      OR COALESCE(o.description, '') ILIKE '%' || p_search || '%'
      OR b.name ILIKE '%' || p_search || '%'
    )
  ORDER BY o.is_featured DESC, o.created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

DO $$
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'expire-subscriptions'
  LIMIT 1;

  IF v_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(v_job_id);
  END IF;
END $$;

SELECT cron.schedule(
  'expire-subscriptions',
  '10 0 * * *',
  $$
    UPDATE public.end_user_profiles
    SET subscription_status = 'expired',
        subscription_tier = 'end_user_free',
        card_included_by_plan = false,
        updated_at = now()
    WHERE subscription_status IN ('cancelled', 'past_due')
      AND subscription_ends_at IS NOT NULL
      AND subscription_ends_at < now();

    UPDATE public.membership_cards
    SET status = 'disabled',
        disabled_at = now(),
        updated_at = now()
    WHERE user_id IN (
      SELECT id
      FROM public.end_user_profiles
      WHERE subscription_status = 'expired'
        AND subscription_tier = 'end_user_free'
    )
      AND status = 'active';

    UPDATE public.businesses
    SET is_active = false,
        subscription_status = 'expired',
        updated_at = now()
    WHERE subscription_status IN ('cancelled', 'past_due')
      AND subscription_ends_at IS NOT NULL
      AND subscription_ends_at < now();

    UPDATE public.offers
    SET status = 'paused',
        updated_at = now()
    WHERE business_id IN (
      SELECT id
      FROM public.businesses
      WHERE subscription_status = 'expired'
    )
      AND status = 'active';
  $$
);

DROP INDEX IF EXISTS public.idx_businesses_slug;
DROP INDEX IF EXISTS public.business_staff_active_business_user_unique;

ALTER TABLE public.businesses
  DROP COLUMN IF EXISTS one_time_fee_paid;

ALTER TABLE public.end_user_profiles
  DROP COLUMN IF EXISTS subscription_plan;

ALTER TABLE public.subscription_plans
  DROP COLUMN IF EXISTS plan_type,
  DROP COLUMN IF EXISTS price_monthly_cents;

DROP TYPE IF EXISTS public.user_subscription_plan;
