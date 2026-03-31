CREATE OR REPLACE FUNCTION public.lookup_member(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
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
    'subscription_plan', eup.subscription_plan,
    'is_active', p.is_active
  )
  INTO result
  FROM public.profiles p
  JOIN public.end_user_profiles eup ON eup.id = p.id
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
  v_subscription_plan public.user_subscription_plan;
  v_points_per_euro integer := 1;
BEGIN
  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount_spent < 0 THEN
    RAISE EXCEPTION 'Amount spent must be non-negative';
  END IF;

  IF NOT public.current_user_has_role('admin') AND NOT EXISTS (
    SELECT 1
    FROM public.business_staff bs
    JOIN public.businesses b ON b.id = bs.business_id
    WHERE bs.business_id = p_business_id
      AND bs.user_id = v_staff_id
      AND bs.is_active = true
      AND b.is_active = true
      AND b.subscription_status = 'active'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not staff of this business';
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

  SELECT subscription_plan
  INTO v_subscription_plan
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
       AND v_subscription_plan <> 'paid' THEN
      RAISE EXCEPTION 'Offer requires paid membership';
    END IF;

    IF v_offer.min_purchase_amount IS NOT NULL
       AND p_amount_spent < v_offer.min_purchase_amount THEN
      RAISE EXCEPTION 'Purchase amount does not meet minimum offer requirement';
    END IF;
  END IF;

  SELECT COALESCE((value #>> '{}')::integer, 1)
  INTO v_points_per_euro
  FROM public.platform_settings
  WHERE key = 'rewards_points_per_euro';

  v_rewards := floor(p_amount_spent * COALESCE(v_points_per_euro, 1));

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
    card_id,
    amount_spent,
    rewards_earned,
    offer_id,
    identification_method,
    notes,
    recorded_by
  )
  VALUES (
    p_business_id,
    v_user_id,
    v_card_id,
    p_amount_spent,
    v_rewards,
    p_offer_id,
    p_identification_method,
    p_notes,
    v_staff_id
  )
  RETURNING id INTO v_transaction_id;

  INSERT INTO public.rewards (user_id, transaction_id, entry_type, points, description)
  VALUES (
    v_user_id,
    v_transaction_id,
    'earned',
    v_rewards,
    format('Rewards earned from purchase at business %s', p_business_id)
  );

  UPDATE public.end_user_profiles
  SET total_rewards_points = total_rewards_points + v_rewards
  WHERE id = v_user_id;

  IF p_offer_id IS NOT NULL THEN
    UPDATE public.offers
    SET current_redemptions = current_redemptions + 1
    WHERE id = p_offer_id;
  END IF;

  PERFORM public.check_and_award_badges(v_user_id);

  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  VALUES (
    v_user_id,
    'Rewards Earned',
    format('You earned %s reward points from your latest purchase!', v_rewards),
    'reward',
    jsonb_build_object(
      'transaction_id', v_transaction_id,
      'business_id', p_business_id,
      'points', v_rewards
    )
  );

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'rewards_earned', v_rewards,
    'user_name', (
      SELECT COALESCE(NULLIF(trim(concat(first_name, ' ', last_name)), ''), email, public_user_id)
      FROM public.profiles
      WHERE id = v_user_id
    )
  );
END;
$$;
