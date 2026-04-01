# Supabase Backend

Local-first Supabase foundation for the Rewards App marketplace, loyalty, subscriptions, and admin workflows.

## What is included

- Full Postgres schema for users, businesses, offers, transactions, rewards, badges, support, settings, and billing webhook tracking
- Row Level Security policies for end users, business staff, admins, and public marketplace reads
- RPC functions for marketplace queries, member lookup, transaction recording, analytics, onboarding profile repair, and card creation
- Storage buckets and object policies for avatars, business media, offer media, and badge icons
- Supabase Edge Functions for Lemon Squeezy checkout creation and webhook handling
- Seed data for categories, badges, plans, and platform settings

## Local setup

Use the Supabase CLI from the repository root.

```bash
supabase start
supabase db reset
supabase status
```

Local auth defaults in [config.toml](/Users/zafeirious/Desktop/rewards-app/supabase/config.toml):

- End-user app callback: `http://127.0.0.1:3000/auth/callback`
- Business app callback: `http://127.0.0.1:3001/auth/callback`
- Admin app callback: `http://127.0.0.1:3002/auth/callback`
- Email confirmations: disabled for local development
- Minimum password length: `8`

Production references from the product spec remain:

- `https://app.domain.com/auth/callback`
- `https://client.domain.com/auth/callback`
- `https://admin.domain.com/auth/callback`

## Reset, migrate, seed

The project uses:

- Migration: [20260331070853_remote_commit.sql](/Users/zafeirious/Desktop/rewards-app/supabase/migrations/20260331070853_remote_commit.sql)
- Seed file: [seed.sql](/Users/zafeirious/Desktop/rewards-app/supabase/seed.sql)

Common commands:

```bash
supabase db reset
supabase migration new <name>
supabase db push
```

`supabase db reset` should rebuild the schema, storage buckets, policies, cron jobs, and seed records from scratch.

## Schema overview

Core tables:

- `profiles`: base identity record linked to `auth.users`
- `end_user_profiles`: end-user subscription, onboarding, and shipping data
- `businesses`, `business_categories`, `business_staff`: business onboarding and staff access
- `membership_cards`: physical card lifecycle tracking
- `offers`: marketplace offers and redemption limits
- `transactions`, `rewards`: purchase ledger and points ledger
- `badges`, `user_badges`: badge definitions and earned badges
- `user_favorites`, `notifications`: member-facing saved items and in-app notifications
- `support_tickets`, `support_ticket_messages`: support workflow
- `subscription_plans`: Lemon Squeezy plan mapping
- `admin_audit_log`: admin accountability log
- `platform_settings`: platform-wide configurable values
- `lemon_squeezy_webhook_events`: webhook idempotency table

View:

- `v_active_marketplace_businesses`: active, verified businesses with active offer counts

Notable hardening:

- Non-negative money and counter checks
- Exact-one-target constraint on `user_favorites`
- Idempotent membership card creation via active lifecycle uniqueness
- Webhook deduplication via `lemon_squeezy_webhook_events`

## RPC reference

Frontend-facing RPCs:

- `lookup_member(p_identifier text)`: business staff lookup by public member id
- `record_transaction(p_business_id uuid, p_user_public_id text, p_amount_spent numeric, p_identification_method identification_method, p_offer_id uuid default null, p_notes text default null)`: records a purchase, points, notification, and badge checks
- `get_marketplace_offers(p_user_id uuid default null, p_category_slug text default null, p_search text default null, p_limit integer default 20, p_offset integer default 0)`: returns marketplace cards with free-plan gating
- `get_business_dashboard_stats(p_business_id uuid)`: business analytics summary
- `get_user_rewards_summary(p_user_id uuid)`: member rewards summary and recent ledger items
- `get_admin_dashboard_stats()`: admin dashboard rollup
- `create_membership_card(p_user_id uuid)`: idempotent card creation, primarily for service/admin flows
- `generate_business_slug(p_name text)`: slug helper for onboarding
- `ensure_profile_for_role(p_role user_role)`: OAuth-safe profile backfill for `end_user` or `business`

Internal RPCs and triggers:

- `generate_unique_public_id()`
- `check_and_award_badges(p_user_id uuid)`
- `handle_new_user()` trigger on `auth.users`
- `update_updated_at()` trigger function

## RLS model

Public reads:

- Active marketplace businesses
- Active marketplace offers
- Active badges
- Active subscription plans
- Business categories
- `v_active_marketplace_businesses`

Authenticated self-service:

- Users can read and update their own profile, end-user profile, notifications, favorites, tickets, and card records
- Business owners and active staff can manage their own businesses, staff memberships, offers, and transaction views
- Admins have full access through explicit admin policies

Important policy behaviors:

- `platform_settings` are readable only by authenticated callers
- `support_ticket_messages.is_internal = true` is hidden from non-admin users
- Notification inserts are limited to admin or service-role paths, not anonymous callers

## Storage

Buckets created by migration:

- `avatars`
- `business-media`
- `offer-media`
- `badge-icons`

Policy model:

- `avatars/{user_id}/*`: managed by the owning user
- `business-media/{business_id}/*`: managed by the owning business owner
- `offer-media/{business_id}/*`: managed by active business staff
- `badge-icons/*`: admin-managed

All four buckets are publicly readable to support frontend rendering.

## Edge Functions

### `create-checkout`

Path:

- [create-checkout/index.ts](/Users/zafeirious/Desktop/rewards-app/supabase/functions/create-checkout/index.ts)

Purpose:

- Validates bearer auth
- Validates business ownership/staff access for business subscriptions
- Calls Lemon Squeezy checkout API
- Returns `{ "checkout_url": "..." }`

Expected request body:

```json
{
  "variant_id": "VARIANT_USER_PAID",
  "plan_type": "end_user",
  "redirect_url": "http://127.0.0.1:3000/billing/success",
  "custom_data": {
    "business_id": "optional-for-business-plan"
  }
}
```

### `lemon-squeezy-webhook`

Path:

- [lemon-squeezy-webhook/index.ts](/Users/zafeirious/Desktop/rewards-app/supabase/functions/lemon-squeezy-webhook/index.ts)

Purpose:

- Verifies HMAC signature from `x-signature`
- Deduplicates webhook delivery using `lemon_squeezy_webhook_events`
- Handles subscription created, updated, payment success, and payment failed events
- Activates user or business subscriptions and creates membership cards for paid end users

## Secrets and environment

Set Edge Function secrets with:

```bash
supabase secrets set \
  SUPABASE_URL=http://127.0.0.1:54321 \
  SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
  LEMON_SQUEEZY_API_KEY=<api-key> \
  LEMON_SQUEEZY_STORE_ID=<store-id> \
  LEMON_SQUEEZY_WEBHOOK_SECRET=<webhook-secret>
```

Frontend apps need:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_APP_URL=http://127.0.0.1:3000
VITE_USER_PAID_VARIANT_ID=VARIANT_USER_PAID
VITE_BUSINESS_VARIANT_ID=VARIANT_BUSINESS
```

## Types

Generate TypeScript database types after the local stack is running:

```bash
supabase gen types typescript --local > client/src/lib/database.types.ts
```

Adjust the output path to match the app structure you settle on.

## Seed data notes

`seed.sql` intentionally contains placeholders for:

- Lemon Squeezy product ids
- Lemon Squeezy variant ids
- Production support email/domain specifics

The initial admin user is intentionally not auto-seeded because the `auth.users` UUID is not known ahead of time. Create the admin auth user first, then insert or promote the matching `profiles` row manually.

## Troubleshooting

- `supabase status` or `supabase start` failing with Docker permission errors means the CLI cannot reach the local Docker daemon.
- `supabase db reset` failing on `pg_cron` usually means the local stack was not fully initialized yet; start the stack first and rerun the reset.
- Missing checkout or webhook secrets will cause the Edge Functions to return explicit configuration errors.
- OAuth sign-ins that create an auth user without an app profile should call `ensure_profile_for_role('end_user')` or `ensure_profile_for_role('business')` from the callback page.
