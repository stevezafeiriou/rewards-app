BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TYPE public.user_role AS ENUM ('end_user', 'business', 'admin');
CREATE TYPE public.user_subscription_plan AS ENUM ('free', 'paid');
CREATE TYPE public.subscription_status AS ENUM ('none', 'active', 'past_due', 'paused', 'cancelled', 'expired');
CREATE TYPE public.card_status AS ENUM ('pending_production', 'printed', 'shipped', 'active', 'replaced', 'disabled');
CREATE TYPE public.offer_status AS ENUM ('draft', 'active', 'paused', 'expired', 'archived');
CREATE TYPE public.offer_type AS ENUM ('percentage_discount', 'fixed_discount', 'free_item', 'buy_one_get_one', 'custom');
CREATE TYPE public.identification_method AS ENUM ('qr_scan', 'barcode_scan', 'manual_entry', 'nfc');
CREATE TYPE public.reward_entry_type AS ENUM ('earned', 'redeemed', 'expired', 'adjustment');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  email text NOT NULL,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  public_user_id text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_profiles_public_user_id
  ON public.profiles(public_user_id)
  WHERE public_user_id IS NOT NULL;
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

CREATE TABLE public.business_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  icon text,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.end_user_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth date,
  subscription_plan public.user_subscription_plan NOT NULL DEFAULT 'free',
  subscription_status public.subscription_status NOT NULL DEFAULT 'none',
  lemon_squeezy_customer_id text,
  lemon_squeezy_subscription_id text,
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  total_rewards_points integer NOT NULL DEFAULT 0 CHECK (total_rewards_points >= 0),
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_region text,
  shipping_country text DEFAULT 'GR',
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES public.business_categories(id),
  subcategory text,
  profile_image_url text,
  cover_image_url text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  region text,
  country text DEFAULT 'GR',
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  phone text,
  email text,
  website text,
  social_facebook text,
  social_instagram text,
  operating_hours jsonb,
  is_verified boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT false,
  subscription_status public.subscription_status NOT NULL DEFAULT 'none',
  lemon_squeezy_customer_id text,
  lemon_squeezy_subscription_id text,
  subscription_started_at timestamptz,
  subscription_ends_at timestamptz,
  one_time_fee_paid boolean NOT NULL DEFAULT false,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_category ON public.businesses(category_id);
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_businesses_active ON public.businesses(is_active, subscription_status);

CREATE TABLE public.business_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role text NOT NULL DEFAULT 'owner',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_staff_role_check CHECK (staff_role IN ('owner', 'manager', 'staff'))
);

CREATE UNIQUE INDEX business_staff_business_user_unique
  ON public.business_staff(business_id, user_id);
CREATE UNIQUE INDEX business_staff_active_business_user_unique
  ON public.business_staff(business_id, user_id)
  WHERE is_active = true;
CREATE INDEX idx_business_staff_user ON public.business_staff(user_id);
CREATE INDEX idx_business_staff_business ON public.business_staff(business_id);

CREATE TABLE public.membership_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_number text NOT NULL UNIQUE,
  status public.card_status NOT NULL DEFAULT 'pending_production',
  shipping_address_line1 text,
  shipping_address_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_region text,
  shipping_country text DEFAULT 'GR',
  shipped_at timestamptz,
  delivered_at timestamptz,
  activated_at timestamptz,
  disabled_at timestamptz,
  replacement_for uuid REFERENCES public.membership_cards(id),
  tracking_number text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_user ON public.membership_cards(user_id);
CREATE INDEX idx_cards_status ON public.membership_cards(status);
CREATE INDEX idx_cards_number ON public.membership_cards(card_number);
CREATE UNIQUE INDEX membership_cards_active_lifecycle_unique
  ON public.membership_cards(user_id)
  WHERE status IN ('pending_production', 'printed', 'shipped', 'active');

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  terms_conditions text,
  offer_type public.offer_type NOT NULL DEFAULT 'custom',
  discount_value numeric(10, 2) CHECK (discount_value IS NULL OR discount_value >= 0),
  image_url text,
  status public.offer_status NOT NULL DEFAULT 'draft',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_featured boolean NOT NULL DEFAULT false,
  max_redemptions integer CHECK (max_redemptions IS NULL OR max_redemptions >= 0),
  current_redemptions integer NOT NULL DEFAULT 0 CHECK (current_redemptions >= 0),
  min_purchase_amount numeric(10, 2) CHECK (min_purchase_amount IS NULL OR min_purchase_amount >= 0),
  requires_paid_membership boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT offers_redemption_bounds CHECK (
    current_redemptions <= COALESCE(max_redemptions, current_redemptions)
  ),
  CONSTRAINT offers_expiration_after_start CHECK (
    expires_at IS NULL OR expires_at > starts_at
  )
);

CREATE INDEX idx_offers_business ON public.offers(business_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_active
  ON public.offers(status, starts_at, expires_at)
  WHERE status = 'active';

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.profiles(id),
  offer_id uuid REFERENCES public.offers(id),
  amount_spent numeric(10, 2) NOT NULL CHECK (amount_spent >= 0),
  rewards_earned integer NOT NULL DEFAULT 0 CHECK (rewards_earned >= 0),
  identification_method public.identification_method NOT NULL,
  card_id uuid REFERENCES public.membership_cards(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_business ON public.transactions(business_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_business_user ON public.transactions(business_id, user_id);

CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  points integer NOT NULL,
  entry_type public.reward_entry_type NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_user ON public.rewards(user_id);
CREATE INDEX idx_rewards_business ON public.rewards(business_id);
CREATE INDEX idx_rewards_user_type ON public.rewards(user_id, entry_type);

CREATE TABLE public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon_url text,
  badge_type text NOT NULL DEFAULT 'milestone',
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT badges_type_check CHECK (badge_type IN ('milestone', 'activity', 'special')),
  CONSTRAINT badges_criteria_non_negative CHECK (criteria_value >= 0)
);

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

CREATE TABLE public.user_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fav_exactly_one_target CHECK (
    (business_id IS NOT NULL) <> (offer_id IS NOT NULL)
  ),
  UNIQUE(user_id, business_id, offer_id)
);

CREATE INDEX idx_favorites_user ON public.user_favorites(user_id);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'system',
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('reward', 'badge', 'offer', 'system', 'card_update'))
);

CREATE INDEX idx_notifications_user
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text NOT NULL,
  status public.ticket_status NOT NULL DEFAULT 'open',
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id),
  type text NOT NULL DEFAULT 'general',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_tickets_type_check CHECK (type IN ('general', 'billing', 'card', 'technical', 'business'))
);

CREATE INDEX idx_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_tickets_assigned ON public.support_tickets(assigned_to);

CREATE TABLE public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket
  ON public.support_ticket_messages(ticket_id, created_at);

CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_type text NOT NULL,
  lemon_squeezy_product_id text NOT NULL,
  lemon_squeezy_variant_id text NOT NULL,
  price_monthly_cents integer NOT NULL CHECK (price_monthly_cents >= 0),
  setup_fee_cents integer NOT NULL DEFAULT 0 CHECK (setup_fee_cents >= 0),
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscription_plans_type_check CHECK (plan_type IN ('end_user', 'business'))
);

CREATE UNIQUE INDEX subscription_plans_variant_unique
  ON public.subscription_plans(plan_type, lemon_squeezy_variant_id);

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_date ON public.admin_audit_log(created_at DESC);

CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lemon_squeezy_webhook_events (
  event_id text PRIMARY KEY,
  event_name text NOT NULL,
  resource_id text,
  payload jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role public.user_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = p_role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_staff_member(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.business_staff
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_business_owner(p_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND owner_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.owns_support_ticket(p_ticket_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.support_tickets
    WHERE id = p_ticket_id
      AND created_by = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_unique_public_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id text;
BEGIN
  LOOP
    new_id := lpad((floor(random() * 900000000) + 100000000)::bigint::text, 9, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE public_user_id = new_id
    );
  END LOOP;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_business_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' FROM base_slug);

  IF base_slug = '' THEN
    base_slug := 'business';
  END IF;

  final_slug := base_slug;

  WHILE EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE slug = final_slug
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role public.user_role;
  new_public_id text;
BEGIN
  user_role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::public.user_role,
    'end_user'
  );

  IF user_role = 'admin' THEN
    RAISE EXCEPTION 'Direct admin signup is not allowed';
  END IF;

  IF user_role = 'end_user' THEN
    new_public_id := public.generate_unique_public_id();
  END IF;

  INSERT INTO public.profiles (
    id,
    role,
    email,
    first_name,
    last_name,
    public_user_id
  )
  VALUES (
    NEW.id,
    user_role,
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'first_name', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'last_name', ''),
    new_public_id
  )
  ON CONFLICT (id) DO NOTHING;

  IF user_role = 'end_user' THEN
    INSERT INTO public.end_user_profiles (id)
    VALUES (NEW.id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_profile_for_role(p_role public.user_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user auth.users%ROWTYPE;
  v_existing_role public.user_role;
  v_first_name text;
  v_last_name text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_role NOT IN ('end_user', 'business') THEN
    RAISE EXCEPTION 'Only end_user or business profiles can be created via this RPC';
  END IF;

  SELECT *
  INTO v_user
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Authenticated user not found';
  END IF;

  SELECT role
  INTO v_existing_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF FOUND THEN
    IF v_existing_role <> p_role THEN
      RAISE EXCEPTION 'Profile already exists with role %', v_existing_role;
    END IF;

    IF p_role = 'end_user' THEN
      INSERT INTO public.end_user_profiles (id)
      VALUES (auth.uid())
      ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN;
  END IF;

  v_first_name := NULLIF(v_user.raw_user_meta_data ->> 'first_name', '');
  v_last_name := NULLIF(v_user.raw_user_meta_data ->> 'last_name', '');

  IF v_first_name IS NULL THEN
    v_first_name := NULLIF(v_user.raw_user_meta_data ->> 'full_name', '');
  END IF;

  INSERT INTO public.profiles (
    id,
    role,
    email,
    first_name,
    last_name,
    public_user_id
  )
  VALUES (
    auth.uid(),
    p_role,
    v_user.email,
    v_first_name,
    v_last_name,
    CASE WHEN p_role = 'end_user' THEN public.generate_unique_public_id() ELSE NULL END
  );

  IF p_role = 'end_user' THEN
    INSERT INTO public.end_user_profiles (id)
    VALUES (auth.uid())
    ON CONFLICT (id) DO NOTHING;
  END IF;
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
  v_subscription_plan public.user_subscription_plan;
  badge_rec record;
BEGIN
  SELECT
    COUNT(*),
    COALESCE(SUM(amount_spent), 0),
    COUNT(DISTINCT business_id)
  INTO v_transaction_count, v_total_spent, v_businesses_visited
  FROM public.transactions
  WHERE user_id = p_user_id;

  SELECT total_rewards_points, subscription_plan
  INTO v_total_rewards, v_subscription_plan
  FROM public.end_user_profiles
  WHERE id = p_user_id;

  SELECT EXTRACT(day FROM now() - created_at)::integer
  INTO v_account_age
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_subscription_plan IS DISTINCT FROM 'paid' THEN
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

CREATE OR REPLACE FUNCTION public.create_membership_card(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_public_id text;
  v_card_id uuid;
  v_existing_card uuid;
  v_eup public.end_user_profiles%ROWTYPE;
BEGIN
  IF auth.role() <> 'service_role'
     AND NOT public.current_user_has_role('admin')
     AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT id
  INTO v_existing_card
  FROM public.membership_cards
  WHERE user_id = p_user_id
    AND status IN ('pending_production', 'printed', 'shipped', 'active')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_existing_card IS NOT NULL THEN
    RETURN v_existing_card;
  END IF;

  SELECT public_user_id
  INTO v_public_id
  FROM public.profiles
  WHERE id = p_user_id
    AND role = 'end_user';

  IF v_public_id IS NULL THEN
    RAISE EXCEPTION 'User has no public ID';
  END IF;

  SELECT *
  INTO v_eup
  FROM public.end_user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'End user profile not found';
  END IF;

  INSERT INTO public.membership_cards (
    user_id,
    card_number,
    status,
    shipping_address_line1,
    shipping_address_line2,
    shipping_city,
    shipping_postal_code,
    shipping_region,
    shipping_country
  )
  VALUES (
    p_user_id,
    v_public_id,
    'pending_production',
    v_eup.shipping_address_line1,
    v_eup.shipping_address_line2,
    v_eup.shipping_city,
    v_eup.shipping_postal_code,
    v_eup.shipping_region,
    v_eup.shipping_country
  )
  RETURNING id INTO v_card_id;

  INSERT INTO public.notifications (user_id, title, body, type, metadata)
  VALUES (
    p_user_id,
    'Card Being Prepared',
    'Your membership card is being prepared for production!',
    'card_update',
    jsonb_build_object('card_id', v_card_id, 'status', 'pending_production')
  );

  RETURN v_card_id;
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
    )
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
  is_favorited boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.user_subscription_plan := 'free';
  v_effective_limit integer;
BEGIN
  IF p_user_id IS NOT NULL THEN
    IF p_user_id <> auth.uid() AND NOT public.current_user_has_role('admin') THEN
      RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT subscription_plan
    INTO v_plan
    FROM public.end_user_profiles
    WHERE id = p_user_id;
  END IF;

  IF COALESCE(v_plan, 'free') = 'free' THEN
    v_effective_limit := 3;
    p_search := NULL;
    p_category_slug := NULL;
    p_offset := 0;
  ELSE
    v_effective_limit := GREATEST(COALESCE(p_limit, 20), 1);
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
    COALESCE(uf.id IS NOT NULL, false) AS is_favorited
  FROM public.offers o
  JOIN public.businesses b ON b.id = o.business_id
  LEFT JOIN public.business_categories bc ON bc.id = b.category_id
  LEFT JOIN public.user_favorites uf
    ON uf.offer_id = o.id
   AND p_user_id IS NOT NULL
   AND uf.user_id = p_user_id
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
  LIMIT v_effective_limit
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_business_dashboard_stats(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_business_staff_member(p_business_id) AND NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT jsonb_build_object(
    'total_transactions', COUNT(*),
    'total_revenue', COALESCE(SUM(amount_spent), 0),
    'total_rewards_given', COALESCE(SUM(rewards_earned), 0),
    'unique_customers', COUNT(DISTINCT user_id),
    'transactions_today', COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE),
    'revenue_today', COALESCE(SUM(amount_spent) FILTER (WHERE created_at >= CURRENT_DATE), 0),
    'transactions_this_month', COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)),
    'revenue_this_month', COALESCE(SUM(amount_spent) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)), 0)
  )
  INTO result
  FROM public.transactions
  WHERE business_id = p_business_id;

  result := result || jsonb_build_object(
    'active_offers',
    (
      SELECT COUNT(*)
      FROM public.offers
      WHERE business_id = p_business_id
        AND status = 'active'
    )
  );

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_rewards_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id <> auth.uid() AND NOT public.current_user_has_role('admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_points', eup.total_rewards_points,
      'total_transactions', (
        SELECT COUNT(*)
        FROM public.transactions
        WHERE user_id = p_user_id
      ),
      'total_spent', (
        SELECT COALESCE(SUM(amount_spent), 0)
        FROM public.transactions
        WHERE user_id = p_user_id
      ),
      'businesses_visited', (
        SELECT COUNT(DISTINCT business_id)
        FROM public.transactions
        WHERE user_id = p_user_id
      ),
      'badges_earned', (
        SELECT COUNT(*)
        FROM public.user_badges
        WHERE user_id = p_user_id
      ),
      'recent_rewards', (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id', r.id,
              'points', r.points,
              'entry_type', r.entry_type,
              'description', r.description,
              'business_name', b.name,
              'created_at', r.created_at
            )
            ORDER BY r.created_at DESC
          ),
          '[]'::jsonb
        )
        FROM (
          SELECT *
          FROM public.rewards
          WHERE user_id = p_user_id
          ORDER BY created_at DESC
          LIMIT 10
        ) r
        LEFT JOIN public.businesses b ON b.id = r.business_id
      )
    )
    FROM public.end_user_profiles eup
    WHERE eup.id = p_user_id
  );
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
      WHERE subscription_plan = 'paid'
        AND subscription_status = 'active'
    ),
    'total_free_users', (
      SELECT COUNT(*)
      FROM public.end_user_profiles
      WHERE subscription_plan = 'free'
    ),
    'total_businesses', (SELECT COUNT(*) FROM public.businesses),
    'active_businesses', (
      SELECT COUNT(*)
      FROM public.businesses
      WHERE is_active = true
        AND subscription_status = 'active'
    ),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'total_revenue_processed', (
      SELECT COALESCE(SUM(amount_spent), 0)
      FROM public.transactions
    ),
    'cards_pending', (
      SELECT COUNT(*)
      FROM public.membership_cards
      WHERE status = 'pending_production'
    ),
    'cards_shipped', (
      SELECT COUNT(*)
      FROM public.membership_cards
      WHERE status = 'shipped'
    ),
    'cards_active', (
      SELECT COUNT(*)
      FROM public.membership_cards
      WHERE status = 'active'
    ),
    'open_tickets', (
      SELECT COUNT(*)
      FROM public.support_tickets
      WHERE status IN ('open', 'in_progress')
    ),
    'users_today', (
      SELECT COUNT(*)
      FROM public.profiles
      WHERE created_at >= CURRENT_DATE
    ),
    'transactions_today', (
      SELECT COUNT(*)
      FROM public.transactions
      WHERE created_at >= CURRENT_DATE
    )
  );
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER end_user_profiles_set_updated_at
  BEFORE UPDATE ON public.end_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER businesses_set_updated_at
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER membership_cards_set_updated_at
  BEFORE UPDATE ON public.membership_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER offers_set_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER support_tickets_set_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subscription_plans_set_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER platform_settings_set_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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
  b.latitude,
  b.longitude,
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.end_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lemon_squeezy_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY profiles_select_business_customers
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      JOIN public.business_staff bs ON bs.business_id = t.business_id
      WHERE t.user_id = profiles.id
        AND bs.user_id = auth.uid()
        AND bs.is_active = true
    )
  );

CREATE POLICY profiles_select_admin
  ON public.profiles
  FOR SELECT
  USING (public.current_user_has_role('admin'));

CREATE POLICY profiles_update_admin
  ON public.profiles
  FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY eup_select_own
  ON public.end_user_profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY eup_update_own
  ON public.end_user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY eup_select_admin
  ON public.end_user_profiles
  FOR SELECT
  USING (public.current_user_has_role('admin'));

CREATE POLICY eup_update_admin
  ON public.end_user_profiles
  FOR UPDATE
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY businesses_select_public
  ON public.businesses
  FOR SELECT
  USING (
    is_active = true
    AND is_verified = true
    AND subscription_status = 'active'
  );

CREATE POLICY businesses_select_own
  ON public.businesses
  FOR SELECT
  USING (public.is_business_staff_member(id));

CREATE POLICY businesses_update_own
  ON public.businesses
  FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY businesses_insert_own
  ON public.businesses
  FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND public.current_user_has_role('business')
  );

CREATE POLICY businesses_all_admin
  ON public.businesses
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY categories_select_all
  ON public.business_categories
  FOR SELECT
  USING (true);

CREATE POLICY categories_all_admin
  ON public.business_categories
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY staff_select_own
  ON public.business_staff
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY staff_manage_owner
  ON public.business_staff
  FOR ALL
  USING (public.is_business_owner(business_id))
  WITH CHECK (public.is_business_owner(business_id));

CREATE POLICY staff_insert_self_owner
  ON public.business_staff
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND staff_role = 'owner'
  );

CREATE POLICY staff_all_admin
  ON public.business_staff
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY cards_select_own
  ON public.membership_cards
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY cards_all_admin
  ON public.membership_cards
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY offers_select_public
  ON public.offers
  FOR SELECT
  USING (
    status = 'active'
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1
      FROM public.businesses b
      WHERE b.id = offers.business_id
        AND b.is_active = true
        AND b.subscription_status = 'active'
        AND b.is_verified = true
    )
  );

CREATE POLICY offers_select_own
  ON public.offers
  FOR SELECT
  USING (public.is_business_staff_member(business_id));

CREATE POLICY offers_insert_own
  ON public.offers
  FOR INSERT
  WITH CHECK (public.is_business_staff_member(business_id));

CREATE POLICY offers_update_own
  ON public.offers
  FOR UPDATE
  USING (public.is_business_staff_member(business_id))
  WITH CHECK (public.is_business_staff_member(business_id));

CREATE POLICY offers_delete_own
  ON public.offers
  FOR DELETE
  USING (
    status = 'draft'
    AND public.is_business_staff_member(business_id)
  );

CREATE POLICY offers_all_admin
  ON public.offers
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY transactions_select_own_user
  ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY transactions_select_own_business
  ON public.transactions
  FOR SELECT
  USING (public.is_business_staff_member(business_id));

CREATE POLICY transactions_insert_business
  ON public.transactions
  FOR INSERT
  WITH CHECK (
    public.is_business_staff_member(business_id)
    AND staff_id = auth.uid()
  );

CREATE POLICY transactions_all_admin
  ON public.transactions
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY rewards_select_own
  ON public.rewards
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY rewards_select_business
  ON public.rewards
  FOR SELECT
  USING (
    business_id IS NOT NULL
    AND public.is_business_staff_member(business_id)
  );

CREATE POLICY rewards_all_admin
  ON public.rewards
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY badges_select_all
  ON public.badges
  FOR SELECT
  USING (is_active = true);

CREATE POLICY badges_all_admin
  ON public.badges
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY user_badges_select_own
  ON public.user_badges
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY user_badges_all_admin
  ON public.user_badges
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY favorites_select_own
  ON public.user_favorites
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY favorites_insert_own
  ON public.user_favorites
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY favorites_delete_own
  ON public.user_favorites
  FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY notifications_select_own
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_insert_admin
  ON public.notifications
  FOR INSERT
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY tickets_select_own
  ON public.support_tickets
  FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY tickets_insert_own
  ON public.support_tickets
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY tickets_update_own
  ON public.support_tickets
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY tickets_all_admin
  ON public.support_tickets
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY messages_select_own
  ON public.support_ticket_messages
  FOR SELECT
  USING (
    public.owns_support_ticket(ticket_id)
    AND is_internal = false
  );

CREATE POLICY messages_insert_own
  ON public.support_ticket_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND is_internal = false
    AND public.owns_support_ticket(ticket_id)
  );

CREATE POLICY messages_all_admin
  ON public.support_ticket_messages
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY plans_select_all
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

CREATE POLICY plans_all_admin
  ON public.subscription_plans
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY audit_all_admin
  ON public.admin_audit_log
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY settings_select_authenticated
  ON public.platform_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY settings_modify_admin
  ON public.platform_settings
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

CREATE POLICY webhook_events_admin_only
  ON public.lemon_squeezy_webhook_events
  FOR ALL
  USING (public.current_user_has_role('admin'))
  WITH CHECK (public.current_user_has_role('admin'));

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.business_categories TO anon, authenticated;
GRANT SELECT ON public.businesses TO anon, authenticated;
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT SELECT ON public.badges TO anon, authenticated;
GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT SELECT ON public.v_active_marketplace_businesses TO anon, authenticated;

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, UPDATE ON public.end_user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_staff TO authenticated;
GRANT SELECT ON public.membership_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.offers TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT ON public.rewards TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_favorites TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT INSERT ON public.admin_audit_log TO authenticated;
GRANT SELECT ON public.platform_settings TO authenticated;

REVOKE ALL ON FUNCTION public.current_user_has_role(public.user_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_staff_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_business_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.owns_support_ticket(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.lookup_member(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_transaction(uuid, text, numeric, public.identification_method, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_offers(uuid, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_dashboard_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_rewards_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_membership_card(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_business_slug(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_for_role(public.user_role) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('business-media', 'business-media', true),
  ('offer-media', 'offer-media', true),
  ('badge-icons', 'badge-icons', true);

CREATE POLICY avatars_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_upload_own
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_manage_own
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_delete_own
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY biz_media_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'business-media');

CREATE POLICY biz_media_upload
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY biz_media_manage
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY biz_media_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1
      FROM public.businesses
      WHERE id::text = (storage.foldername(objects.name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY offer_media_public_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'offer-media');

CREATE POLICY offer_media_upload
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'offer-media'
    AND EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY offer_media_manage
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'offer-media'
    AND EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND is_active = true
    )
  )
  WITH CHECK (
    bucket_id = 'offer-media'
    AND EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY offer_media_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'offer-media'
    AND EXISTS (
      SELECT 1
      FROM public.business_staff
      WHERE business_id::text = (storage.foldername(name))[1]
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY badge_icons_read
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'badge-icons');

CREATE POLICY badge_icons_admin_insert
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'badge-icons'
    AND public.current_user_has_role('admin')
  );

CREATE POLICY badge_icons_admin_manage
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'badge-icons'
    AND public.current_user_has_role('admin')
  )
  WITH CHECK (
    bucket_id = 'badge-icons'
    AND public.current_user_has_role('admin')
  );

CREATE POLICY badge_icons_admin_delete
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'badge-icons'
    AND public.current_user_has_role('admin')
  );

SELECT cron.schedule(
  'expire-offers',
  '5 0 * * *',
  $$
    UPDATE public.offers
    SET status = 'expired',
        updated_at = now()
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at < now();
  $$
);

SELECT cron.schedule(
  'expire-subscriptions',
  '10 0 * * *',
  $$
    UPDATE public.end_user_profiles
    SET subscription_status = 'expired',
        subscription_plan = 'free',
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
        AND subscription_plan = 'free'
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

COMMIT;
