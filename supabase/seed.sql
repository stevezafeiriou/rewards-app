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
  ('First Purchase', 'Made your first purchase as a member', NULL, 'milestone', 'transaction_count', 1, 1),
  ('Regular Shopper', 'Completed 5 transactions', NULL, 'milestone', 'transaction_count', 5, 2),
  ('Loyal Customer', 'Completed 10 transactions', NULL, 'milestone', 'transaction_count', 10, 3),
  ('Super Loyal', 'Completed 25 transactions', NULL, 'milestone', 'transaction_count', 25, 4),
  ('Elite Member', 'Completed 50 transactions', NULL, 'milestone', 'transaction_count', 50, 5),
  ('Big Spender', 'Spent €100 in total', NULL, 'milestone', 'total_spent', 100, 6),
  ('Premium Spender', 'Spent €500 in total', NULL, 'milestone', 'total_spent', 500, 7),
  ('Explorer', 'Visited 3 different businesses', NULL, 'activity', 'businesses_visited', 3, 8),
  ('World Traveler', 'Visited 10 different businesses', NULL, 'activity', 'businesses_visited', 10, 9),
  ('Points Collector', 'Earned 100 reward points', NULL, 'milestone', 'rewards_earned', 100, 10),
  ('Points Master', 'Earned 500 reward points', NULL, 'milestone', 'rewards_earned', 500, 11),
  ('Veteran Member', 'Member for 1 year', NULL, 'milestone', 'account_age_days', 365, 12);

INSERT INTO public.subscription_plans (
  name,
  plan_type,
  lemon_squeezy_product_id,
  lemon_squeezy_variant_id,
  price_monthly_cents,
  setup_fee_cents,
  features
)
VALUES
  (
    'User Premium Membership',
    'end_user',
    'PRODUCT_ID_HERE',
    'VARIANT_USER_PAID',
    200,
    0,
    '{"offer_access":"unlimited","physical_card":true,"badges":true}'::jsonb
  ),
  (
    'Business Membership',
    'business',
    'PRODUCT_ID_HERE',
    'VARIANT_BUSINESS',
    350,
    3000,
    '{"offer_management":true,"transaction_recording":true,"analytics":true}'::jsonb
  );

INSERT INTO public.platform_settings (key, value, description)
VALUES
  ('rewards_points_per_euro', '1'::jsonb, 'Points awarded per €1 spent'),
  ('free_user_offer_limit', '3'::jsonb, 'Max offers visible to free users'),
  ('card_auto_activate_days', '14'::jsonb, 'Days after shipping to auto-activate card'),
  ('platform_name', '"LoyaltyCard GR"'::jsonb, 'Platform display name'),
  ('support_email', '"support@domain.com"'::jsonb, 'Support contact email'),
  ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode');
