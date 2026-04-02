INSERT INTO public.business_categories (name, slug, icon, description, display_order)
VALUES
  ('Food & Dining', 'food-dining', '🍽️', 'Restaurants, taverns, and dining experiences.', 1),
  ('Beauty & Wellness', 'beauty-wellness', '💆', 'Salons, spas, and wellness services.', 2),
  ('Clothing & Fashion', 'clothing-fashion', '👗', 'Fashion retailers and apparel stores.', 3),
  ('Health & Fitness', 'health-fitness', '💪', 'Gyms, studios, and health services.', 4),
  ('Entertainment', 'entertainment', '🎭', 'Events, culture, and recreation.', 5),
  ('Retail & Shopping', 'retail-shopping', '🛍️', 'General retail and shopping outlets.', 6),
  ('Services', 'services', '🔧', 'Professional and consumer services.', 7),
  ('Cafés & Bars', 'cafes-bars', '☕', 'Coffee shops, bars, and nightlife venues.', 8),
  ('Education', 'education', '📚', 'Schools, courses, and training providers.', 9),
  ('Other', 'other', '📦', 'Other participating businesses.', 10);

INSERT INTO public.badges (
  name,
  description,
  icon_url,
  badge_type,
  criteria_type,
  criteria_value,
  display_order
)
VALUES
  ('First Purchase', 'Made your first purchase as a member', 'badge-icons/Asset 31.svg', 'milestone', 'transaction_count', 1, 1),
  ('Regular Shopper', 'Completed 5 transactions', 'badge-icons/Asset 34.svg', 'milestone', 'transaction_count', 5, 2),
  ('Loyal Customer', 'Completed 10 transactions', 'badge-icons/Asset 2.svg', 'milestone', 'transaction_count', 10, 3),
  ('Super Loyal', 'Completed 25 transactions', 'badge-icons/Asset 24.svg', 'milestone', 'transaction_count', 25, 4),
  ('Elite Member', 'Completed 50 transactions', 'badge-icons/Asset 14.svg', 'milestone', 'transaction_count', 50, 5),
  ('Big Spender', 'Spent €100 in total', 'badge-icons/Asset 18.svg', 'milestone', 'total_spent', 100, 6),
  ('Premium Spender', 'Spent €500 in total', 'badge-icons/Asset 10.svg', 'milestone', 'total_spent', 500, 7),
  ('Explorer', 'Visited 3 different businesses', 'badge-icons/Asset 16.svg', 'activity', 'businesses_visited', 3, 8),
  ('World Traveler', 'Visited 10 different businesses', 'badge-icons/Asset 11.svg', 'activity', 'businesses_visited', 10, 9),
  ('Points Collector', 'Earned 100 reward points', 'badge-icons/Asset 15.svg', 'milestone', 'rewards_earned', 100, 10),
  ('Points Master', 'Earned 500 reward points', 'badge-icons/Asset 7.svg', 'milestone', 'rewards_earned', 500, 11),
  ('Veteran Member', 'Member for 1 year', 'badge-icons/Asset 12.svg', 'milestone', 'account_age_days', 365, 12);

INSERT INTO public.subscription_plans (
  name,
  audience,
  plan_code,
  lemon_squeezy_product_id,
  lemon_squeezy_variant_id,
  checkout_url,
  monthly_price_cents,
  setup_fee_cents,
  limits,
  features
)
VALUES
  (
    'Business Plus',
    'business',
    'business_plus',
    '940782',
    '1478540',
    'https://billing.nostalgie.world/checkout/buy/56614de4-bbb1-4e1b-9129-f9c5a979c23f',
    350,
    2900,
    '{"active_offers":3,"monthly_transactions":75}'::jsonb,
    '{"profile_presence":"standard","priority_support":false}'::jsonb
  ),
  (
    'Business Pro',
    'business',
    'business_pro',
    '940782',
    '1478575',
    'https://billing.nostalgie.world/checkout/buy/48515494-0eb1-42af-a0dd-e6a26d3bb0f1',
    899,
    2900,
    '{"active_offers":10,"monthly_transactions":300}'::jsonb,
    '{"profile_presence":"priority","priority_support":true}'::jsonb
  ),
  (
    'End User Free',
    'end_user',
    'end_user_free',
    '940939',
    'VARIANT_END_USER_FREE',
    NULL,
    0,
    0,
    '{"monthly_unlocks":3,"monthly_redemptions":3}'::jsonb,
    '{"rewards_history":false,"favorites":false,"physical_card":"barcode_only"}'::jsonb
  ),
  (
    'End User Plus',
    'end_user',
    'end_user_plus',
    '940939',
    '1478832',
    'https://billing.nostalgie.world/checkout/buy/2d3a759c-7dbf-4f13-857e-b2dfa4ee9d65',
    299,
    0,
    '{"monthly_unlocks":12,"monthly_redemptions":8}'::jsonb,
    '{"rewards_history":true,"favorites":true,"physical_card":"optional"}'::jsonb
  ),
  (
    'End User Pro',
    'end_user',
    'end_user_pro',
    '940939',
    '1478833',
    'https://billing.nostalgie.world/checkout/buy/5b11bbb6-e7e9-47ec-8fe9-b863f36b0c18',
    699,
    0,
    '{"monthly_unlocks":50,"monthly_redemptions":30}'::jsonb,
    '{"rewards_history":true,"favorites":true,"physical_card":"included","priority_support":true}'::jsonb
  )
ON CONFLICT (plan_code) DO UPDATE
SET
  name = EXCLUDED.name,
  audience = EXCLUDED.audience,
  lemon_squeezy_product_id = EXCLUDED.lemon_squeezy_product_id,
  lemon_squeezy_variant_id = EXCLUDED.lemon_squeezy_variant_id,
  checkout_url = EXCLUDED.checkout_url,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  setup_fee_cents = EXCLUDED.setup_fee_cents,
  limits = EXCLUDED.limits,
  features = EXCLUDED.features,
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
  metadata
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
    '{}'::jsonb
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
    '{}'::jsonb
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
  updated_at = now();

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('rewards_points_per_euro', '1'::jsonb, 'Points awarded per €1 spent'),
  ('free_user_offer_limit', '3'::jsonb, 'Max offers visible to free users'),
  ('card_auto_activate_days', '14'::jsonb, 'Days after shipping to auto-activate card'),
  ('platform_name', '"LoyaltyCard GR"'::jsonb, 'Platform display name'),
  ('support_email', '"support@domain.com"'::jsonb, 'Support contact email'),
  ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode');
