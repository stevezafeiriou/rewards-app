BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typnamespace = 'public'::regnamespace
      AND typname = 'subscription_tier'
  ) THEN
    CREATE TYPE public.subscription_tier AS ENUM (
      'end_user_free',
      'end_user_plus',
      'end_user_pro',
      'business_plus',
      'business_pro'
    );
  END IF;
END;
$$;

ALTER TABLE public.end_user_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'end_user_free',
  ADD COLUMN IF NOT EXISTS card_fee_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS card_included_by_plan boolean NOT NULL DEFAULT false;

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS subscription_tier public.subscription_tier NOT NULL DEFAULT 'business_plus',
  ADD COLUMN IF NOT EXISTS setup_fee_paid_at timestamptz;

UPDATE public.end_user_profiles
SET
  subscription_tier = CASE
    WHEN subscription_plan = 'paid' THEN 'end_user_plus'::public.subscription_tier
    ELSE 'end_user_free'::public.subscription_tier
  END,
  card_included_by_plan = false
WHERE subscription_tier IS DISTINCT FROM CASE
  WHEN subscription_plan = 'paid' THEN 'end_user_plus'::public.subscription_tier
  ELSE 'end_user_free'::public.subscription_tier
END;

UPDATE public.businesses
SET
  subscription_tier = 'business_plus'::public.subscription_tier,
  setup_fee_paid_at = COALESCE(setup_fee_paid_at, subscription_started_at, created_at)
WHERE true;

UPDATE public.businesses
SET setup_fee_paid_at = NULL
WHERE COALESCE(one_time_fee_paid, false) = false;

ALTER TABLE public.end_user_profiles
  DROP CONSTRAINT IF EXISTS end_user_profiles_subscription_tier_check;

ALTER TABLE public.end_user_profiles
  ADD CONSTRAINT end_user_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('end_user_free', 'end_user_plus', 'end_user_pro'));

ALTER TABLE public.businesses
  DROP CONSTRAINT IF EXISTS businesses_subscription_tier_check;

ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_subscription_tier_check
  CHECK (subscription_tier IN ('business_plus', 'business_pro'));

ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS monthly_price_cents integer,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS limits jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.subscription_plans
SET
  audience = COALESCE(audience, plan_type),
  monthly_price_cents = COALESCE(monthly_price_cents, price_monthly_cents),
  plan_code = COALESCE(
    plan_code,
    CASE
      WHEN COALESCE(audience, plan_type) = 'business' THEN 'business_plus'
      WHEN COALESCE(audience, plan_type) = 'end_user' THEN 'end_user_plus'
      ELSE lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
    END
  ),
  limits = CASE
    WHEN COALESCE(audience, plan_type) = 'business' THEN jsonb_build_object(
      'active_offers', 3,
      'monthly_transactions', 75
    )
    WHEN COALESCE(audience, plan_type) = 'end_user' THEN jsonb_build_object(
      'monthly_unlocks', 12,
      'monthly_redemptions', 8
    )
    ELSE '{}'::jsonb
  END
WHERE true;

ALTER TABLE public.subscription_plans
  ALTER COLUMN plan_code SET NOT NULL,
  ALTER COLUMN audience SET NOT NULL,
  ALTER COLUMN monthly_price_cents SET NOT NULL;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_type_check;

ALTER TABLE public.subscription_plans
  DROP CONSTRAINT IF EXISTS subscription_plans_audience_check;

ALTER TABLE public.subscription_plans
  ADD CONSTRAINT subscription_plans_audience_check
  CHECK (audience IN ('end_user', 'business'));

DROP INDEX IF EXISTS public.subscription_plans_variant_unique;
DROP INDEX IF EXISTS public.subscription_plans_plan_code_unique;

CREATE UNIQUE INDEX subscription_plans_variant_unique
  ON public.subscription_plans(audience, lemon_squeezy_variant_id);

CREATE UNIQUE INDEX subscription_plans_plan_code_unique
  ON public.subscription_plans(plan_code);

CREATE TABLE IF NOT EXISTS public.billing_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL UNIQUE,
  name text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('end_user', 'business')),
  kind text NOT NULL CHECK (kind IN ('setup_fee', 'card_fee', 'tx_pack')),
  linked_plan_code text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  credit_amount integer NOT NULL DEFAULT 0 CHECK (credit_amount >= 0),
  lemon_squeezy_product_id text,
  lemon_squeezy_variant_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_monthly_usage (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  included_transactions_used integer NOT NULL DEFAULT 0 CHECK (included_transactions_used >= 0),
  extra_transactions_used integer NOT NULL DEFAULT 0 CHECK (extra_transactions_used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, month_start)
);

CREATE TABLE IF NOT EXISTS public.end_user_monthly_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  offers_unlocked_used integer NOT NULL DEFAULT 0 CHECK (offers_unlocked_used >= 0),
  offer_redemptions_used integer NOT NULL DEFAULT 0 CHECK (offer_redemptions_used >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_start)
);

CREATE TABLE IF NOT EXISTS public.end_user_offer_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  month_start date NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, offer_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_end_user_offer_unlocks_user_month
  ON public.end_user_offer_unlocks(user_id, month_start, unlocked_at DESC);

CREATE INDEX IF NOT EXISTS idx_end_user_offer_unlocks_offer
  ON public.end_user_offer_unlocks(offer_id);

CREATE TABLE IF NOT EXISTS public.business_tx_credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  credits_delta integer NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('purchase', 'consumption', 'adjustment')),
  source_ref text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_tx_credit_ledger_business
  ON public.business_tx_credit_ledger(business_id, created_at DESC);

DROP TRIGGER IF EXISTS billing_products_set_updated_at ON public.billing_products;
CREATE TRIGGER billing_products_set_updated_at
  BEFORE UPDATE ON public.billing_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS business_monthly_usage_set_updated_at ON public.business_monthly_usage;
CREATE TRIGGER business_monthly_usage_set_updated_at
  BEFORE UPDATE ON public.business_monthly_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS end_user_monthly_usage_set_updated_at ON public.end_user_monthly_usage;
CREATE TRIGGER end_user_monthly_usage_set_updated_at
  BEFORE UPDATE ON public.end_user_monthly_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.current_athens_month_start(p_at timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT date_trunc('month', timezone('Europe/Athens', p_at))::date;
$$;

CREATE OR REPLACE FUNCTION public.get_business_offer_limit(p_tier public.subscription_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'business_pro' THEN 10
    ELSE 3
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_monthly_tx_limit(p_tier public.subscription_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'business_pro' THEN 300
    ELSE 75
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_end_user_monthly_unlock_limit(p_tier public.subscription_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'end_user_pro' THEN 50
    WHEN 'end_user_plus' THEN 12
    ELSE 3
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_end_user_monthly_redemption_limit(p_tier public.subscription_tier)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'end_user_pro' THEN 30
    WHEN 'end_user_plus' THEN 8
    ELSE 3
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_paid_end_user_tier(p_tier public.subscription_tier)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_tier IN ('end_user_plus', 'end_user_pro');
$$;

CREATE OR REPLACE FUNCTION public.get_business_tx_credit_balance(p_business_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(credits_delta), 0)::integer
  FROM public.business_tx_credit_ledger
  WHERE business_id = p_business_id;
$$;

CREATE OR REPLACE FUNCTION public.ensure_end_user_monthly_usage_row(p_user_id uuid, p_month_start date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.end_user_monthly_usage (user_id, month_start)
  VALUES (p_user_id, p_month_start)
  ON CONFLICT (user_id, month_start) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.ensure_business_monthly_usage_row(p_business_id uuid, p_month_start date)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.business_monthly_usage (business_id, month_start)
  VALUES (p_business_id, p_month_start)
  ON CONFLICT (business_id, month_start) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION public.enforce_business_active_offer_limit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_limit integer;
  v_active_count integer;
  v_tier public.subscription_tier;
BEGIN
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF auth.role() = 'service_role' OR public.current_user_has_role('admin') THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(subscription_tier, 'business_plus'::public.subscription_tier)
  INTO v_tier
  FROM public.businesses
  WHERE id = NEW.business_id;

  v_limit := public.get_business_offer_limit(v_tier);

  SELECT COUNT(*)
  INTO v_active_count
  FROM public.offers
  WHERE business_id = NEW.business_id
    AND status = 'active'
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF v_active_count >= v_limit THEN
    RAISE EXCEPTION 'Active offer limit reached for this business tier';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offers_enforce_business_active_offer_limit ON public.offers;
CREATE TRIGGER offers_enforce_business_active_offer_limit
  BEFORE INSERT OR UPDATE OF status ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_business_active_offer_limit();

CREATE OR REPLACE FUNCTION public.get_business_subscription_summary(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business public.businesses%ROWTYPE;
  v_month_start date := public.current_athens_month_start();
  v_usage public.business_monthly_usage%ROWTYPE;
  v_tx_limit integer;
  v_offer_limit integer;
  v_active_offers integer;
  v_extra_balance integer;
  v_plan_name text;
BEGIN
  IF NOT public.is_business_staff_member(p_business_id) AND NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  PERFORM public.ensure_business_monthly_usage_row(p_business_id, v_month_start);

  SELECT *
  INTO v_usage
  FROM public.business_monthly_usage
  WHERE business_id = p_business_id
    AND month_start = v_month_start;

  SELECT COUNT(*)
  INTO v_active_offers
  FROM public.offers
  WHERE business_id = p_business_id
    AND status = 'active';

  SELECT name
  INTO v_plan_name
  FROM public.subscription_plans
  WHERE plan_code = v_business.subscription_tier::text
    AND is_active = true
  LIMIT 1;

  v_tx_limit := public.get_business_monthly_tx_limit(v_business.subscription_tier);
  v_offer_limit := public.get_business_offer_limit(v_business.subscription_tier);
  v_extra_balance := public.get_business_tx_credit_balance(p_business_id);

  RETURN jsonb_build_object(
    'business_id', p_business_id,
    'subscription_tier', v_business.subscription_tier,
    'subscription_status', v_business.subscription_status,
    'plan_name', COALESCE(v_plan_name, v_business.subscription_tier::text),
    'setup_fee_paid', v_business.setup_fee_paid_at IS NOT NULL,
    'setup_fee_paid_at', v_business.setup_fee_paid_at,
    'subscription_started_at', v_business.subscription_started_at,
    'subscription_ends_at', v_business.subscription_ends_at,
    'lemon_squeezy_subscription_id', v_business.lemon_squeezy_subscription_id,
    'monthly_transaction_limit', v_tx_limit,
    'monthly_transactions_used', COALESCE(v_usage.included_transactions_used, 0),
    'monthly_transactions_remaining', GREATEST(v_tx_limit - COALESCE(v_usage.included_transactions_used, 0), 0),
    'extra_transactions_used', COALESCE(v_usage.extra_transactions_used, 0),
    'extra_tx_balance', v_extra_balance,
    'active_offer_limit', v_offer_limit,
    'active_offers_used', v_active_offers,
    'month_start', v_month_start
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_end_user_membership_summary(p_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := COALESCE(p_user_id, auth.uid());
  v_profile public.end_user_profiles%ROWTYPE;
  v_month_start date := public.current_athens_month_start();
  v_usage public.end_user_monthly_usage%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF v_user_id <> auth.uid() AND NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.end_user_profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member profile not found';
  END IF;

  PERFORM public.ensure_end_user_monthly_usage_row(v_user_id, v_month_start);

  SELECT *
  INTO v_usage
  FROM public.end_user_monthly_usage
  WHERE user_id = v_user_id
    AND month_start = v_month_start;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'subscription_tier', v_profile.subscription_tier,
    'subscription_status', v_profile.subscription_status,
    'monthly_unlock_limit', public.get_end_user_monthly_unlock_limit(v_profile.subscription_tier),
    'monthly_unlocks_used', COALESCE(v_usage.offers_unlocked_used, 0),
    'monthly_unlocks_remaining', GREATEST(public.get_end_user_monthly_unlock_limit(v_profile.subscription_tier) - COALESCE(v_usage.offers_unlocked_used, 0), 0),
    'monthly_redemption_limit', public.get_end_user_monthly_redemption_limit(v_profile.subscription_tier),
    'monthly_redemptions_used', COALESCE(v_usage.offer_redemptions_used, 0),
    'monthly_redemptions_remaining', GREATEST(public.get_end_user_monthly_redemption_limit(v_profile.subscription_tier) - COALESCE(v_usage.offer_redemptions_used, 0), 0),
    'card_fee_paid_at', v_profile.card_fee_paid_at,
    'card_included_by_plan', v_profile.card_included_by_plan,
    'month_start', v_month_start
  );
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
  v_existing_unlock public.end_user_offer_unlocks%ROWTYPE;
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

  SELECT *
  INTO v_existing_unlock
  FROM public.end_user_offer_unlocks
  WHERE user_id = v_user_id
    AND offer_id = p_offer_id
    AND month_start = v_month_start;

  IF FOUND THEN
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
    'subscription_plan', eup.subscription_plan,
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

CREATE OR REPLACE FUNCTION public.record_transaction(
  p_business_id uuid,
  p_user_public_id text,
  p_amount_spent numeric,
  p_identification_method public.identification_method,
  p_offer_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_staff_id uuid := auth.uid();
  v_rewards integer;
  v_transaction_id uuid;
  v_card_id uuid;
  v_offer public.offers%ROWTYPE;
  v_end_user_profile public.end_user_profiles%ROWTYPE;
  v_business public.businesses%ROWTYPE;
  v_points_per_euro integer := 1;
  v_month_start date := public.current_athens_month_start();
  v_business_usage public.business_monthly_usage%ROWTYPE;
  v_end_user_usage public.end_user_monthly_usage%ROWTYPE;
  v_tx_limit integer;
  v_redemption_limit integer;
  v_unlock_limit integer;
  v_extra_balance integer;
  v_offer_unlocked boolean := false;
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount_spent < 0 THEN
    RAISE EXCEPTION 'Amount spent must be non-negative';
  END IF;

  SELECT *
  INTO v_business
  FROM public.businesses
  WHERE id = p_business_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Business not found';
  END IF;

  IF NOT public.current_user_has_role('admin') AND NOT EXISTS (
    SELECT 1
    FROM public.business_staff bs
    WHERE bs.business_id = p_business_id
      AND bs.user_id = v_staff_id
      AND bs.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not staff of this business';
  END IF;

  IF v_business.is_active <> true OR v_business.subscription_status <> 'active' THEN
    RAISE EXCEPTION 'Business subscription is not active';
  END IF;

  SELECT id
  INTO v_user_id
  FROM public.profiles
  WHERE public_user_id = p_user_public_id
    AND role = 'end_user'
    AND is_active = true;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT *
  INTO v_end_user_profile
  FROM public.end_user_profiles
  WHERE id = v_user_id;

  IF p_offer_id IS NOT NULL THEN
    SELECT *
    INTO v_offer
    FROM public.offers
    WHERE id = p_offer_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Offer not found';
    END IF;

    IF v_offer.business_id <> p_business_id THEN
      RAISE EXCEPTION 'Offer does not belong to this business';
    END IF;

    IF v_offer.status <> 'active'
       OR v_offer.starts_at > now()
       OR (v_offer.expires_at IS NOT NULL AND v_offer.expires_at <= now()) THEN
      RAISE EXCEPTION 'Offer is not redeemable';
    END IF;

    IF v_offer.max_redemptions IS NOT NULL
       AND v_offer.current_redemptions >= v_offer.max_redemptions THEN
      RAISE EXCEPTION 'Offer redemption limit reached';
    END IF;

    IF v_offer.requires_paid_membership
       AND NOT public.is_paid_end_user_tier(v_end_user_profile.subscription_tier) THEN
      RAISE EXCEPTION 'Offer requires paid membership';
    END IF;

    IF v_offer.min_purchase_amount IS NOT NULL
       AND p_amount_spent < v_offer.min_purchase_amount THEN
      RAISE EXCEPTION 'Purchase amount does not meet minimum offer requirement';
    END IF;
  END IF;

  PERFORM public.ensure_business_monthly_usage_row(p_business_id, v_month_start);

  SELECT *
  INTO v_business_usage
  FROM public.business_monthly_usage
  WHERE business_id = p_business_id
    AND month_start = v_month_start
  FOR UPDATE;

  v_tx_limit := public.get_business_monthly_tx_limit(v_business.subscription_tier);

  IF COALESCE(v_business_usage.included_transactions_used, 0) < v_tx_limit THEN
    UPDATE public.business_monthly_usage
    SET included_transactions_used = included_transactions_used + 1,
        updated_at = now()
    WHERE business_id = p_business_id
      AND month_start = v_month_start;
  ELSE
    v_extra_balance := public.get_business_tx_credit_balance(p_business_id);

    IF v_extra_balance <= 0 THEN
      RAISE EXCEPTION 'Business monthly transaction limit reached';
    END IF;

    INSERT INTO public.business_tx_credit_ledger (
      business_id,
      credits_delta,
      source_type,
      source_ref,
      metadata
    )
    VALUES (
      p_business_id,
      -1,
      'consumption',
      format('transaction:%s:%s', v_month_start, gen_random_uuid()),
      jsonb_build_object('month_start', v_month_start)
    );

    UPDATE public.business_monthly_usage
    SET extra_transactions_used = extra_transactions_used + 1,
        updated_at = now()
    WHERE business_id = p_business_id
      AND month_start = v_month_start;
  END IF;

  IF p_offer_id IS NOT NULL THEN
    PERFORM public.ensure_end_user_monthly_usage_row(v_user_id, v_month_start);

    SELECT *
    INTO v_end_user_usage
    FROM public.end_user_monthly_usage
    WHERE user_id = v_user_id
      AND month_start = v_month_start
    FOR UPDATE;

    v_redemption_limit := public.get_end_user_monthly_redemption_limit(v_end_user_profile.subscription_tier);
    v_unlock_limit := public.get_end_user_monthly_unlock_limit(v_end_user_profile.subscription_tier);

    SELECT EXISTS (
      SELECT 1
      FROM public.end_user_offer_unlocks
      WHERE user_id = v_user_id
        AND offer_id = p_offer_id
        AND month_start = v_month_start
    )
    INTO v_offer_unlocked;

    IF NOT v_offer_unlocked THEN
      IF COALESCE(v_end_user_usage.offers_unlocked_used, 0) >= v_unlock_limit THEN
        RAISE EXCEPTION 'Member monthly offer unlock limit reached';
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
        p_business_id,
        v_month_start
      );

      UPDATE public.end_user_monthly_usage
      SET offers_unlocked_used = offers_unlocked_used + 1,
          updated_at = now()
      WHERE user_id = v_user_id
        AND month_start = v_month_start;

      v_end_user_usage.offers_unlocked_used := COALESCE(v_end_user_usage.offers_unlocked_used, 0) + 1;
    END IF;

    IF COALESCE(v_end_user_usage.offer_redemptions_used, 0) >= v_redemption_limit THEN
      RAISE EXCEPTION 'Member monthly redemption limit reached';
    END IF;

    UPDATE public.end_user_monthly_usage
    SET offer_redemptions_used = offer_redemptions_used + 1,
        updated_at = now()
    WHERE user_id = v_user_id
      AND month_start = v_month_start;
  END IF;

  SELECT COALESCE((value #>> '{}')::integer, 1)
  INTO v_points_per_euro
  FROM public.platform_settings
  WHERE key = 'rewards_points_per_euro';

  v_rewards := floor(p_amount_spent)::integer * COALESCE(v_points_per_euro, 1);

  SELECT id
  INTO v_card_id
  FROM public.membership_cards
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO public.transactions (
    business_id,
    user_id,
    staff_id,
    offer_id,
    amount_spent,
    rewards_earned,
    identification_method,
    card_id,
    notes
  )
  VALUES (
    p_business_id,
    v_user_id,
    v_staff_id,
    p_offer_id,
    p_amount_spent,
    v_rewards,
    p_identification_method,
    v_card_id,
    p_notes
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.rewards (
    user_id,
    business_id,
    transaction_id,
    points,
    entry_type,
    description
  )
  VALUES (
    v_user_id,
    p_business_id,
    v_transaction_id,
    v_rewards,
    'earned',
    'Earned from purchase at business'
  );

  UPDATE public.end_user_profiles
  SET total_rewards_points = total_rewards_points + v_rewards,
      updated_at = now()
  WHERE id = v_user_id;

  IF p_offer_id IS NOT NULL THEN
    UPDATE public.offers
    SET current_redemptions = current_redemptions + 1,
        updated_at = now()
    WHERE id = p_offer_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  VALUES (
    v_user_id,
    'Rewards Earned!',
    format('You earned %s points from your purchase.', v_rewards),
    'reward',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'business_id', p_business_id,
      'points', v_rewards
    )
  );

  PERFORM public.check_and_award_badges(v_user_id);

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'rewards_earned', v_rewards,
    'user_name', (
      SELECT trim(concat_ws(' ', first_name, last_name))
      FROM public.profiles
      WHERE id = v_user_id
    ),
    'business_monthly_transactions_remaining',
      GREATEST(
        v_tx_limit - (
          SELECT included_transactions_used
          FROM public.business_monthly_usage
          WHERE business_id = p_business_id
            AND month_start = v_month_start
        ),
        0
      ),
    'business_extra_tx_balance', public.get_business_tx_credit_balance(p_business_id),
    'member_monthly_redemptions_remaining',
      CASE
        WHEN p_offer_id IS NULL THEN NULL
        ELSE GREATEST(
          public.get_end_user_monthly_redemption_limit(v_end_user_profile.subscription_tier) - (
            SELECT offer_redemptions_used
            FROM public.end_user_monthly_usage
            WHERE user_id = v_user_id
              AND month_start = v_month_start
          ),
          0
        )
      END
  );
END;
$$;

DROP FUNCTION IF EXISTS public.get_marketplace_offers(uuid, text, text, integer, integer);

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
  v_tier public.subscription_tier := 'end_user_free';
  v_month_start date := public.current_athens_month_start();
  v_unlocks_used integer := 0;
  v_redemptions_used integer := 0;
BEGIN
  IF p_user_id IS NOT NULL THEN
    IF p_user_id <> auth.uid() AND NOT public.current_user_has_role('admin') THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT subscription_tier
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

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'total_end_users', (SELECT COUNT(*) FROM public.profiles WHERE role = 'end_user'),
    'total_paid_users', (
      SELECT COUNT(*)
      FROM public.end_user_profiles
      WHERE subscription_tier IN ('end_user_plus', 'end_user_pro')
        AND subscription_status = 'active'
    ),
    'total_free_users', (
      SELECT COUNT(*)
      FROM public.end_user_profiles
      WHERE subscription_tier = 'end_user_free'
    ),
    'total_businesses', (SELECT COUNT(*) FROM public.businesses),
    'active_businesses', (
      SELECT COUNT(*)
      FROM public.businesses
      WHERE subscription_status = 'active'
        AND is_active = true
    ),
    'active_offers', (
      SELECT COUNT(*)
      FROM public.offers
      WHERE status = 'active'
    ),
    'transactions_this_month', (
      SELECT COUNT(*)
      FROM public.transactions
      WHERE created_at >= date_trunc('month', now())
    ),
    'revenue_this_month', (
      SELECT COALESCE(SUM(amount_spent), 0)
      FROM public.transactions
      WHERE created_at >= date_trunc('month', now())
    )
  );
END;
$$;

ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_user_monthly_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_user_offer_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_tx_credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_products_select_all ON public.billing_products;
CREATE POLICY billing_products_select_all
  ON public.billing_products
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS billing_products_all_admin ON public.billing_products;
CREATE POLICY billing_products_all_admin
  ON public.billing_products
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS business_monthly_usage_select_own ON public.business_monthly_usage;
CREATE POLICY business_monthly_usage_select_own
  ON public.business_monthly_usage
  FOR SELECT
  USING (public.is_business_staff_member(business_id));

DROP POLICY IF EXISTS business_monthly_usage_all_admin ON public.business_monthly_usage;
CREATE POLICY business_monthly_usage_all_admin
  ON public.business_monthly_usage
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS end_user_monthly_usage_select_own ON public.end_user_monthly_usage;
CREATE POLICY end_user_monthly_usage_select_own
  ON public.end_user_monthly_usage
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS end_user_monthly_usage_all_admin ON public.end_user_monthly_usage;
CREATE POLICY end_user_monthly_usage_all_admin
  ON public.end_user_monthly_usage
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS end_user_offer_unlocks_select_own ON public.end_user_offer_unlocks;
CREATE POLICY end_user_offer_unlocks_select_own
  ON public.end_user_offer_unlocks
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS end_user_offer_unlocks_all_admin ON public.end_user_offer_unlocks;
CREATE POLICY end_user_offer_unlocks_all_admin
  ON public.end_user_offer_unlocks
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

DROP POLICY IF EXISTS business_tx_credit_ledger_select_own ON public.business_tx_credit_ledger;
CREATE POLICY business_tx_credit_ledger_select_own
  ON public.business_tx_credit_ledger
  FOR SELECT
  USING (public.is_business_staff_member(business_id));

DROP POLICY IF EXISTS business_tx_credit_ledger_all_admin ON public.business_tx_credit_ledger;
CREATE POLICY business_tx_credit_ledger_all_admin
  ON public.business_tx_credit_ledger
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

GRANT SELECT ON public.billing_products TO anon, authenticated;
GRANT SELECT ON public.business_monthly_usage TO authenticated;
GRANT SELECT ON public.end_user_monthly_usage TO authenticated;
GRANT SELECT ON public.end_user_offer_unlocks TO authenticated;
GRANT SELECT ON public.business_tx_credit_ledger TO authenticated;

GRANT EXECUTE ON FUNCTION public.get_business_tx_credit_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_subscription_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_end_user_membership_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlock_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction(uuid, text, numeric, public.identification_method, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_offers(uuid, text, text, integer, integer) TO authenticated;

INSERT INTO public.subscription_plans (
  name,
  plan_type,
  audience,
  plan_code,
  lemon_squeezy_product_id,
  lemon_squeezy_variant_id,
  checkout_url,
  price_monthly_cents,
  monthly_price_cents,
  setup_fee_cents,
  limits,
  features,
  is_active
)
VALUES
  (
    'Business Plus',
    'business',
    'business',
    'business_plus',
    '940782',
    '1478540',
    'https://billing.nostalgie.world/checkout/buy/56614de4-bbb1-4e1b-9129-f9c5a979c23f',
    350,
    350,
    2900,
    '{"active_offers":3,"monthly_transactions":75}'::jsonb,
    '{"profile_presence":"standard","priority_support":false}'::jsonb,
    true
  ),
  (
    'Business Pro',
    'business',
    'business',
    'business_pro',
    '940782',
    '1478575',
    'https://billing.nostalgie.world/checkout/buy/48515494-0eb1-42af-a0dd-e6a26d3bb0f1',
    899,
    899,
    2900,
    '{"active_offers":10,"monthly_transactions":300}'::jsonb,
    '{"profile_presence":"priority","priority_support":true}'::jsonb,
    true
  ),
  (
    'End User Free',
    'end_user',
    'end_user',
    'end_user_free',
    '940939',
    'VARIANT_END_USER_FREE',
    NULL,
    0,
    0,
    0,
    '{"monthly_unlocks":3,"monthly_redemptions":3}'::jsonb,
    '{"rewards_history":false,"favorites":false,"physical_card":"barcode_only"}'::jsonb,
    true
  ),
  (
    'End User Plus',
    'end_user',
    'end_user',
    'end_user_plus',
    '940939',
    '1478832',
    'https://billing.nostalgie.world/checkout/buy/2d3a759c-7dbf-4f13-857e-b2dfa4ee9d65',
    299,
    299,
    0,
    '{"monthly_unlocks":12,"monthly_redemptions":8}'::jsonb,
    '{"rewards_history":true,"favorites":true,"physical_card":"optional"}'::jsonb,
    true
  ),
  (
    'End User Pro',
    'end_user',
    'end_user',
    'end_user_pro',
    '940939',
    '1478833',
    'https://billing.nostalgie.world/checkout/buy/5b11bbb6-e7e9-47ec-8fe9-b863f36b0c18',
    699,
    699,
    0,
    '{"monthly_unlocks":50,"monthly_redemptions":30}'::jsonb,
    '{"rewards_history":true,"favorites":true,"physical_card":"included","priority_support":true}'::jsonb,
    true
  )
ON CONFLICT (plan_code) DO UPDATE
SET
  name = EXCLUDED.name,
  plan_type = EXCLUDED.plan_type,
  audience = EXCLUDED.audience,
  lemon_squeezy_product_id = EXCLUDED.lemon_squeezy_product_id,
  lemon_squeezy_variant_id = EXCLUDED.lemon_squeezy_variant_id,
  checkout_url = EXCLUDED.checkout_url,
  price_monthly_cents = EXCLUDED.price_monthly_cents,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  setup_fee_cents = EXCLUDED.setup_fee_cents,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
  is_active = EXCLUDED.is_active,
  updated_at = now();

INSERT INTO public.billing_products (
  product_code,
  name,
  audience,
  kind,
  linked_plan_code,
  price_cents,
  credit_amount,
  lemon_squeezy_product_id,
  lemon_squeezy_variant_id,
  metadata,
  is_active
)
VALUES
  (
    'physical_card_fee',
    'Physical Card Fee',
    'end_user',
    'card_fee',
    'end_user_plus',
    490,
    0,
    'PRODUCT_ID_CARD_FEE',
    'VARIANT_PHYSICAL_CARD_FEE',
    '{}'::jsonb,
    true
  ),
  (
    'business_tx_pack_100',
    'Business TX Pack 100',
    'business',
    'tx_pack',
    NULL,
    200,
    100,
    'PRODUCT_ID_TX_PACK',
    'VARIANT_BUSINESS_TX_PACK_100',
    '{}'::jsonb,
    true
  )
ON CONFLICT (product_code) DO UPDATE
SET
  name = EXCLUDED.name,
  audience = EXCLUDED.audience,
  kind = EXCLUDED.kind,
  linked_plan_code = EXCLUDED.linked_plan_code,
  price_cents = EXCLUDED.price_cents,
  credit_amount = EXCLUDED.credit_amount,
  lemon_squeezy_product_id = EXCLUDED.lemon_squeezy_product_id,
  lemon_squeezy_variant_id = EXCLUDED.lemon_squeezy_variant_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

COMMIT;
