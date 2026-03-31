```markdown
# Technical Documentation

## MVP Membership & Loyalty Card Platform — Greek Market

**Version:** 1.0.0
**Last Updated:** 2025-01-XX
**Classification:** Internal — Development Reference
**Author:** CTO Office

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Supabase Backend — Complete Specification](#3-supabase-backend--complete-specification)
4. [Lemon Squeezy Payment Integration](#4-lemon-squeezy-payment-integration)
5. [End-User Application — app.domain.com](#5-end-user-application--appdomaincom)
6. [Business Application — client.domain.com](#6-business-application--clientdomaincom)
7. [Admin Application — admin.domain.com](#7-admin-application--admindomaincom)
8. [Membership Card System](#8-membership-card-system)
9. [Rewards System](#9-rewards-system)
10. [Badges System](#10-badges-system)
11. [Customer Identification & Transaction Flow](#11-customer-identification--transaction-flow)
12. [TypeScript Shared Types](#12-typescript-shared-types)
13. [Security Model](#13-security-model)
14. [Environment Variables & Configuration](#14-environment-variables--configuration)
15. [Deployment Architecture](#15-deployment-architecture)
16. [Third-Party Libraries](#16-third-party-libraries)
17. [Appendix — Seed Data](#17-appendix--seed-data)

---

## 1. Executive Summary

This document is the **single source of truth** for the development of the MVP Membership & Loyalty Card Platform. It is intended for two audiences:

| Audience                  | Reads Sections                                              |
| ------------------------- | ----------------------------------------------------------- |
| **Supabase Developer**    | 3, 4 (webhook/edge functions), 8, 9, 10, 11, 13, 14, 17     |
| **Frontend Developer(s)** | 2, 4 (checkout flow), 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16 |

### What We Are Building

A **dual-sided subscription platform** where:

- **End users** register, optionally upgrade to a paid plan ($€2$/mo), receive a physical PVC loyalty card, browse a marketplace of offers, and earn rewards by shopping at participating businesses.
- **Businesses** register, pay a subscription ($€3.50$/mo + $€30$ one-time setup fee), publish offers, identify members in-store, and record transactions that yield rewards.
- **Admins** moderate both sides, manage card fulfilment, and oversee the platform.

### Three Separate Frontend Applications

| App          | Domain              | Purpose                                                        |
| ------------ | ------------------- | -------------------------------------------------------------- |
| End-User App | `app.domain.com`    | Member-facing: signups, marketplace, rewards, card             |
| Business App | `client.domain.com` | Business-facing: registration, dashboard, offers, transactions |
| Admin App    | `admin.domain.com`  | Internal: moderation, fulfilment, support                      |

All three applications share **one Supabase project** (database, auth, storage, edge functions). Security isolation is enforced through **Row Level Security (RLS)** policies and **role-based access** at the database layer.

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture
```

┌─────────────────────────────────────────────────────────────────┐
│ CLIENTS (Browser) │
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ app.domain │ │client.domain │ │admin.domain │ │
│ │ (End User) │ │ (Business) │ │ (Admin) │ │
│ │ React+Vite │ │ React+Vite │ │ React+Vite │ │
│ │ TypeScript │ │ TypeScript │ │ TypeScript │ │
│ │ TailwindCSS │ │ TailwindCSS │ │ TailwindCSS │ │
│ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │
│ │ │ │ │
└──────────┼─────────────────┼──────────────────┼─────────────────┘
│ │ │
▼ ▼ ▼
┌─────────────────────────────────────────────────────────────────┐
│ SUPABASE (Single Project) │
│ │
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ │ Auth │ │ Database │ │ Storage │ │ Edge │ │
│ │ (GoTrue) │ │ (Postgres) │ │ (S3-compat)│ │Functions │ │
│ └────────────┘ └────────────┘ └────────────┘ └─────┬────┘ │
│ │ │
└────────────────────────────────────────────────────────┼────────┘
│
▼
┌──────────────────┐
│ Lemon Squeezy │
│ (Payments & │
│ Subscriptions) │
└──────────────────┘
``

### 2.2 Technology Stack

| Layer               | Technology                     | Version / Notes               |
| ------------------- | ------------------------------ | ----------------------------- |
| Frontend Framework  | React                          | 18.x                          |
| Build Tool          | Vite                           | 5.x                           |
| Language            | TypeScript                     | 5.x, strict mode              |
| Styling             | Tailwind CSS                   | 3.x                           |
| Routing             | React Router                   | 6.x                           |
| State Management    | React Context + Tanstack Query | For server state caching      |
| Backend             | Supabase (hosted, Pro plan)    | PostgreSQL 15+                |
| Auth                | Supabase Auth (GoTrue)         | Email/password + Google OAuth |
| File Storage        | Supabase Storage               | S3-compatible buckets         |
| Serverless Logic    | Supabase Edge Functions        | Deno runtime                  |
| Payments            | Lemon Squeezy                  | Merchant of Record            |
| Hosting             | Netlify                        | 3 separate sites              |
| QR Generation       | `qrcode.react`                 | Frontend library              |
| Barcode Generation  | `react-barcode`                | Frontend library (Code128)    |
| QR/Barcode Scanning | `html5-qrcode`                 | Business app scanner          |

### 2.3 Shared Supabase Client Configuration

All three apps use the same Supabase project. Each app initialises the client identically:

```typescript
// src/lib/supabase.ts (identical in all 3 apps)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types"; // generated types

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

> **Important:** The `anon` key is safe to expose in the browser. All security is enforced by RLS policies on the database.

---

## 3. Supabase Backend — Complete Specification

This section is the **primary reference for the Supabase Developer**.

### 3.1 Project Configuration

#### Auth Settings

| Setting                    | Value                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Site URL                   | `https://app.domain.com`                                                                                                    |
| Redirect URLs (allow list) | `https://app.domain.com/auth/callback`, `https://client.domain.com/auth/callback`, `https://admin.domain.com/auth/callback` |
| Email auth                 | Enabled                                                                                                                     |
| Email confirmations        | Enabled                                                                                                                     |
| Google OAuth               | Enabled (configure client ID/secret)                                                                                        |
| Password min length        | 8                                                                                                                           |
| JWT expiry                 | 3600 (1 hour)                                                                                                               |
| Refresh token rotation     | Enabled                                                                                                                     |

#### CORS / Allowed Origins

Configure the following origins in the Supabase dashboard (API settings):

```
https://app.domain.com
https://client.domain.com
https://admin.domain.com
```

---

### 3.2 Database Schema

#### 3.2.1 Custom Types (Enums)

```sql
-- User roles across the platform
CREATE TYPE public.user_role AS ENUM (
  'end_user',
  'business',
  'admin'
);

-- End-user subscription plan
CREATE TYPE public.user_subscription_plan AS ENUM (
  'free',
  'paid'
);

-- Subscription status (shared for both user and business)
CREATE TYPE public.subscription_status AS ENUM (
  'none',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired'
);

-- Physical card lifecycle
CREATE TYPE public.card_status AS ENUM (
  'pending_production',
  'printed',
  'shipped',
  'active',
  'replaced',
  'disabled'
);

-- Offer lifecycle
CREATE TYPE public.offer_status AS ENUM (
  'draft',
  'active',
  'paused',
  'expired',
  'archived'
);

-- Offer type
CREATE TYPE public.offer_type AS ENUM (
  'percentage_discount',
  'fixed_discount',
  'free_item',
  'buy_one_get_one',
  'custom'
);

-- Transaction identification method
CREATE TYPE public.identification_method AS ENUM (
  'qr_scan',
  'barcode_scan',
  'manual_entry',
  'nfc'
);

-- Reward ledger entry type
CREATE TYPE public.reward_entry_type AS ENUM (
  'earned',
  'redeemed',
  'expired',
  'adjustment'
);

-- Support ticket status
CREATE TYPE public.ticket_status AS ENUM (
  'open',
  'in_progress',
  'resolved',
  'closed'
);

-- Support ticket priority
CREATE TYPE public.ticket_priority AS ENUM (
  'low',
  'medium',
  'high'
);
```

#### 3.2.2 Tables

Below is every table in the schema. All tables live in the `public` schema. **RLS must be enabled on every table.**

---

##### Table: `profiles`

Central identity table. One row per `auth.users` record. Created automatically via trigger on signup.

```sql
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            public.user_role NOT NULL,
  email           text NOT NULL,
  first_name      text,
  last_name       text,
  phone           text,
  avatar_url      text,
  public_user_id  text UNIQUE, -- 9-digit, generated only for end_users
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for member lookup (scanning)
CREATE UNIQUE INDEX idx_profiles_public_user_id ON public.profiles(public_user_id) WHERE public_user_id IS NOT NULL;
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);
```

---

##### Table: `end_user_profiles`

Extension of `profiles` for end-user-specific data.

```sql
CREATE TABLE public.end_user_profiles (
  id                          uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  date_of_birth               date,
  subscription_plan           public.user_subscription_plan NOT NULL DEFAULT 'free',
  subscription_status         public.subscription_status NOT NULL DEFAULT 'none',
  lemon_squeezy_customer_id   text,
  lemon_squeezy_subscription_id text,
  subscription_started_at     timestamptz,
  subscription_ends_at        timestamptz,
  total_rewards_points        integer NOT NULL DEFAULT 0,
  -- Shipping address for physical card
  shipping_address_line1      text,
  shipping_address_line2      text,
  shipping_city               text,
  shipping_postal_code        text,
  shipping_region             text,
  shipping_country            text DEFAULT 'GR',
  onboarding_completed        boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

---

##### Table: `businesses`

Each business entity registered on the platform.

```sql
CREATE TABLE public.businesses (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name                        text NOT NULL,
  slug                        text UNIQUE NOT NULL,
  description                 text,
  category_id                 uuid REFERENCES public.business_categories(id),
  subcategory                 text,
  profile_image_url           text,
  cover_image_url             text,
  address_line1               text,
  address_line2               text,
  city                        text,
  postal_code                 text,
  region                      text,
  country                     text DEFAULT 'GR',
  latitude                    numeric(10, 7),
  longitude                   numeric(10, 7),
  phone                       text,
  email                       text,
  website                     text,
  social_facebook             text,
  social_instagram            text,
  operating_hours             jsonb, -- see schema below
  is_verified                 boolean NOT NULL DEFAULT true, -- auto-verified for MVP
  is_active                   boolean NOT NULL DEFAULT false, -- becomes true after payment
  subscription_status         public.subscription_status NOT NULL DEFAULT 'none',
  lemon_squeezy_customer_id   text,
  lemon_squeezy_subscription_id text,
  subscription_started_at     timestamptz,
  subscription_ends_at        timestamptz,
  one_time_fee_paid           boolean NOT NULL DEFAULT false,
  onboarding_completed        boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_category ON public.businesses(category_id);
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_businesses_active ON public.businesses(is_active, subscription_status);
```

**`operating_hours` JSON schema:**

```json
{
	"monday": { "open": "09:00", "close": "21:00", "closed": false },
	"tuesday": { "open": "09:00", "close": "21:00", "closed": false },
	"wednesday": { "open": "09:00", "close": "21:00", "closed": false },
	"thursday": { "open": "09:00", "close": "21:00", "closed": false },
	"friday": { "open": "09:00", "close": "22:00", "closed": false },
	"saturday": { "open": "10:00", "close": "22:00", "closed": false },
	"sunday": { "open": null, "close": null, "closed": true }
}
```

---

##### Table: `business_categories`

Lookup table for business sectors.

```sql
CREATE TABLE public.business_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  icon          text, -- icon name or emoji
  description   text,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

---

##### Table: `business_staff`

Links user accounts to businesses. Supports future multi-staff per business.

```sql
CREATE TABLE public.business_staff (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id   uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_role    text NOT NULL DEFAULT 'owner', -- 'owner', 'manager', 'staff'
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

CREATE INDEX idx_business_staff_user ON public.business_staff(user_id);
CREATE INDEX idx_business_staff_business ON public.business_staff(business_id);
```

---

##### Table: `membership_cards`

Tracks physical loyalty cards.

```sql
CREATE TABLE public.membership_cards (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_number             text UNIQUE NOT NULL, -- same as profiles.public_user_id
  status                  public.card_status NOT NULL DEFAULT 'pending_production',
  -- Shipping address snapshot (copied from end_user_profiles at creation time)
  shipping_address_line1  text,
  shipping_address_line2  text,
  shipping_city           text,
  shipping_postal_code    text,
  shipping_region         text,
  shipping_country        text DEFAULT 'GR',
  shipped_at              timestamptz,
  delivered_at            timestamptz,
  activated_at            timestamptz,
  disabled_at             timestamptz,
  replacement_for         uuid REFERENCES public.membership_cards(id),
  tracking_number         text,
  notes                   text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_user ON public.membership_cards(user_id);
CREATE INDEX idx_cards_status ON public.membership_cards(status);
CREATE INDEX idx_cards_number ON public.membership_cards(card_number);
```

---

##### Table: `offers`

Promotional offers published by businesses.

```sql
CREATE TABLE public.offers (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title                 text NOT NULL,
  description           text,
  terms_conditions      text,
  offer_type            public.offer_type NOT NULL DEFAULT 'custom',
  discount_value        numeric(10, 2), -- e.g., 15.00 for 15% or €15
  image_url             text,
  status                public.offer_status NOT NULL DEFAULT 'draft',
  starts_at             timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz,
  is_featured           boolean NOT NULL DEFAULT false,
  max_redemptions       integer,         -- NULL = unlimited
  current_redemptions   integer NOT NULL DEFAULT 0,
  min_purchase_amount   numeric(10, 2),  -- NULL = no minimum
  requires_paid_membership boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_business ON public.offers(business_id);
CREATE INDEX idx_offers_status ON public.offers(status);
CREATE INDEX idx_offers_active ON public.offers(status, starts_at, expires_at)
  WHERE status = 'active';
```

---

##### Table: `transactions`

Records every in-store purchase event.

```sql
CREATE TABLE public.transactions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id           uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id              uuid REFERENCES public.profiles(id),
  offer_id              uuid REFERENCES public.offers(id),
  amount_spent          numeric(10, 2) NOT NULL,
  rewards_earned        integer NOT NULL DEFAULT 0,
  identification_method public.identification_method NOT NULL,
  card_id               uuid REFERENCES public.membership_cards(id),
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_business ON public.transactions(business_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);
CREATE INDEX idx_transactions_date ON public.transactions(created_at DESC);
CREATE INDEX idx_transactions_business_user ON public.transactions(business_id, user_id);
```

---

##### Table: `rewards`

Ledger of all reward point movements.

```sql
CREATE TABLE public.rewards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id     uuid REFERENCES public.businesses(id) ON DELETE SET NULL,
  transaction_id  uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  points          integer NOT NULL, -- positive for earned, negative for redeemed
  entry_type      public.reward_entry_type NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rewards_user ON public.rewards(user_id);
CREATE INDEX idx_rewards_business ON public.rewards(business_id);
CREATE INDEX idx_rewards_user_type ON public.rewards(user_id, entry_type);
```

---

##### Table: `badges`

Badge definitions (managed by admin).

```sql
CREATE TABLE public.badges (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  description     text,
  icon_url        text,
  badge_type      text NOT NULL DEFAULT 'milestone', -- milestone, activity, special
  criteria_type   text NOT NULL, -- transaction_count, total_spent, businesses_visited, rewards_earned, account_age_days, manual
  criteria_value  integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  display_order   integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);
```

---

##### Table: `user_badges`

Junction table for earned badges.

```sql
CREATE TABLE public.user_badges (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id  uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
```

---

##### Table: `user_favorites`

Users can favourite businesses or offers.

```sql
CREATE TABLE public.user_favorites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  offer_id    uuid REFERENCES public.offers(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  -- Ensure at least one target is set
  CONSTRAINT fav_has_target CHECK (business_id IS NOT NULL OR offer_id IS NOT NULL),
  -- Prevent duplicates
  UNIQUE(user_id, business_id, offer_id)
);

CREATE INDEX idx_favorites_user ON public.user_favorites(user_id);
```

---

##### Table: `notifications`

In-app notifications for users.

```sql
CREATE TABLE public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  body        text,
  type        text NOT NULL DEFAULT 'system', -- reward, badge, offer, system, card_update
  is_read     boolean NOT NULL DEFAULT false,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
```

---

##### Table: `support_tickets`

Basic support ticketing.

```sql
CREATE TABLE public.support_tickets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject     text NOT NULL,
  description text NOT NULL,
  status      public.ticket_status NOT NULL DEFAULT 'open',
  priority    public.ticket_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id),
  type        text NOT NULL DEFAULT 'general', -- general, billing, card, technical, business
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_tickets_assigned ON public.support_tickets(assigned_to);
```

---

##### Table: `support_ticket_messages`

Messages within a support ticket.

```sql
CREATE TABLE public.support_ticket_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false, -- admin-only notes
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.support_ticket_messages(ticket_id, created_at);
```

---

##### Table: `subscription_plans`

Stores Lemon Squeezy product/variant mappings.

```sql
CREATE TABLE public.subscription_plans (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                        text NOT NULL,
  plan_type                   text NOT NULL, -- 'end_user' or 'business'
  lemon_squeezy_product_id    text NOT NULL,
  lemon_squeezy_variant_id    text NOT NULL,
  price_monthly_cents         integer NOT NULL, -- in euro cents
  setup_fee_cents             integer NOT NULL DEFAULT 0, -- one-time fee in cents
  features                    jsonb DEFAULT '{}',
  is_active                   boolean NOT NULL DEFAULT true,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);
```

---

##### Table: `admin_audit_log`

Tracks all admin actions for accountability.

```sql
CREATE TABLE public.admin_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid NOT NULL REFERENCES public.profiles(id),
  action      text NOT NULL,
  target_type text NOT NULL, -- user, business, offer, card, subscription, badge, ticket
  target_id   uuid,
  details     jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_admin ON public.admin_audit_log(admin_id);
CREATE INDEX idx_audit_target ON public.admin_audit_log(target_type, target_id);
CREATE INDEX idx_audit_date ON public.admin_audit_log(created_at DESC);
```

---

##### Table: `platform_settings`

Key-value configuration for platform-wide settings.

```sql
CREATE TABLE public.platform_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL,
  description text,
  updated_by  uuid REFERENCES public.profiles(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

---

#### 3.2.3 Entity Relationship Diagram

```
auth.users
    │
    │ 1:1
    ▼
profiles ─────────────────────────────────────────────────────┐
    │                                                          │
    │ 1:1 (end_user only)              1:N (business role)     │
    ▼                                       │                  │
end_user_profiles                           │                  │
    │                                       ▼                  │
    │ 1:N                            business_staff ◄──── businesses
    ▼                                                     │    │
membership_cards                                          │    │
                                                          │    │
                                          ┌───────────────┘    │
                                          │                    │
                                          ▼                    ▼
                                       offers           transactions
                                          │                 │    │
                                          │                 │    │
                                          └─────────────────┘    │
                                                                 │
                                                    rewards ◄────┘
                                                       │
                                                       │
badges ◄──── user_badges ◄──── profiles               │
                                    │                  │
                                    ▼                  │
                              user_favorites           │
                                    │                  │
                              notifications            │
                                    │                  │
                              support_tickets          │
                                    │                  │
                              support_ticket_messages   │
                                                       │
                              admin_audit_log ◄────────┘
                              platform_settings
                              subscription_plans
                              business_categories
```

---

### 3.3 Row Level Security (RLS) Policies

> **Critical:** RLS must be **enabled** on every table. Any table without RLS enabled exposes all data to any authenticated user.

The convention for policy naming: `{table}_{action}_{who}`.

#### 3.3.1 `profiles`

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Business staff can read profiles of customers they transacted with
CREATE POLICY profiles_select_business_customers ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      JOIN public.business_staff bs ON bs.business_id = t.business_id
      WHERE t.user_id = profiles.id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Admins can read all profiles
CREATE POLICY profiles_select_admin ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can update all profiles
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Insert handled by trigger (service_role) — no user INSERT policy needed
```

#### 3.3.2 `end_user_profiles`

```sql
ALTER TABLE public.end_user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY eup_select_own ON public.end_user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY eup_update_own ON public.end_user_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY eup_select_admin ON public.end_user_profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY eup_update_admin ON public.end_user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Insert handled by trigger
```

#### 3.3.3 `businesses`

```sql
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Public can read active businesses (for marketplace)
CREATE POLICY businesses_select_public ON public.businesses
  FOR SELECT USING (
    is_active = true
    AND is_verified = true
    AND subscription_status = 'active'
  );

-- Business owner/staff can read their own business (any state)
CREATE POLICY businesses_select_own ON public.businesses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = businesses.id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Business owner can update their own business
CREATE POLICY businesses_update_own ON public.businesses
  FOR UPDATE USING (
    owner_id = auth.uid()
  ) WITH CHECK (
    owner_id = auth.uid()
  );

-- Business role users can insert (during onboarding)
CREATE POLICY businesses_insert_own ON public.businesses
  FOR INSERT WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'business'
    )
  );

-- Admin full access
CREATE POLICY businesses_all_admin ON public.businesses
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.4 `business_categories`

```sql
ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories
CREATE POLICY categories_select_all ON public.business_categories
  FOR SELECT USING (true);

-- Only admin can modify
CREATE POLICY categories_all_admin ON public.business_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.5 `business_staff`

```sql
ALTER TABLE public.business_staff ENABLE ROW LEVEL SECURITY;

-- Staff can see their own membership records
CREATE POLICY staff_select_own ON public.business_staff
  FOR SELECT USING (user_id = auth.uid());

-- Business owner can manage staff
CREATE POLICY staff_manage_owner ON public.business_staff
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = business_staff.business_id
      AND b.owner_id = auth.uid()
    )
  );

-- A user can insert themselves as owner (during onboarding)
CREATE POLICY staff_insert_self_owner ON public.business_staff
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND staff_role = 'owner'
  );

-- Admin full access
CREATE POLICY staff_all_admin ON public.business_staff
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.6 `membership_cards`

```sql
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;

-- User can read their own cards
CREATE POLICY cards_select_own ON public.membership_cards
  FOR SELECT USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY cards_all_admin ON public.membership_cards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Insert via service role (triggered by subscription activation)
```

#### 3.3.7 `offers`

```sql
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Public can read active offers from active businesses
CREATE POLICY offers_select_public ON public.offers
  FOR SELECT USING (
    status = 'active'
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = offers.business_id
      AND b.is_active = true
      AND b.subscription_status = 'active'
    )
  );

-- Business staff can read all their own offers (any status)
CREATE POLICY offers_select_own ON public.offers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = offers.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Business staff can insert offers
CREATE POLICY offers_insert_own ON public.offers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = offers.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Business staff can update own offers
CREATE POLICY offers_update_own ON public.offers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = offers.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Business staff can delete own draft offers
CREATE POLICY offers_delete_own ON public.offers
  FOR DELETE USING (
    status = 'draft'
    AND EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = offers.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Admin full access
CREATE POLICY offers_all_admin ON public.offers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.8 `transactions`

```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- End users can read their own transactions
CREATE POLICY transactions_select_own_user ON public.transactions
  FOR SELECT USING (user_id = auth.uid());

-- Business staff can read transactions for their business
CREATE POLICY transactions_select_own_business ON public.transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = transactions.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Business staff can insert transactions for their business
CREATE POLICY transactions_insert_business ON public.transactions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = transactions.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Admin full access
CREATE POLICY transactions_all_admin ON public.transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.9 `rewards`

```sql
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

-- User can read their own rewards
CREATE POLICY rewards_select_own ON public.rewards
  FOR SELECT USING (user_id = auth.uid());

-- Business staff can read rewards for their business
CREATE POLICY rewards_select_business ON public.rewards
  FOR SELECT USING (
    business_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.business_staff bs
      WHERE bs.business_id = rewards.business_id
      AND bs.user_id = auth.uid()
      AND bs.is_active = true
    )
  );

-- Insert via RPC only (SECURITY DEFINER functions)
-- No direct insert policy for regular users

-- Admin full access
CREATE POLICY rewards_all_admin ON public.rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.10 `badges` and `user_badges`

```sql
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Everyone can read active badges
CREATE POLICY badges_select_all ON public.badges
  FOR SELECT USING (is_active = true);

-- Admin full access to badges
CREATE POLICY badges_all_admin ON public.badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Users can read their own earned badges
CREATE POLICY user_badges_select_own ON public.user_badges
  FOR SELECT USING (user_id = auth.uid());

-- Admin full access
CREATE POLICY user_badges_all_admin ON public.user_badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.11 `user_favorites`

```sql
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY favorites_select_own ON public.user_favorites
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY favorites_insert_own ON public.user_favorites
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY favorites_delete_own ON public.user_favorites
  FOR DELETE USING (user_id = auth.uid());
```

#### 3.3.12 `notifications`

```sql
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin can insert (system notifications)
CREATE POLICY notifications_insert_admin ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.13 `support_tickets` and `support_ticket_messages`

```sql
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- User can read own tickets
CREATE POLICY tickets_select_own ON public.support_tickets
  FOR SELECT USING (created_by = auth.uid());

-- User can create tickets
CREATE POLICY tickets_insert_own ON public.support_tickets
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- User can update own tickets (limited fields handled by RPC)
CREATE POLICY tickets_update_own ON public.support_tickets
  FOR UPDATE USING (created_by = auth.uid());

-- Admin full access
CREATE POLICY tickets_all_admin ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Messages: user can read messages from own tickets
CREATE POLICY messages_select_own ON public.support_ticket_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
      AND t.created_by = auth.uid()
    )
    AND is_internal = false
  );

-- Messages: user can insert on own tickets
CREATE POLICY messages_insert_own ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_messages.ticket_id
      AND t.created_by = auth.uid()
    )
  );

-- Admin full access to messages
CREATE POLICY messages_all_admin ON public.support_ticket_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.14 `subscription_plans`

```sql
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can read active plans
CREATE POLICY plans_select_all ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Admin full access
CREATE POLICY plans_all_admin ON public.subscription_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.15 `admin_audit_log`

```sql
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read and insert
CREATE POLICY audit_all_admin ON public.admin_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

#### 3.3.16 `platform_settings`

```sql
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY settings_select_all ON public.platform_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY settings_modify_admin ON public.platform_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
```

---

### 3.4 Database Functions (RPC)

All functions marked `SECURITY DEFINER` execute with the privileges of the function creator (superuser/service role), bypassing RLS. Use judiciously.

#### 3.4.1 `generate_unique_public_id()`

Generates a unique 9-digit number, checking for collisions.

```sql
CREATE OR REPLACE FUNCTION public.generate_unique_public_id()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
AS $$
DECLARE
  new_id text;
  done boolean := false;
BEGIN
  WHILE NOT done LOOP
    -- Generate random 9-digit number (100000000 to 999999999)
    new_id := lpad(floor(random() * 900000000 + 100000000)::bigint::text, 9, '0');
    done := NOT EXISTS (SELECT 1 FROM public.profiles WHERE public_user_id = new_id);
  END LOOP;
  RETURN new_id;
END;
$$;
```

#### 3.4.2 `handle_new_user()` — Auth Trigger

Fires after `INSERT` on `auth.users`. Creates a `profiles` row and, for end users, an `end_user_profiles` row.

```sql
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
  -- Determine role from metadata (set during signup)
  user_role := COALESCE(
    (NEW.raw_user_meta_data ->> 'role')::public.user_role,
    'end_user'
  );

  -- Generate public_user_id for end users
  IF user_role = 'end_user' THEN
    new_public_id := public.generate_unique_public_id();
  ELSE
    new_public_id := NULL;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, role, email, first_name, last_name, public_user_id)
  VALUES (
    NEW.id,
    user_role,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    new_public_id
  );

  -- Create end_user_profiles for end users
  IF user_role = 'end_user' THEN
    INSERT INTO public.end_user_profiles (id)
    VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

-- Attach the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 3.4.3 `lookup_member(p_identifier text)`

Looks up a member by their `public_user_id`. Used by businesses during customer identification.

```sql
CREATE OR REPLACE FUNCTION public.lookup_member(p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'user_id', p.id,
    'public_user_id', p.public_user_id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'avatar_url', p.avatar_url,
    'subscription_plan', eup.subscription_plan,
    'is_active', p.is_active
  ) INTO result
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
```

#### 3.4.4 `record_transaction(...)`

Records a transaction and assigns rewards. Called by business staff.

```sql
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
AS $$
DECLARE
  v_user_id uuid;
  v_staff_id uuid := auth.uid();
  v_rewards integer;
  v_transaction_id uuid;
  v_card_id uuid;
BEGIN
  -- Validate staff belongs to business
  IF NOT EXISTS (
    SELECT 1 FROM public.business_staff
    WHERE business_id = p_business_id
    AND user_id = v_staff_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not staff of this business';
  END IF;

  -- Lookup user
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE public_user_id = p_user_public_id
  AND role = 'end_user'
  AND is_active = true;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Calculate rewards: 1 point per €1 (floor)
  v_rewards := floor(p_amount_spent)::integer;

  -- Get active card (if any)
  SELECT id INTO v_card_id
  FROM public.membership_cards
  WHERE user_id = v_user_id
  AND status = 'active'
  LIMIT 1;

  -- Insert transaction
  INSERT INTO public.transactions (
    business_id, user_id, staff_id, offer_id,
    amount_spent, rewards_earned, identification_method,
    card_id, notes
  ) VALUES (
    p_business_id, v_user_id, v_staff_id, p_offer_id,
    p_amount_spent, v_rewards, p_identification_method,
    v_card_id, p_notes
  ) RETURNING id INTO v_transaction_id;

  -- Insert reward ledger entry
  INSERT INTO public.rewards (
    user_id, business_id, transaction_id,
    points, entry_type, description
  ) VALUES (
    v_user_id, p_business_id, v_transaction_id,
    v_rewards, 'earned',
    'Earned from purchase at business'
  );

  -- Update total points
  UPDATE public.end_user_profiles
  SET total_rewards_points = total_rewards_points + v_rewards,
      updated_at = now()
  WHERE id = v_user_id;

  -- Update offer redemption count if applicable
  IF p_offer_id IS NOT NULL THEN
    UPDATE public.offers
    SET current_redemptions = current_redemptions + 1,
        updated_at = now()
    WHERE id = p_offer_id;
  END IF;

  -- Create notification for user
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

  -- Check and award badges
  PERFORM public.check_and_award_badges(v_user_id);

  RETURN jsonb_build_object(
    'transaction_id', v_transaction_id,
    'rewards_earned', v_rewards,
    'user_name', (SELECT first_name || ' ' || last_name FROM profiles WHERE id = v_user_id)
  );
END;
$$;
```

#### 3.4.5 `check_and_award_badges(p_user_id uuid)`

Evaluates all badge criteria and awards any newly earned badges.

```sql
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_count integer;
  v_total_spent numeric;
  v_businesses_visited integer;
  v_total_rewards integer;
  v_account_age integer; -- in days
  v_subscription_plan text;
  badge_rec record;
BEGIN
  -- Gather user stats
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

  SELECT EXTRACT(DAY FROM now() - created_at)::integer
  INTO v_account_age
  FROM public.profiles
  WHERE id = p_user_id;

  -- Only paid users earn badges
  IF v_subscription_plan != 'paid' THEN
    RETURN;
  END IF;

  -- Iterate through active badges and award
  FOR badge_rec IN
    SELECT * FROM public.badges WHERE is_active = true
  LOOP
    -- Skip if already earned
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = p_user_id AND badge_id = badge_rec.id
    );

    -- Check criteria
    IF (badge_rec.criteria_type = 'transaction_count' AND v_transaction_count >= badge_rec.criteria_value) OR
       (badge_rec.criteria_type = 'total_spent' AND v_total_spent >= badge_rec.criteria_value) OR
       (badge_rec.criteria_type = 'businesses_visited' AND v_businesses_visited >= badge_rec.criteria_value) OR
       (badge_rec.criteria_type = 'rewards_earned' AND v_total_rewards >= badge_rec.criteria_value) OR
       (badge_rec.criteria_type = 'account_age_days' AND v_account_age >= badge_rec.criteria_value)
    THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (p_user_id, badge_rec.id)
      ON CONFLICT DO NOTHING;

      -- Notify user
      INSERT INTO public.notifications (user_id, title, body, type, metadata)
      VALUES (
        p_user_id,
        'New Badge Earned!',
        format('You earned the "%s" badge!', badge_rec.name),
        'badge',
        jsonb_build_object('badge_id', badge_rec.id, 'badge_name', badge_rec.name)
      );
    END IF;
  END LOOP;
END;
$$;
```

#### 3.4.6 `get_marketplace_offers(...)`

Returns offers for the marketplace, respecting free vs. paid user limits.

```sql
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
AS $$
DECLARE
  v_plan text := 'free';
  v_effective_limit integer;
  v_can_search boolean := false;
BEGIN
  -- Determine user plan
  IF p_user_id IS NOT NULL THEN
    SELECT subscription_plan INTO v_plan
    FROM public.end_user_profiles
    WHERE id = p_user_id;
  END IF;

  -- Free users: max 3 offers, no search/filter
  IF v_plan = 'free' OR v_plan IS NULL THEN
    v_effective_limit := 3;
    p_search := NULL;        -- Disable search
    p_category_slug := NULL; -- Disable filtering
    p_offset := 0;           -- No pagination
  ELSE
    v_effective_limit := p_limit;
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
    CASE WHEN uf.id IS NOT NULL THEN true ELSE false END AS is_favorited
  FROM public.offers o
  JOIN public.businesses b ON b.id = o.business_id
  LEFT JOIN public.business_categories bc ON bc.id = b.category_id
  LEFT JOIN public.user_favorites uf ON uf.offer_id = o.id AND uf.user_id = p_user_id
  WHERE o.status = 'active'
    AND o.starts_at <= now()
    AND (o.expires_at IS NULL OR o.expires_at > now())
    AND b.is_active = true
    AND b.is_verified = true
    AND b.subscription_status = 'active'
    AND (o.max_redemptions IS NULL OR o.current_redemptions < o.max_redemptions)
    AND (p_category_slug IS NULL OR bc.slug = p_category_slug)
    AND (p_search IS NULL OR (
      o.title ILIKE '%' || p_search || '%'
      OR o.description ILIKE '%' || p_search || '%'
      OR b.name ILIKE '%' || p_search || '%'
    ))
  ORDER BY o.is_featured DESC, o.created_at DESC
  LIMIT v_effective_limit
  OFFSET p_offset;
END;
$$;
```

#### 3.4.7 `get_business_dashboard_stats(p_business_id uuid)`

Returns aggregated stats for the business dashboard.

```sql
CREATE OR REPLACE FUNCTION public.get_business_dashboard_stats(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate caller is staff
  IF NOT EXISTS (
    SELECT 1 FROM public.business_staff
    WHERE business_id = p_business_id
    AND user_id = auth.uid()
    AND is_active = true
  ) THEN
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
  ) INTO result
  FROM public.transactions
  WHERE business_id = p_business_id;

  -- Add active offers count
  result := result || jsonb_build_object(
    'active_offers', (
      SELECT COUNT(*) FROM public.offers
      WHERE business_id = p_business_id AND status = 'active'
    )
  );

  RETURN result;
END;
$$;
```

#### 3.4.8 `get_user_rewards_summary(p_user_id uuid)`

```sql
CREATE OR REPLACE FUNCTION public.get_user_rewards_summary(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total_points', eup.total_rewards_points,
      'total_transactions', (
        SELECT COUNT(*) FROM public.transactions WHERE user_id = p_user_id
      ),
      'total_spent', (
        SELECT COALESCE(SUM(amount_spent), 0) FROM public.transactions WHERE user_id = p_user_id
      ),
      'businesses_visited', (
        SELECT COUNT(DISTINCT business_id) FROM public.transactions WHERE user_id = p_user_id
      ),
      'badges_earned', (
        SELECT COUNT(*) FROM public.user_badges WHERE user_id = p_user_id
      ),
      'recent_rewards', (
        SELECT COALESCE(jsonb_agg(
          jsonb_build_object(
            'id', r.id,
            'points', r.points,
            'entry_type', r.entry_type,
            'description', r.description,
            'business_name', b.name,
            'created_at', r.created_at
          ) ORDER BY r.created_at DESC
        ), '[]'::jsonb)
        FROM (
          SELECT * FROM public.rewards WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 10
        ) r
        LEFT JOIN public.businesses b ON b.id = r.business_id
      )
    )
    FROM public.end_user_profiles eup
    WHERE eup.id = p_user_id
  );
END;
$$;
```

#### 3.4.9 `get_admin_dashboard_stats()`

```sql
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Admin check
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN jsonb_build_object(
    'total_end_users', (SELECT COUNT(*) FROM public.profiles WHERE role = 'end_user'),
    'total_paid_users', (SELECT COUNT(*) FROM public.end_user_profiles WHERE subscription_plan = 'paid' AND subscription_status = 'active'),
    'total_free_users', (SELECT COUNT(*) FROM public.end_user_profiles WHERE subscription_plan = 'free'),
    'total_businesses', (SELECT COUNT(*) FROM public.businesses),
    'active_businesses', (SELECT COUNT(*) FROM public.businesses WHERE is_active = true AND subscription_status = 'active'),
    'total_transactions', (SELECT COUNT(*) FROM public.transactions),
    'total_revenue_processed', (SELECT COALESCE(SUM(amount_spent), 0) FROM public.transactions),
    'cards_pending', (SELECT COUNT(*) FROM public.membership_cards WHERE status = 'pending_production'),
    'cards_shipped', (SELECT COUNT(*) FROM public.membership_cards WHERE status = 'shipped'),
    'cards_active', (SELECT COUNT(*) FROM public.membership_cards WHERE status = 'active'),
    'open_tickets', (SELECT COUNT(*) FROM public.support_tickets WHERE status IN ('open', 'in_progress')),
    'users_today', (SELECT COUNT(*) FROM public.profiles WHERE created_at >= CURRENT_DATE),
    'transactions_today', (SELECT COUNT(*) FROM public.transactions WHERE created_at >= CURRENT_DATE)
  );
END;
$$;
```

#### 3.4.10 `create_membership_card(p_user_id uuid)`

Creates a membership card record after paid subscription is activated.

```sql
CREATE OR REPLACE FUNCTION public.create_membership_card(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_public_id text;
  v_card_id uuid;
  v_eup record;
BEGIN
  -- Get public user ID
  SELECT public_user_id INTO v_public_id
  FROM public.profiles WHERE id = p_user_id;

  IF v_public_id IS NULL THEN
    RAISE EXCEPTION 'User has no public ID';
  END IF;

  -- Get shipping address from end_user_profiles
  SELECT * INTO v_eup
  FROM public.end_user_profiles WHERE id = p_user_id;

  -- Create card
  INSERT INTO public.membership_cards (
    user_id, card_number, status,
    shipping_address_line1, shipping_address_line2,
    shipping_city, shipping_postal_code,
    shipping_region, shipping_country
  ) VALUES (
    p_user_id, v_public_id, 'pending_production',
    v_eup.shipping_address_line1, v_eup.shipping_address_line2,
    v_eup.shipping_city, v_eup.shipping_postal_code,
    v_eup.shipping_region, v_eup.shipping_country
  ) RETURNING id INTO v_card_id;

  -- Notify user
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
```

#### 3.4.11 `generate_business_slug(p_name text)`

Generates a URL-safe slug from a business name.

```sql
CREATE OR REPLACE FUNCTION public.generate_business_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  final_slug := base_slug;

  WHILE EXISTS (SELECT 1 FROM public.businesses WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  RETURN final_slug;
END;
$$;
```

---

### 3.5 Database Triggers

#### 3.5.1 Auto-update `updated_at` columns

```sql
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.end_user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.membership_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

#### 3.5.2 Auto-expire offers

Run via `pg_cron` daily at 00:05:

```sql
SELECT cron.schedule(
  'expire-offers',
  '5 0 * * *',
  $$
    UPDATE public.offers
    SET status = 'expired', updated_at = now()
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < now();
  $$
);
```

#### 3.5.3 Auto-expire subscriptions

Run via `pg_cron` daily at 00:10:

```sql
SELECT cron.schedule(
  'expire-subscriptions',
  '10 0 * * *',
  $$
    -- Expire end-user subscriptions
    UPDATE public.end_user_profiles
    SET subscription_status = 'expired',
        subscription_plan = 'free',
        updated_at = now()
    WHERE subscription_status IN ('cancelled', 'past_due')
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < now();

    -- Disable cards of expired users
    UPDATE public.membership_cards
    SET status = 'disabled', disabled_at = now(), updated_at = now()
    WHERE user_id IN (
      SELECT id FROM public.end_user_profiles
      WHERE subscription_status = 'expired' AND subscription_plan = 'free'
    )
    AND status = 'active';

    -- Deactivate expired businesses
    UPDATE public.businesses
    SET is_active = false, subscription_status = 'expired', updated_at = now()
    WHERE subscription_status IN ('cancelled', 'past_due')
    AND subscription_ends_at IS NOT NULL
    AND subscription_ends_at < now();

    -- Pause offers of expired businesses
    UPDATE public.offers
    SET status = 'paused', updated_at = now()
    WHERE business_id IN (
      SELECT id FROM public.businesses WHERE subscription_status = 'expired'
    )
    AND status = 'active';
  $$
);
```

---

### 3.6 Database Views

#### 3.6.1 `v_active_marketplace_businesses`

```sql
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
  (SELECT COUNT(*) FROM public.offers o
   WHERE o.business_id = b.id AND o.status = 'active'
   AND o.starts_at <= now()
   AND (o.expires_at IS NULL OR o.expires_at > now())) AS active_offers_count
FROM public.businesses b
LEFT JOIN public.business_categories bc ON bc.id = b.category_id
WHERE b.is_active = true
  AND b.is_verified = true
  AND b.subscription_status = 'active';
```

---

### 3.7 Storage Buckets

| Bucket Name      | Public | Purpose                         |
| ---------------- | ------ | ------------------------------- |
| `avatars`        | Yes    | User profile images             |
| `business-media` | Yes    | Business profile & cover images |
| `offer-media`    | Yes    | Offer images                    |
| `badge-icons`    | Yes    | Badge icon images               |

#### Storage Policies

##### `avatars`

```sql
-- Public read
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- Users can upload to their own folder: avatars/{user_id}/*
CREATE POLICY avatars_upload_own ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update/delete their own files
CREATE POLICY avatars_manage_own ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY avatars_delete_own ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

##### `business-media`

```sql
-- Public read
CREATE POLICY biz_media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'business-media');

-- Business owner can upload: business-media/{business_id}/*
CREATE POLICY biz_media_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
  );

-- Business owner can manage
CREATE POLICY biz_media_manage ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
  );

CREATE POLICY biz_media_delete ON storage.objects
  FOR DELETE USING (
    bucket_id = 'business-media'
    AND EXISTS (
      SELECT 1 FROM public.businesses
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
  );
```

##### `offer-media`

```sql
-- Public read
CREATE POLICY offer_media_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'offer-media');

-- Business staff can upload: offer-media/{business_id}/*
CREATE POLICY offer_media_upload ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'offer-media'
    AND EXISTS (
      SELECT 1 FROM public.business_staff
      WHERE business_id::text = (storage.foldername(name))[1]
      AND user_id = auth.uid()
      AND is_active = true
    )
  );
```

##### `badge-icons`

```sql
-- Public read
CREATE POLICY badge_icons_read ON storage.objects
  FOR SELECT USING (bucket_id = 'badge-icons');

-- Admin only write
CREATE POLICY badge_icons_admin ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'badge-icons'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### 3.8 Edge Functions

All Edge Functions are written in TypeScript (Deno) and deployed via `supabase functions deploy`.

#### 3.8.1 `create-checkout`

Creates a Lemon Squeezy checkout session and returns the checkout URL.

```typescript
// supabase/functions/create-checkout/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LEMON_SQUEEZY_API_KEY = Deno.env.get("LEMON_SQUEEZY_API_KEY")!;
const LEMON_SQUEEZY_STORE_ID = Deno.env.get("LEMON_SQUEEZY_STORE_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CheckoutRequest {
	variant_id: string; // Lemon Squeezy variant ID
	plan_type: "end_user" | "business";
	redirect_url: string; // Where to redirect after success
	user_email: string;
	user_name: string;
	custom_data: Record<string, string>; // e.g. { user_id, business_id }
}

serve(async (req) => {
	// CORS
	if (req.method === "OPTIONS") {
		return new Response(null, {
			headers: {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers":
					"authorization, content-type, x-client-info, apikey",
			},
		});
	}

	try {
		// Validate auth
		const authHeader = req.headers.get("Authorization")!;
		const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
		const token = authHeader.replace("Bearer ", "");
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser(token);
		if (authError || !user) throw new Error("Unauthorized");

		const body: CheckoutRequest = await req.json();

		// Create Lemon Squeezy checkout
		const response = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
			method: "POST",
			headers: {
				Accept: "application/vnd.api+json",
				"Content-Type": "application/vnd.api+json",
				Authorization: `Bearer ${LEMON_SQUEEZY_API_KEY}`,
			},
			body: JSON.stringify({
				data: {
					type: "checkouts",
					attributes: {
						checkout_data: {
							email: body.user_email,
							name: body.user_name,
							custom: {
								user_id: user.id,
								plan_type: body.plan_type,
								...body.custom_data,
							},
						},
						product_options: {
							redirect_url: body.redirect_url,
						},
					},
					relationships: {
						store: { data: { type: "stores", id: LEMON_SQUEEZY_STORE_ID } },
						variant: { data: { type: "variants", id: body.variant_id } },
					},
				},
			}),
		});

		const lsData = await response.json();
		const checkoutUrl = lsData.data.attributes.url;

		return new Response(JSON.stringify({ checkout_url: checkoutUrl }), {
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 400,
			headers: {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": "*",
			},
		});
	}
});
```

#### 3.8.2 `lemon-squeezy-webhook`

Handles all Lemon Squeezy webhook events.

```typescript
// supabase/functions/lemon-squeezy-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const WEBHOOK_SECRET = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function verifySignature(
	payload: string,
	signature: string,
): Promise<boolean> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(WEBHOOK_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
	const digest = Array.from(new Uint8Array(sig))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return digest === signature;
}

serve(async (req) => {
	const rawBody = await req.text();
	const signature = req.headers.get("x-signature") || "";

	// Verify webhook signature
	const isValid = await verifySignature(rawBody, signature);
	if (!isValid) {
		return new Response("Invalid signature", { status: 401 });
	}

	const event = JSON.parse(rawBody);
	const eventName = event.meta.event_name;
	const customData = event.meta.custom_data || {};
	const attrs = event.data.attributes;

	const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

	try {
		switch (eventName) {
			// ── SUBSCRIPTION CREATED ──
			case "subscription_created": {
				const userId = customData.user_id;
				const planType = customData.plan_type;
				const lsCustomerId = String(attrs.customer_id);
				const lsSubscriptionId = String(event.data.id);
				const endsAt = attrs.renews_at; // next billing date

				if (planType === "end_user") {
					await supabase
						.from("end_user_profiles")
						.update({
							subscription_plan: "paid",
							subscription_status: "active",
							lemon_squeezy_customer_id: lsCustomerId,
							lemon_squeezy_subscription_id: lsSubscriptionId,
							subscription_started_at: new Date().toISOString(),
							subscription_ends_at: endsAt,
						})
						.eq("id", userId);

					// Create membership card
					await supabase.rpc("create_membership_card", { p_user_id: userId });
				} else if (planType === "business") {
					const businessId = customData.business_id;
					await supabase
						.from("businesses")
						.update({
							subscription_status: "active",
							is_active: true,
							one_time_fee_paid: true,
							lemon_squeezy_customer_id: lsCustomerId,
							lemon_squeezy_subscription_id: lsSubscriptionId,
							subscription_started_at: new Date().toISOString(),
							subscription_ends_at: endsAt,
						})
						.eq("id", businessId);
				}
				break;
			}

			// ── SUBSCRIPTION UPDATED ──
			case "subscription_updated": {
				const status = attrs.status; // active, past_due, paused, cancelled, expired
				const endsAt = attrs.ends_at || attrs.renews_at;
				const lsSubscriptionId = String(event.data.id);

				// Try end_user first
				const { data: eup } = await supabase
					.from("end_user_profiles")
					.select("id")
					.eq("lemon_squeezy_subscription_id", lsSubscriptionId)
					.single();

				if (eup) {
					const mappedStatus = mapLsStatus(status);
					await supabase
						.from("end_user_profiles")
						.update({
							subscription_status: mappedStatus,
							subscription_ends_at: endsAt,
							...(mappedStatus === "cancelled" || mappedStatus === "expired"
								? { subscription_plan: "free" }
								: {}),
						})
						.eq("id", eup.id);
				} else {
					// Try business
					const { data: biz } = await supabase
						.from("businesses")
						.select("id")
						.eq("lemon_squeezy_subscription_id", lsSubscriptionId)
						.single();

					if (biz) {
						const mappedStatus = mapLsStatus(status);
						await supabase
							.from("businesses")
							.update({
								subscription_status: mappedStatus,
								subscription_ends_at: endsAt,
								...(mappedStatus === "expired" ? { is_active: false } : {}),
							})
							.eq("id", biz.id);
					}
				}
				break;
			}

			// ── SUBSCRIPTION PAYMENT SUCCESS ──
			case "subscription_payment_success": {
				// Renewal successful — ensure status is active
				const lsSubscriptionId = String(attrs.subscription_id);
				const endsAt = attrs.renews_at;

				await supabase
					.from("end_user_profiles")
					.update({
						subscription_status: "active",
						subscription_ends_at: endsAt,
					})
					.eq("lemon_squeezy_subscription_id", String(lsSubscriptionId));

				await supabase
					.from("businesses")
					.update({
						subscription_status: "active",
						subscription_ends_at: endsAt,
					})
					.eq("lemon_squeezy_subscription_id", String(lsSubscriptionId));

				break;
			}

			// ── SUBSCRIPTION PAYMENT FAILED ──
			case "subscription_payment_failed": {
				const lsSubscriptionId = String(attrs.subscription_id);
				await supabase
					.from("end_user_profiles")
					.update({
						subscription_status: "past_due",
					})
					.eq("lemon_squeezy_subscription_id", String(lsSubscriptionId));

				await supabase
					.from("businesses")
					.update({
						subscription_status: "past_due",
					})
					.eq("lemon_squeezy_subscription_id", String(lsSubscriptionId));
				break;
			}

			default:
				console.log(`Unhandled event: ${eventName}`);
		}
	} catch (error) {
		console.error("Webhook processing error:", error);
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}

	return new Response(JSON.stringify({ received: true }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
});

function mapLsStatus(lsStatus: string): string {
	const mapping: Record<string, string> = {
		active: "active",
		past_due: "past_due",
		paused: "paused",
		cancelled: "cancelled",
		expired: "expired",
		unpaid: "past_due",
	};
	return mapping[lsStatus] || "active";
}
```

---

### 3.9 Realtime Subscriptions

Enable Realtime on these tables for live UI updates:

| Table                     | Events | Use Case                                 |
| ------------------------- | ------ | ---------------------------------------- |
| `notifications`           | INSERT | Live notification badges in all apps     |
| `membership_cards`        | UPDATE | Card status live updates in end-user app |
| `support_ticket_messages` | INSERT | Live chat in support tickets             |

Configure in Supabase Dashboard → Realtime → Publication → Enable for specified tables.

---

## 4. Lemon Squeezy Payment Integration

### 4.1 Products to Create in Lemon Squeezy

| Product                 | Type                   | Price    | Setup Fee | Variant ID Reference |
| ----------------------- | ---------------------- | -------- | --------- | -------------------- |
| User Premium Membership | Subscription (monthly) | €2.00/mo | €0        | `VARIANT_USER_PAID`  |
| Business Membership     | Subscription (monthly) | €3.50/mo | €30.00    | `VARIANT_BUSINESS`   |

> **Note:** Lemon Squeezy supports native setup fees on subscription products. Configure the $€30$ one-time fee as the setup fee for the Business Membership product.

### 4.2 Webhook Configuration

In Lemon Squeezy dashboard → Settings → Webhooks:

| Setting | Value                                                                                                         |
| ------- | ------------------------------------------------------------------------------------------------------------- |
| URL     | `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/lemon-squeezy-webhook`                               |
| Secret  | A strong random string (store in Edge Function env)                                                           |
| Events  | `subscription_created`, `subscription_updated`, `subscription_payment_success`, `subscription_payment_failed` |

### 4.3 End-User Checkout Flow

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  User selects    │     │  Frontend calls   │     │  Edge Function   │
│  "Upgrade to     │────▶│  create-checkout  │────▶│  calls LS API    │
│   Paid Plan"     │     │  Edge Function    │     │  returns URL     │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                              ┌─────────────────────────────┘
                              ▼
                   ┌──────────────────┐     ┌──────────────────┐
                   │  User redirected │     │  Lemon Squeezy   │
                   │  to LS checkout  │────▶│  processes       │
                   │  page            │     │  payment         │
                   └──────────────────┘     └────────┬─────────┘
                                                     │
              ┌──────────────────────────────────────┘
              ▼                               ▼
   ┌──────────────────┐           ┌──────────────────┐
   │  User redirected │           │  Webhook fires   │
   │  back to app     │           │  to Edge Function │
   │  success URL     │           │  → updates DB     │
   └──────────────────┘           │  → creates card   │
                                  └──────────────────┘
```

**Key: Custom Data in Checkout**

When creating a checkout, include:

```json
{
	"user_id": "uuid-of-user",
	"plan_type": "end_user"
}
```

For businesses:

```json
{
	"user_id": "uuid-of-business-owner",
	"plan_type": "business",
	"business_id": "uuid-of-business"
}
```

### 4.4 Subscription Status Mapping

| Lemon Squeezy Status | Platform Status | End-User Impact                         | Business Impact                   |
| -------------------- | --------------- | --------------------------------------- | --------------------------------- |
| `active`             | `active`        | Full access                             | Full access                       |
| `past_due`           | `past_due`      | Warning shown, access continues briefly | Warning shown                     |
| `paused`             | `paused`        | Downgraded to free                      | Offers paused                     |
| `cancelled`          | `cancelled`     | Access until `ends_at`, then free       | Access until `ends_at`            |
| `expired`            | `expired`       | Free plan, card disabled                | Inactive, hidden from marketplace |

### 4.5 Subscription Management Portal

Lemon Squeezy provides a **Customer Portal URL** per subscription. Use this to let users manage billing:

```typescript
// Get customer portal URL
const portalUrl = `https://app.lemonsqueezy.com/my-orders`;
// Or use the subscription's `urls.customer_portal` from creation response
```

Store the `customer_portal_url` from the `subscription_created` webhook response and link it in the settings pages of both user and business apps.

---

## 5. End-User Application — `app.domain.com`

### 5.1 Complete Route Map

| Route                           | Auth Required | Plan   | Component                  | Description                                 |
| ------------------------------- | ------------- | ------ | -------------------------- | ------------------------------------------- |
| `/`                             | No            | Any    | `LandingPage`              | Marketing landing, signup CTA               |
| `/auth/login`                   | No            | Any    | `LoginPage`                | Email/password + Google OAuth               |
| `/auth/register`                | No            | Any    | `RegisterPage`             | Create account (sets role as end_user)      |
| `/auth/forgot-password`         | No            | Any    | `ForgotPasswordPage`       | Request password reset                      |
| `/auth/reset-password`          | No            | Any    | `ResetPasswordPage`        | Set new password                            |
| `/auth/callback`                | No            | Any    | `AuthCallback`             | Handles OAuth redirect + email confirmation |
| `/onboarding`                   | Yes           | Any    | `OnboardingLayout`         | Multi-step onboarding wrapper               |
| `/onboarding/personal-info`     | Yes           | Any    | `PersonalInfoStep`         | Name, phone, DOB                            |
| `/onboarding/plan-selection`    | Yes           | Any    | `PlanSelectionStep`        | Free vs Paid                                |
| `/onboarding/shipping`          | Yes           | (Paid) | `ShippingStep`             | Card delivery address                       |
| `/onboarding/payment`           | Yes           | (Paid) | `PaymentStep`              | Redirect to Lemon Squeezy                   |
| `/onboarding/complete`          | Yes           | Any    | `OnboardingComplete`       | Welcome + next steps                        |
| `/dashboard`                    | Yes           | Any    | `DashboardPage`            | Home after login                            |
| `/marketplace`                  | Yes           | Any    | `MarketplacePage`          | Browse offers                               |
| `/marketplace/offers/:offerId`  | Yes           | Any    | `OfferDetailPage`          | Single offer view                           |
| `/marketplace/businesses`       | Yes           | Paid   | `BusinessListPage`         | Browse all businesses                       |
| `/marketplace/businesses/:slug` | Yes           | Any    | `BusinessProfilePage`      | Public business profile                     |
| `/marketplace/categories/:slug` | Yes           | Paid   | `CategoryPage`             | Filter by category                          |
| `/rewards`                      | Yes           | Any    | `RewardsPage`              | Points overview + history                   |
| `/badges`                       | Yes           | Paid   | `BadgesPage`               | Badge collection                            |
| `/card`                         | Yes           | Yes    | `CardPage`                 | Digital + physical card                     |
| `/profile`                      | Yes           | Any    | `ProfilePage`              | User profile view                           |
| `/profile/edit`                 | Yes           | Any    | `ProfileEditPage`          | Edit profile info                           |
| `/settings`                     | Yes           | Any    | `SettingsPage`             | Account settings hub                        |
| `/settings/subscription`        | Yes           | Any    | `SubscriptionSettingsPage` | Manage plan                                 |
| `/support`                      | Yes           | Any    | `SupportPage`              | Support hub                                 |
| `/support/new`                  | Yes           | Any    | `NewTicketPage`            | Create ticket                               |
| `/support/tickets/:ticketId`    | Yes           | Any    | `TicketDetailPage`         | View/reply to ticket                        |

### 5.2 Authentication Flow

```
                  ┌──────────────┐
                  │   /auth/     │
                  │   register   │
                  └──────┬───────┘
                         │ supabase.auth.signUp({
                         │   email, password,
                         │   options: {
                         │     data: { role: 'end_user', first_name, last_name },
                         │     emailRedirectTo: 'https://app.domain.com/auth/callback'
                         │   }
                         │ })
                         ▼
                  ┌──────────────┐
                  │ Confirmation │
                  │ email sent   │
                  └──────┬───────┘
                         │ User clicks link
                         ▼
                  ┌──────────────┐
                  │ /auth/       │  ← Supabase sets session
                  │ callback     │
                  └──────┬───────┘
                         │ Check: onboarding_completed?
                         │
              ┌──────────┴──────────┐
              │ No                  │ Yes
              ▼                     ▼
     ┌──────────────┐     ┌──────────────┐
     │ /onboarding  │     │ /dashboard   │
     └──────────────┘     └──────────────┘
```

**Google OAuth Note:** During Google OAuth signup, we cannot send `role` in metadata pre-signup. Instead, on the `app.domain.com` callback, check if a `profiles` row exists. If not, create one via an RPC function that detects the calling app domain or receives metadata.

> **Recommended approach:** After Google OAuth on `app.domain.com`, the callback page calls an RPC `ensure_end_user_profile()` that creates the profile + end_user_profiles record if missing.

```sql
CREATE OR REPLACE FUNCTION public.ensure_end_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If profile doesn't exist yet (Google OAuth first login)
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) THEN
    INSERT INTO public.profiles (id, role, email, first_name, last_name, public_user_id)
    SELECT
      auth.uid(),
      'end_user',
      (SELECT email FROM auth.users WHERE id = auth.uid()),
      COALESCE((SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = auth.uid()), ''),
      '',
      public.generate_unique_public_id();

    INSERT INTO public.end_user_profiles (id)
    VALUES (auth.uid());
  END IF;
END;
$$;
```

### 5.3 Onboarding Flow (End User)

This is a multi-step wizard. The user cannot access the dashboard until onboarding is complete.

```
Step 1: Personal Info           Step 2: Plan Selection
┌──────────────────────┐       ┌──────────────────────┐
│ - First Name         │       │ ┌──────────────────┐ │
│ - Last Name          │       │ │   FREE PLAN      │ │
│ - Phone              │  ──▶  │ │ • 3 offers max   │ │
│ - Date of Birth      │       │ │ • No card        │ │
│                      │       │ │ • Basic access   │ │
│ [Continue]           │       │ └──────────────────┘ │
└──────────────────────┘       │ ┌──────────────────┐ │
                               │ │   PAID - €2/mo   │ │
                               │ │ • Unlimited offers│ │
                               │ │ • Physical card  │ │
                               │ │ • Badges         │ │
                               │ │ • Full access    │ │
                               │ └──────────────────┘ │
                               │ [Select]             │
                               └──────────┬───────────┘
                                   │            │
                       (Free)      │            │  (Paid)
                          ▼                     ▼
               ┌──────────────┐      ┌──────────────────────┐
               │   Complete   │      │  Step 3: Shipping    │
               │   Onboarding │      │  - Address Line 1    │
               │              │      │  - Address Line 2    │
               │  ──▶ /dash   │      │  - City              │
               └──────────────┘      │  - Postal Code       │
                                     │  - Region            │
                                     │  [Continue]          │
                                     └──────────┬───────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │  Step 4: Payment     │
                                     │  Redirect to Lemon   │
                                     │  Squeezy checkout    │
                                     └──────────┬───────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │  Step 5: Complete    │
                                     │  "Welcome! Card is   │
                                     │   being prepared."   │
                                     │  ──▶ /dashboard      │
                                     └──────────────────────┘
```

**Database operations per step:**

| Step                      | Actions                                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Personal Info         | `UPDATE profiles SET first_name, last_name, phone`; `UPDATE end_user_profiles SET date_of_birth`                                                |
| 2 — Plan Selection (Free) | `UPDATE end_user_profiles SET subscription_plan = 'free', onboarding_completed = true`                                                          |
| 2 — Plan Selection (Paid) | Store selection in local state, proceed to step 3                                                                                               |
| 3 — Shipping              | `UPDATE end_user_profiles SET shipping_address_*`                                                                                               |
| 4 — Payment               | Call `create-checkout` Edge Function → redirect to LS                                                                                           |
| 5 — Complete              | Polled by frontend: check `end_user_profiles.subscription_status = 'active'`; if so, `UPDATE end_user_profiles SET onboarding_completed = true` |

### 5.4 Dashboard Page

The end-user dashboard is the home screen after login. Contents:

| Section              | Data Source                                 | Description                                   |
| -------------------- | ------------------------------------------- | --------------------------------------------- |
| Welcome Header       | `profiles.first_name`                       | "Welcome back, {name}!"                       |
| Quick Stats          | `get_user_rewards_summary()`                | Points, transactions, businesses visited      |
| Digital Card Preview | `profiles.public_user_id`                   | Mini card with QR code — tap to go to `/card` |
| Card Status (paid)   | `membership_cards.status`                   | Shipping status indicator                     |
| Recent Rewards       | `get_user_rewards_summary().recent_rewards` | Last 5 reward entries                         |
| Featured Offers      | `get_marketplace_offers(limit: 3)`          | Up to 3 featured offers                       |
| Recent Badges        | `user_badges JOIN badges`                   | Last earned badges                            |
| Upgrade CTA (free)   | —                                           | Banner prompting free users to upgrade        |

### 5.5 Marketplace Pages

#### Marketplace Main (`/marketplace`)

- **Free users:** Grid of up to 3 offer cards. No search bar, no category tabs, no pagination. Prominent "Upgrade for full access" banner.
- **Paid users:** Full search bar + category filter tabs + grid of offers with infinite scroll / pagination.

**Offer Card Component:**

```
┌─────────────────────────────┐
│  [Offer Image]              │
│                             │
│  Business Logo + Name       │
│  Offer Title                │
│  "15% off all items"        │
│  Category Tag    Exp: 30 Dec│
│  ♡ Favorite                 │
└─────────────────────────────┘
```

**Data Fetching:**

```typescript
const { data } = await supabase.rpc("get_marketplace_offers", {
	p_user_id: user.id,
	p_category_slug: selectedCategory || null,
	p_search: searchTerm || null,
	p_limit: 20,
	p_offset: page * 20,
});
```

#### Offer Detail (`/marketplace/offers/:offerId`)

- Full offer image
- Business name + logo (link to business profile)
- Offer title + description
- Offer type + discount value
- Terms & conditions
- Expiry date
- "This offer requires a paid membership" badge (if applicable)
- Favourite button

**Data Fetching:**

```typescript
const { data: offer } = await supabase
	.from("offers")
	.select(
		`
    *,
    businesses (
      id, name, slug, profile_image_url, city,
      business_categories ( name, icon )
    )
  `,
	)
	.eq("id", offerId)
	.single();
```

#### Business Profile (`/marketplace/businesses/:slug`)

- Cover image
- Profile image + business name
- Category badge
- Description
- Address + map link
- Operating hours
- Contact info (phone, email, website, socials)
- Active offers list
- Favourite button

**Data Fetching:**

```typescript
const { data: business } = await supabase
	.from("businesses")
	.select(
		`
    *,
    business_categories ( name, slug, icon ),
    offers ( * )
  `,
	)
	.eq("slug", slug)
	.eq("is_active", true)
	.eq("offers.status", "active")
	.single();
```

### 5.6 Rewards Page (`/rewards`)

| Section           | Content                              |
| ----------------- | ------------------------------------ |
| Total Points      | Large number display                 |
| Points Breakdown  | Per-business summary                 |
| Activity Timeline | Chronological list of reward entries |

### 5.7 Badges Page (`/badges`)

Grid of all available badges. Each badge shows:

- Icon
- Name
- Description
- Status: Earned (with date) or Locked (with progress hint)

```typescript
// Fetch all badges with user's earned status
const { data: allBadges } = await supabase
	.from("badges")
	.select("*")
	.eq("is_active", true)
	.order("display_order");

const { data: userBadges } = await supabase
	.from("user_badges")
	.select("badge_id, earned_at")
	.eq("user_id", user.id);

// Merge in frontend
const badgesWithStatus = allBadges.map((badge) => ({
	...badge,
	earned: userBadges.find((ub) => ub.badge_id === badge.id) || null,
}));
```

### 5.8 Card Page (`/card`)

**For Paid Users:**

```
┌─────────────────────────────────────────┐
│         DIGITAL MEMBERSHIP CARD          │
│                                          │
│   ┌──────────────────────────────────┐   │
│   │   [Platform Logo]                │   │
│   │                                  │   │
│   │   John Doe                       │   │
│   │   Member ID: 482 736 915         │   │
│   │                                  │   │
│   │   ┌────────┐   ||||||||||||||||  │   │
│   │   │ QR Code│                     │   │
│   │   │        │   PREMIUM MEMBER    │   │
│   │   └────────┘                     │   │
│   └──────────────────────────────────┘   │
│                                          │
│   Physical Card Status                   │
│   ━━━━━━━○━━━━━━━━━━━━━━━━━              │
│   Pending  Printed  Shipped  Active      │
│                                          │
│   Tracking: GR1234567890                 │
└─────────────────────────────────────────┘
```

**For Free Users:**

- Show a basic digital card with their public_user_id and QR code
- Prominent "Upgrade to get your physical card" CTA

**QR Code Generation (Frontend):**

```tsx
import QRCode from 'qrcode.react';
import Barcode from 'react-barcode';

<QRCode value={profile.public_user_id} size={160} />
<Barcode value={profile.public_user_id} format="CODE128" />
```

### 5.9 Profile & Settings

#### Profile Page (`/profile`)

- Avatar (uploadable to `avatars/{user_id}/avatar.jpg`)
- Name, email, phone, DOB
- Public User ID (read-only, copyable)
- Member since date

#### Settings Page (`/settings`)

- Edit profile link
- Subscription management
  - Current plan display
  - Upgrade/downgrade button
  - Link to Lemon Squeezy Customer Portal for billing
- Notification preferences (future)
- Change password
- Delete account request

### 5.10 Route Guards

```typescript
// src/components/guards/AuthGuard.tsx
function AuthGuard({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const { profile } = useProfile();

	if (loading) return <LoadingSpinner />;
	if (!user) return <Navigate to="/auth/login" />;

	// Ensure this is an end_user
	if (profile && profile.role !== "end_user") {
		return <Navigate to="/auth/login" />;
	}

	return <>{children}</>;
}

// src/components/guards/OnboardingGuard.tsx
function OnboardingGuard({ children }: { children: React.ReactNode }) {
	const { endUserProfile } = useEndUserProfile();

	if (endUserProfile && !endUserProfile.onboarding_completed) {
		return <Navigate to="/onboarding" />;
	}

	return <>{children}</>;
}

// src/components/guards/PaidGuard.tsx
function PaidGuard({
	children,
	fallback,
}: {
	children: React.ReactNode;
	fallback?: React.ReactNode;
}) {
	const { endUserProfile } = useEndUserProfile();

	if (endUserProfile?.subscription_plan !== "paid") {
		return fallback || <UpgradePrompt />;
	}

	return <>{children}</>;
}
```

---

## 6. Business Application — `client.domain.com`

### 6.1 Complete Route Map

| Route                           | Auth Required | Component                 | Description                     |
| ------------------------------- | ------------- | ------------------------- | ------------------------------- |
| `/`                             | No            | `BusinessLandingPage`     | Marketing page, CTA to register |
| `/auth/login`                   | No            | `LoginPage`               | Business login                  |
| `/auth/register`                | No            | `RegisterPage`            | Business account creation       |
| `/auth/forgot-password`         | No            | `ForgotPasswordPage`      | Password reset request          |
| `/auth/reset-password`          | No            | `ResetPasswordPage`       | Set new password                |
| `/auth/callback`                | No            | `AuthCallback`            | OAuth/email callback            |
| `/onboarding`                   | Yes           | `OnboardingLayout`        | Multi-step business setup       |
| `/onboarding/business-info`     | Yes           | `BusinessInfoStep`        | Name + description              |
| `/onboarding/category`          | Yes           | `CategoryStep`            | Select business category        |
| `/onboarding/location`          | Yes           | `LocationStep`            | Address + coordinates           |
| `/onboarding/contact`           | Yes           | `ContactStep`             | Phone, email, website, socials  |
| `/onboarding/media`             | Yes           | `MediaStep`               | Upload profile + cover images   |
| `/onboarding/review`            | Yes           | `ReviewStep`              | Review all info                 |
| `/onboarding/payment`           | Yes           | `PaymentStep`             | Redirect to Lemon Squeezy       |
| `/onboarding/complete`          | Yes           | `OnboardingComplete`      | Welcome to dashboard            |
| `/dashboard`                    | Yes           | `DashboardPage`           | Business overview               |
| `/offers`                       | Yes           | `OffersListPage`          | Manage all offers               |
| `/offers/create`                | Yes           | `CreateOfferPage`         | Create new offer                |
| `/offers/:offerId`              | Yes           | `OfferDetailPage`         | View offer details              |
| `/offers/:offerId/edit`         | Yes           | `EditOfferPage`           | Edit existing offer             |
| `/customers`                    | Yes           | `CustomersPage`           | Customer interaction hub        |
| `/customers/identify`           | Yes           | `IdentifyCustomerPage`    | Scan QR / barcode / manual      |
| `/customers/identify/:publicId` | Yes           | `CustomerFoundPage`       | Display found customer          |
| `/customers/record-transaction` | Yes           | `RecordTransactionPage`   | Enter amount + confirm          |
| `/customers/history`            | Yes           | `TransactionHistoryPage`  | All transactions list           |
| `/profile`                      | Yes           | `BusinessProfilePage`     | View/edit business profile      |
| `/profile/edit`                 | Yes           | `EditBusinessProfilePage` | Edit business info              |
| `/profile/preview`              | Yes           | `PreviewProfilePage`      | See public profile              |
| `/settings`                     | Yes           | `SettingsPage`            | Business settings               |
| `/settings/subscription`        | Yes           | `SubscriptionPage`        | Manage subscription             |
| `/support`                      | Yes           | `SupportPage`             | Support hub                     |
| `/support/new`                  | Yes           | `NewTicketPage`           | Create ticket                   |
| `/support/tickets/:ticketId`    | Yes           | `TicketDetailPage`        | Ticket detail                   |

### 6.2 Authentication Flow

Identical to end-user auth, except:

- Register uses `role: 'business'` in metadata
- Auth guard checks `profile.role === 'business'`

```typescript
// On register:
const { data, error } = await supabase.auth.signUp({
	email,
	password,
	options: {
		data: { role: "business", first_name, last_name },
		emailRedirectTo: "https://client.domain.com/auth/callback",
	},
});
```

### 6.3 Onboarding Flow (Business)

```
Step 1: Business Info        Step 2: Category          Step 3: Location
┌──────────────────┐        ┌──────────────────┐      ┌──────────────────┐
│ Business Name    │   ──▶  │ Select Category  │ ──▶  │ Address Line 1   │
│ Description      │        │ ☐ Food & Dining  │      │ Address Line 2   │
│                  │        │ ☐ Beauty         │      │ City             │
│ [Continue]       │        │ ☐ Clothing       │      │ Postal Code      │
└──────────────────┘        │ ☐ Health         │      │ Region           │
                            │ ☐ Entertainment  │      │ [Pin on Map]     │
                            │ ☐ Retail         │      │ [Continue]       │
                            │ ☐ Services       │      └─────────┬────────┘
                            │ ☐ Other          │                │
                            │ [Continue]       │                ▼
                            └──────────────────┘
                                                      Step 4: Contact
                                                      ┌──────────────────┐
Step 6: Review              Step 5: Media              │ Phone            │
┌──────────────────┐        ┌──────────────────┐      │ Email            │
│ Review all data  │   ◀──  │ Profile Image    │ ◀──  │ Website          │
│                  │        │ [Upload]         │      │ Facebook URL     │
│ [Confirm &       │        │                  │      │ Instagram URL    │
│  Proceed to Pay] │        │ Cover Image      │      │ [Continue]       │
└────────┬─────────┘        │ [Upload]         │      └──────────────────┘
         │                  │ [Continue]       │
         ▼                  └──────────────────┘
Step 7: Payment
┌──────────────────┐        Step 8: Complete
│ Redirect to      │        ┌──────────────────┐
│ Lemon Squeezy    │   ──▶  │ "Your business   │
│ €30 + €3.50/mo   │        │  is now live!"   │
└──────────────────┘        │ ──▶ /dashboard   │
                            └──────────────────┘
```

**Database operations per step:**

| Step              | Actions                                                                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1 — Business Info | `INSERT businesses (owner_id, name, slug, description)` + `INSERT business_staff (business_id, user_id, staff_role: 'owner')` |
| 2 — Category      | `UPDATE businesses SET category_id`                                                                                           |
| 3 — Location      | `UPDATE businesses SET address_*, latitude, longitude`                                                                        |
| 4 — Contact       | `UPDATE businesses SET phone, email, website, social_*`                                                                       |
| 5 — Media         | Upload to `business-media/{business_id}/` → `UPDATE businesses SET profile_image_url, cover_image_url`                        |
| 6 — Review        | No DB changes, display summary                                                                                                |
| 7 — Payment       | Call `create-checkout` Edge Function with `plan_type: 'business'`, `business_id`                                              |
| 8 — Complete      | Polled: check `businesses.subscription_status = 'active'`; then `UPDATE businesses SET onboarding_completed = true`           |

### 6.4 Dashboard Page

| Section                | Data Source                                      | Description                                                   |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------- |
| Business Name + Status | `businesses.*`                                   | Name, active status, subscription status                      |
| Quick Stats            | `get_business_dashboard_stats()`                 | Grid: total transactions, revenue, customers, rewards given   |
| Today's Activity       | Filtered from stats                              | Transactions today, revenue today                             |
| Active Offers          | `offers WHERE status='active'`                   | Count + list of active offers                                 |
| Recent Transactions    | `transactions ORDER BY created_at DESC LIMIT 10` | Recent activity table                                         |
| Quick Actions          | —                                                | Buttons: "Record Transaction", "Create Offer", "View Profile" |
| Subscription Warning   | `businesses.subscription_status`                 | Show warning if `past_due` or `cancelled`                     |

### 6.5 Offer Management

#### Create Offer Form

| Field                    | Type        | Validation                    |
| ------------------------ | ----------- | ----------------------------- |
| Title                    | text        | Required, max 100 chars       |
| Description              | textarea    | Required, max 500 chars       |
| Offer Type               | select      | One of offer_type enum values |
| Discount Value           | number      | Required if not 'custom' type |
| Image                    | file upload | Optional, max 5MB, jpg/png    |
| Terms & Conditions       | textarea    | Optional                      |
| Start Date               | datetime    | Required, default: now        |
| Expiry Date              | datetime    | Optional                      |
| Requires Paid Membership | toggle      | Default: false                |
| Max Redemptions          | number      | Optional                      |
| Minimum Purchase         | number      | Optional                      |
| Status                   | select      | Draft or Active               |

**Data flow:**

```typescript
// Upload image first
const { data: uploadData } = await supabase.storage
	.from("offer-media")
	.upload(`${businessId}/${offerId}.jpg`, file);

// Insert offer
const { data } = await supabase.from("offers").insert({
	business_id: businessId,
	title,
	description,
	offer_type,
	discount_value,
	image_url: uploadData.path,
	status: "active",
	starts_at,
	expires_at,
	requires_paid_membership,
	max_redemptions,
	min_purchase_amount,
	terms_conditions,
});
```

### 6.6 Customer Identification & Transaction Recording

This is the **core operational flow** for in-store usage. See [Section 11](#11-customer-identification--transaction-flow) for the complete specification.

### 6.7 Route Guard

```typescript
function BusinessGuard({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const { profile } = useProfile();

	if (loading) return <LoadingSpinner />;
	if (!user) return <Navigate to="/auth/login" />;
	if (profile && profile.role !== "business")
		return <Navigate to="/auth/login" />;

	return <>{children}</>;
}

function BusinessOnboardingGuard({ children }: { children: React.ReactNode }) {
	const { business } = useBusiness();

	if (business && !business.onboarding_completed) {
		return <Navigate to="/onboarding" />;
	}

	return <>{children}</>;
}

function ActiveSubscriptionGuard({ children }: { children: React.ReactNode }) {
	const { business } = useBusiness();

	if (business && business.subscription_status !== "active") {
		return <SubscriptionExpiredPage />;
	}

	return <>{children}</>;
}
```

---

## 7. Admin Application — `admin.domain.com`

### 7.1 Complete Route Map

| Route                       | Component                   | Description                                             |
| --------------------------- | --------------------------- | ------------------------------------------------------- |
| `/auth/login`               | `AdminLoginPage`            | Admin login only (no registration)                      |
| `/`                         | `DashboardPage`             | Redirect to dashboard                                   |
| `/dashboard`                | `DashboardPage`             | Platform overview                                       |
| `/users`                    | `UsersListPage`             | All end users, search + filter                          |
| `/users/:userId`            | `UserDetailPage`            | User profile, subscription, card, rewards, transactions |
| `/businesses`               | `BusinessesListPage`        | All businesses, search + filter                         |
| `/businesses/:businessId`   | `BusinessDetailPage`        | Business info, offers, transactions, subscription       |
| `/offers`                   | `OffersListPage`            | All offers across businesses                            |
| `/offers/:offerId`          | `OfferDetailPage`           | Offer detail + moderation actions                       |
| `/cards`                    | `CardsListPage`             | All cards, filter by status                             |
| `/cards/fulfillment`        | `CardFulfillmentPage`       | Queue: pending production → printed → shipped           |
| `/cards/:cardId`            | `CardDetailPage`            | Card detail + status management                         |
| `/subscriptions`            | `SubscriptionsPage`         | Overview of all subscriptions                           |
| `/subscriptions/users`      | `UserSubscriptionsPage`     | End-user subscription management                        |
| `/subscriptions/businesses` | `BusinessSubscriptionsPage` | Business subscription management                        |
| `/transactions`             | `TransactionsListPage`      | All transactions                                        |
| `/rewards`                  | `RewardsPage`               | Rewards overview + manual adjustments                   |
| `/badges`                   | `BadgesListPage`            | Manage badge definitions                                |
| `/badges/create`            | `CreateBadgePage`           | Create new badge                                        |
| `/badges/:badgeId/edit`     | `EditBadgePage`             | Edit badge                                              |
| `/support`                  | `SupportTicketsPage`        | All support tickets                                     |
| `/support/:ticketId`        | `TicketDetailPage`          | Ticket detail + responses                               |
| `/categories`               | `CategoriesPage`            | Manage business categories                              |
| `/settings`                 | `PlatformSettingsPage`      | Platform-wide settings                                  |
| `/settings/plans`           | `PlansPage`                 | Subscription plan configuration                         |
| `/audit-log`                | `AuditLogPage`              | All admin actions log                                   |

### 7.2 Authentication

- **No self-registration.** Admin accounts are created manually.
- To create the first admin: use Supabase Dashboard → Auth → create user, then directly INSERT into `profiles` with `role = 'admin'`.
- Subsequent admins can be created by existing admins via the admin panel.

```typescript
// Admin-only guard
function AdminGuard({ children }: { children: React.ReactNode }) {
	const { user, loading } = useAuth();
	const { profile } = useProfile();

	if (loading) return <LoadingSpinner />;
	if (!user) return <Navigate to="/auth/login" />;
	if (profile?.role !== "admin") {
		return <UnauthorizedPage />;
	}

	return <>{children}</>;
}
```

### 7.3 Dashboard

Displays:

- Platform KPIs from `get_admin_dashboard_stats()`
- Charts: new users over time, transactions over time
- Cards requiring fulfillment (count with link)
- Open support tickets (count with link)
- Recent signups list
- Recent business registrations

### 7.4 User Management (`/users/:userId`)

**Actions available:**

| Action                   | Operation                                              |
| ------------------------ | ------------------------------------------------------ |
| View full profile        | Read `profiles` + `end_user_profiles`                  |
| Edit profile             | Update `profiles` + `end_user_profiles`                |
| Deactivate user          | `UPDATE profiles SET is_active = false`                |
| Reactivate user          | `UPDATE profiles SET is_active = true`                 |
| View transactions        | Query `transactions WHERE user_id = X`                 |
| View rewards             | Query `rewards WHERE user_id = X`                      |
| Manual reward adjustment | Insert into `rewards` with `entry_type = 'adjustment'` |
| View badges              | Query `user_badges WHERE user_id = X`                  |
| Award badge manually     | Insert `user_badges`                                   |
| View cards               | Query `membership_cards WHERE user_id = X`             |
| Override card status     | Update `membership_cards.status`                       |
| View subscription        | Read `end_user_profiles.subscription_*`                |
| Override subscription    | Update `end_user_profiles.subscription_*`              |

All modifying actions must insert into `admin_audit_log`.

### 7.5 Business Management (`/businesses/:businessId`)

**Actions available:**

| Action                     | Operation                                  |
| -------------------------- | ------------------------------------------ |
| View full business profile | Read `businesses` + owner `profiles`       |
| Edit business info         | Update `businesses`                        |
| Verify/unverify            | `UPDATE businesses SET is_verified`        |
| Activate/deactivate        | `UPDATE businesses SET is_active`          |
| View offers                | Query `offers WHERE business_id = X`       |
| Force pause/archive offers | Update `offers.status`                     |
| View transactions          | Query `transactions WHERE business_id = X` |
| View subscription          | Read `businesses.subscription_*`           |
| Override subscription      | Update `businesses.subscription_*`         |

### 7.6 Card Fulfillment (`/cards/fulfillment`)

This is a **Kanban-style or table-based workflow** for managing physical card production and shipping.

**Columns / Filters:**

| Status               | Actions Available                       |
| -------------------- | --------------------------------------- |
| `pending_production` | Mark as Printed                         |
| `printed`            | Mark as Shipped (enter tracking number) |
| `shipped`            | Mark as Delivered → Auto-activates      |
| `active`             | Disable, Replace                        |
| `disabled`           | —                                       |
| `replaced`           | —                                       |

**Bulk Operations:**

- Select multiple cards → Mark as Printed
- Select multiple cards → Mark as Shipped (enter single tracking batch)

**Card Detail Page shows:**

- User info
- Card number
- Current status with timeline
- Shipping address
- Tracking number
- Status change history (derived from `updated_at` + audit log)

### 7.7 Badge Management

Admin can:

- Create new badges (name, description, icon, criteria_type, criteria_value)
- Edit existing badges
- Deactivate badges
- Preview how the badge looks
- Award badges manually to users

### 7.8 Support System

| Feature         | Description                                 |
| --------------- | ------------------------------------------- |
| Ticket list     | All tickets, filter by status/priority/type |
| Ticket detail   | View conversation thread                    |
| Reply           | Add public message (visible to user)        |
| Internal note   | Add internal-only message                   |
| Change status   | Open → In Progress → Resolved → Closed      |
| Assign to admin | Set `assigned_to`                           |
| Change priority | Set `priority`                              |

### 7.9 Audit Log

Table displaying all entries from `admin_audit_log`:

- Date/time
- Admin name
- Action performed
- Target type + ID
- Details (expandable JSON)

Filter by: admin, action type, target type, date range.

---

## 8. Membership Card System

### 8.1 Card Lifecycle

```
User upgrades to paid ──▶ [pending_production]
                                  │
                    Admin marks printed
                                  │
                                  ▼
                            [printed]
                                  │
                    Admin marks shipped
                    + enters tracking no.
                                  │
                                  ▼
                            [shipped]
                                  │
                    Admin marks delivered
                    (or auto after X days)
                                  │
                                  ▼
                            [active] ◄───── Normal operational state
                                  │
                    ┌─────────────┼─────────────┐
                    │                           │
            Card lost/damaged             Subscription cancelled
            Admin replaces                Auto-disabled by cron
                    │                           │
                    ▼                           ▼
              [replaced]                   [disabled]
                    │
           New card created
           with status [pending_production]
           + replacement_for = old_card_id
```

### 8.2 Card Data Encoding

| Encoding     | Data                              | Format            | Library                    |
| ------------ | --------------------------------- | ----------------- | -------------------------- |
| QR Code      | `public_user_id` (9-digit string) | QR Code (Level M) | `qrcode.react` (frontend)  |
| Barcode      | `public_user_id` (9-digit string) | Code 128          | `react-barcode` (frontend) |
| Printed Text | `XXX XXX XXX` (spaced 3-3-3)      | Human-readable    | Card printing              |
| NFC (future) | `public_user_id`                  | NDEF Text record  | N/A in MVP                 |

### 8.3 Physical Card Specification (for printing vendor)

| Property      | Value                                                                  |
| ------------- | ---------------------------------------------------------------------- |
| Material      | PVC                                                                    |
| Size          | CR80 (85.6mm × 53.98mm) — standard credit card size                    |
| Front         | Platform logo, member name, card number (XXX XXX XXX), barcode         |
| Back          | QR code, platform contact info, card ID tiny print                     |
| Data Required | `profiles.first_name`, `profiles.last_name`, `profiles.public_user_id` |

---

## 9. Rewards System

### 9.1 Points Calculation

| Rule                | Value                | Notes                          |
| ------------------- | -------------------- | ------------------------------ |
| Earning rate        | 1 point per €1 spent | `floor(amount_spent)`          |
| Minimum transaction | €0.01                | Any non-zero amount            |
| Free user earning   | Yes                  | Free users earn points too     |
| Cross-business      | Yes                  | Points accumulate globally     |
| Expiry              | None (MVP)           | Future: 12-month expiry window |
| Redemption          | None (MVP)           | Future: points → discounts     |

### 9.2 Rewards Data Flow

```
Business records transaction (€25.50)
        │
        ▼
record_transaction() RPC
        │
        ├──▶ INSERT transactions (amount: 25.50, rewards_earned: 25)
        ├──▶ INSERT rewards (points: 25, type: 'earned')
        ├──▶ UPDATE end_user_profiles SET total_rewards_points += 25
        ├──▶ INSERT notifications
        └──▶ PERFORM check_and_award_badges()
```

### 9.3 Admin Reward Adjustments

Admins can make manual adjustments:

```sql
-- Via admin panel action
INSERT INTO rewards (user_id, points, entry_type, description)
VALUES ('user-uuid', 50, 'adjustment', 'Manual correction: missing points from 2024-01-15');

UPDATE end_user_profiles
SET total_rewards_points = total_rewards_points + 50
WHERE id = 'user-uuid';
```

---

## 10. Badges System

### 10.1 Badge Definitions (Seed Data)

| Name             | Type      | Criteria Type        | Value | Description                     |
| ---------------- | --------- | -------------------- | ----- | ------------------------------- |
| First Purchase   | milestone | `transaction_count`  | 1     | Made your first purchase        |
| Regular Shopper  | milestone | `transaction_count`  | 5     | 5 transactions completed        |
| Loyal Customer   | milestone | `transaction_count`  | 10    | 10 transactions completed       |
| Super Loyal      | milestone | `transaction_count`  | 25    | 25 transactions completed       |
| Big Spender      | milestone | `total_spent`        | 100   | Spent €100 total                |
| Premium Spender  | milestone | `total_spent`        | 500   | Spent €500 total                |
| Explorer         | activity  | `businesses_visited` | 3     | Visited 3 different businesses  |
| World Traveler   | activity  | `businesses_visited` | 10    | Visited 10 different businesses |
| Points Collector | milestone | `rewards_earned`     | 100   | Earned 100 reward points        |
| Points Master    | milestone | `rewards_earned`     | 500   | Earned 500 reward points        |
| Veteran Member   | milestone | `account_age_days`   | 365   | Member for 1 year               |

### 10.2 Badge Awarding

- Badges are checked automatically after every transaction via `check_and_award_badges()`
- Only **paid users** can earn badges
- Once earned, badges are permanent (not revoked on downgrade)
- Admin can manually award the `manual` criteria_type badges

---

## 11. Customer Identification & Transaction Flow

This is the most critical operational flow — it describes what happens when a customer visits a participating business.

### 11.1 Complete Flow

```
┌─────────────────────────────────────────────────────┐
│           Business App: /customers/identify          │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │  📷 Scan    │  │  📷 Scan    │  │  ⌨️ Enter   │  │
│  │  QR Code    │  │  Barcode    │  │  Member ID   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                          │                           │
│                          ▼                           │
│              Extract 9-digit number                  │
│                          │                           │
│                          ▼                           │
│              Call: lookup_member(identifier)          │
│                          │                           │
│                ┌─────────┴─────────┐                 │
│                │ Not Found         │ Found            │
│                ▼                   ▼                  │
│        "Member not found"   Display member info      │
│                             ┌──────────────────┐     │
│                             │ John D.          │     │
│                             │ ID: 482 736 915  │     │
│                             │ Plan: Premium ⭐  │     │
│                             │ [Record Purchase]│     │
│                             └────────┬─────────┘     │
│                                      │               │
│                                      ▼               │
│                          /customers/record-transaction│
│                          ┌──────────────────┐        │
│                          │ Amount Spent: €_ │        │
│                          │                  │        │
│                          │ Apply Offer:     │        │
│                          │ [Select offer ▼] │        │
│                          │                  │        │
│                          │ Notes: _________ │        │
│                          │                  │        │
│                          │ [Confirm]        │        │
│                          └────────┬─────────┘        │
│                                   │                  │
│                                   ▼                  │
│                          record_transaction() RPC    │
│                                   │                  │
│                                   ▼                  │
│                          ┌──────────────────┐        │
│                          │ ✅ Transaction    │        │
│                          │ recorded!         │        │
│                          │                  │        │
│                          │ Customer earned  │        │
│                          │ 25 points        │        │
│                          │                  │        │
│                          │ [New Scan]       │        │
│                          │ [Dashboard]      │        │
│                          └──────────────────┘        │
└─────────────────────────────────────────────────────┘
```

### 11.2 QR/Barcode Scanner Implementation

The business app uses `html5-qrcode` for camera-based scanning:

```typescript
// src/components/Scanner.tsx
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef } from "react";

interface ScannerProps {
	onScanSuccess: (decodedText: string) => void;
	onScanError?: (error: string) => void;
}

export function Scanner({ onScanSuccess, onScanError }: ScannerProps) {
	const scannerRef = useRef<Html5QrcodeScanner | null>(null);

	useEffect(() => {
		scannerRef.current = new Html5QrcodeScanner(
			"qr-reader",
			{
				fps: 10,
				qrbox: { width: 250, height: 250 },
				supportedScanTypes: [0, 1], // QR + Barcode
			},
			false,
		);

		scannerRef.current.render(
			(decodedText) => {
				// Validate it's a 9-digit number
				const cleaned = decodedText.replace(/\D/g, "");
				if (/^\d{9}$/.test(cleaned)) {
					onScanSuccess(cleaned);
					scannerRef.current?.clear();
				}
			},
			(error) => onScanError?.(error),
		);

		return () => {
			scannerRef.current?.clear();
		};
	}, []);

	return <div id="qr-reader" />;
}
```

### 11.3 Manual Entry

```typescript
// Simple form with 9-digit input
function ManualEntry({ onSubmit }: { onSubmit: (id: string) => void }) {
	const [value, setValue] = useState("");

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				if (/^\d{9}$/.test(value)) onSubmit(value);
			}}
		>
			<input
				type="text"
				inputMode="numeric"
				pattern="\d{9}"
				maxLength={9}
				placeholder="Enter 9-digit member ID"
				value={value}
				onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
			/>
			<button type="submit">Look Up</button>
		</form>
	);
}
```

---

## 12. TypeScript Shared Types

These types should be **generated from the Supabase schema** using `supabase gen types typescript`. Below is a reference of the expected shapes for frontend usage.

```typescript
// src/types/database.types.ts — manually documented for reference
// IMPORTANT: Always use generated types from `npx supabase gen types typescript`

// ─── Enums ───
export type UserRole = "end_user" | "business" | "admin";
export type UserSubscriptionPlan = "free" | "paid";
export type SubscriptionStatus =
	| "none"
	| "active"
	| "past_due"
	| "paused"
	| "cancelled"
	| "expired";
export type CardStatus =
	| "pending_production"
	| "printed"
	| "shipped"
	| "active"
	| "replaced"
	| "disabled";
export type OfferStatus =
	| "draft"
	| "active"
	| "paused"
	| "expired"
	| "archived";
export type OfferType =
	| "percentage_discount"
	| "fixed_discount"
	| "free_item"
	| "buy_one_get_one"
	| "custom";
export type IdentificationMethod =
	| "qr_scan"
	| "barcode_scan"
	| "manual_entry"
	| "nfc";
export type RewardEntryType = "earned" | "redeemed" | "expired" | "adjustment";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high";

// ─── Core Entities ───
export interface Profile {
	id: string;
	role: UserRole;
	email: string;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
	avatar_url: string | null;
	public_user_id: string | null;
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface EndUserProfile {
	id: string;
	date_of_birth: string | null;
	subscription_plan: UserSubscriptionPlan;
	subscription_status: SubscriptionStatus;
	lemon_squeezy_customer_id: string | null;
	lemon_squeezy_subscription_id: string | null;
	subscription_started_at: string | null;
	subscription_ends_at: string | null;
	total_rewards_points: number;
	shipping_address_line1: string | null;
	shipping_address_line2: string | null;
	shipping_city: string | null;
	shipping_postal_code: string | null;
	shipping_region: string | null;
	shipping_country: string | null;
	onboarding_completed: boolean;
	created_at: string;
	updated_at: string;
}

export interface Business {
	id: string;
	owner_id: string;
	name: string;
	slug: string;
	description: string | null;
	category_id: string | null;
	subcategory: string | null;
	profile_image_url: string | null;
	cover_image_url: string | null;
	address_line1: string | null;
	address_line2: string | null;
	city: string | null;
	postal_code: string | null;
	region: string | null;
	country: string | null;
	latitude: number | null;
	longitude: number | null;
	phone: string | null;
	email: string | null;
	website: string | null;
	social_facebook: string | null;
	social_instagram: string | null;
	operating_hours: Record<
		string,
		{ open: string | null; close: string | null; closed: boolean }
	> | null;
	is_verified: boolean;
	is_active: boolean;
	subscription_status: SubscriptionStatus;
	lemon_squeezy_customer_id: string | null;
	lemon_squeezy_subscription_id: string | null;
	subscription_started_at: string | null;
	subscription_ends_at: string | null;
	one_time_fee_paid: boolean;
	onboarding_completed: boolean;
	created_at: string;
	updated_at: string;
}

export interface BusinessCategory {
	id: string;
	name: string;
	slug: string;
	icon: string | null;
	description: string | null;
	display_order: number;
	is_active: boolean;
}

export interface Offer {
	id: string;
	business_id: string;
	title: string;
	description: string | null;
	terms_conditions: string | null;
	offer_type: OfferType;
	discount_value: number | null;
	image_url: string | null;
	status: OfferStatus;
	starts_at: string;
	expires_at: string | null;
	is_featured: boolean;
	max_redemptions: number | null;
	current_redemptions: number;
	min_purchase_amount: number | null;
	requires_paid_membership: boolean;
	created_at: string;
	updated_at: string;
}

export interface Transaction {
	id: string;
	business_id: string;
	user_id: string;
	staff_id: string | null;
	offer_id: string | null;
	amount_spent: number;
	rewards_earned: number;
	identification_method: IdentificationMethod;
	card_id: string | null;
	notes: string | null;
	created_at: string;
}

export interface MembershipCard {
	id: string;
	user_id: string;
	card_number: string;
	status: CardStatus;
	shipping_address_line1: string | null;
	shipping_address_line2: string | null;
	shipping_city: string | null;
	shipping_postal_code: string | null;
	shipping_region: string | null;
	shipping_country: string | null;
	shipped_at: string | null;
	delivered_at: string | null;
	activated_at: string | null;
	disabled_at: string | null;
	replacement_for: string | null;
	tracking_number: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
}

export interface Reward {
	id: string;
	user_id: string;
	business_id: string | null;
	transaction_id: string | null;
	points: number;
	entry_type: RewardEntryType;
	description: string | null;
	created_at: string;
}

export interface Badge {
	id: string;
	name: string;
	description: string | null;
	icon_url: string | null;
	badge_type: string;
	criteria_type: string;
	criteria_value: number;
	is_active: boolean;
	display_order: number;
	created_at: string;
}

export interface UserBadge {
	id: string;
	user_id: string;
	badge_id: string;
	earned_at: string;
}

export interface Notification {
	id: string;
	user_id: string;
	title: string;
	body: string | null;
	type: string;
	is_read: boolean;
	metadata: Record<string, unknown>;
	created_at: string;
}

export interface SupportTicket {
	id: string;
	created_by: string;
	subject: string;
	description: string;
	status: TicketStatus;
	priority: TicketPriority;
	assigned_to: string | null;
	type: string;
	metadata: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

export interface SupportTicketMessage {
	id: string;
	ticket_id: string;
	sender_id: string;
	message: string;
	is_internal: boolean;
	created_at: string;
}

// ─── RPC Return Types ───
export interface MemberLookupResult {
	user_id: string;
	public_user_id: string;
	first_name: string;
	last_name: string;
	avatar_url: string | null;
	subscription_plan: UserSubscriptionPlan;
	is_active: boolean;
}

export interface TransactionResult {
	transaction_id: string;
	rewards_earned: number;
	user_name: string;
}

export interface BusinessDashboardStats {
	total_transactions: number;
	total_revenue: number;
	total_rewards_given: number;
	unique_customers: number;
	transactions_today: number;
	revenue_today: number;
	transactions_this_month: number;
	revenue_this_month: number;
	active_offers: number;
}

export interface UserRewardsSummary {
	total_points: number;
	total_transactions: number;
	total_spent: number;
	businesses_visited: number;
	badges_earned: number;
	recent_rewards: Array<{
		id: string;
		points: number;
		entry_type: RewardEntryType;
		description: string;
		business_name: string;
		created_at: string;
	}>;
}

export interface AdminDashboardStats {
	total_end_users: number;
	total_paid_users: number;
	total_free_users: number;
	total_businesses: number;
	active_businesses: number;
	total_transactions: number;
	total_revenue_processed: number;
	cards_pending: number;
	cards_shipped: number;
	cards_active: number;
	open_tickets: number;
	users_today: number;
	transactions_today: number;
}

// ─── Marketplace View Types ───
export interface MarketplaceOffer {
	offer_id: string;
	title: string;
	description: string;
	offer_type: OfferType;
	discount_value: number | null;
	image_url: string | null;
	starts_at: string;
	expires_at: string | null;
	requires_paid_membership: boolean;
	business_id: string;
	business_name: string;
	business_slug: string;
	business_profile_image: string | null;
	business_category_name: string | null;
	is_favorited: boolean;
}
```

---

## 13. Security Model

### 13.1 Authentication Security

| Measure            | Implementation                         |
| ------------------ | -------------------------------------- |
| Password hashing   | Handled by Supabase Auth (bcrypt)      |
| Email verification | Required before access                 |
| JWT tokens         | Short-lived (1h) with refresh rotation |
| Session management | Supabase handles via `supabase-js`     |
| HTTPS only         | Enforced via Netlify + Supabase        |

### 13.2 Authorization Security

| Layer          | Mechanism                                  |
| -------------- | ------------------------------------------ |
| Database       | RLS policies on every table                |
| Application    | Route guards per app check `profile.role`  |
| Edge Functions | Verify JWT and user role before processing |
| Storage        | Bucket policies check ownership            |

### 13.3 Cross-App Isolation

All three apps share the same Supabase `anon` key. Isolation is achieved through:

1. **RLS policies** — A user with `role = 'end_user'` physically cannot query business-admin data.
2. **Frontend route guards** — Wrong-role users are redirected to login.
3. **RPC functions** — `SECURITY DEFINER` functions validate the caller's role internally.

### 13.4 Lemon Squeezy Webhook Security

- HMAC-SHA256 signature verification on every webhook request
- Webhook secret stored as an Edge Function environment variable
- Never exposed to the frontend

### 13.5 API Key Management

| Key                            | Where Used          | Exposure                   |
| ------------------------------ | ------------------- | -------------------------- |
| `SUPABASE_ANON_KEY`            | All 3 frontend apps | Public (RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY`    | Edge Functions only | Never in frontend          |
| `LEMON_SQUEEZY_API_KEY`        | Edge Functions only | Never in frontend          |
| `LEMON_SQUEEZY_WEBHOOK_SECRET` | Edge Functions only | Never in frontend          |

### 13.6 Input Validation

All form inputs must be validated:

- **Frontend:** Zod or Yup schemas for form validation
- **Database:** `CHECK` constraints, `NOT NULL` where required, enum types
- **RPC Functions:** Parameter validation before any DB operations

---

## 14. Environment Variables & Configuration

### 14.1 Frontend Apps (all three)

```env
# .env (identical for all 3 apps, except VITE_APP_URL)
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_APP_URL=https://app.domain.com          # or client.domain.com or admin.domain.com
VITE_LEMON_SQUEEZY_STORE_SLUG=your-store
VITE_USER_PAID_VARIANT_ID=123456             # LS variant ID for user paid plan
VITE_BUSINESS_VARIANT_ID=789012              # LS variant ID for business plan
```

### 14.2 Supabase Edge Functions

Set via `supabase secrets set`:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
LEMON_SQUEEZY_API_KEY=eyJhbGciOi...
LEMON_SQUEEZY_STORE_ID=12345
LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_xxxxx
```

---

## 15. Deployment Architecture

### 15.1 Netlify Configuration

Three separate Netlify sites, each connected to its own Git repository (or monorepo with build contexts).

| Site         | Repository / Path   | Build Command   | Publish Directory | Domain              |
| ------------ | ------------------- | --------------- | ----------------- | ------------------- |
| End-User App | `apps/user-app`     | `npm run build` | `dist`            | `app.domain.com`    |
| Business App | `apps/business-app` | `npm run build` | `dist`            | `client.domain.com` |
| Admin App    | `apps/admin-app`    | `npm run build` | `dist`            | `admin.domain.com`  |

### 15.2 SPA Routing

Each Netlify site needs a `_redirects` file for SPA routing:

```
# public/_redirects
/*    /index.html   200
```

Or `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 15.3 Supabase Project

| Setting             | Value                                                  |
| ------------------- | ------------------------------------------------------ |
| Plan                | Pro                                                    |
| Region              | EU (Frankfurt) — closest to Greece                     |
| Extensions Required | `pg_cron`, `pgcrypto` (both enabled by default on Pro) |

### 15.4 Deployment Checklist

- [ ] Supabase schema migrated (all tables, enums, functions, triggers, policies)
- [ ] Storage buckets created with policies
- [ ] Edge Functions deployed
- [ ] Lemon Squeezy products and variants created
- [ ] Lemon Squeezy webhook configured
- [ ] Environment variables set in all 3 Netlify sites
- [ ] Supabase Edge Function secrets set
- [ ] Custom domains configured
- [ ] SSL certificates active
- [ ] Supabase Auth redirect URLs configured
- [ ] Google OAuth configured (if using)
- [ ] Seed data inserted (categories, badges, plans, admin user)
- [ ] `pg_cron` jobs scheduled
- [ ] Realtime enabled on required tables
- [ ] Smoke tests passed on all 3 apps

---

## 16. Third-Party Libraries

### 16.1 All Frontend Apps (shared)

| Package                       | Purpose                  | Version |
| ----------------------------- | ------------------------ | ------- |
| `react`                       | UI framework             | ^18.x   |
| `react-dom`                   | DOM rendering            | ^18.x   |
| `react-router-dom`            | Client routing           | ^6.x    |
| `@supabase/supabase-js`       | Supabase client          | ^2.x    |
| `@tanstack/react-query`       | Server state management  | ^5.x    |
| `tailwindcss`                 | Utility CSS              | ^3.x    |
| `@headlessui/react`           | Accessible UI components | ^2.x    |
| `@heroicons/react`            | Icon library             | ^2.x    |
| `react-hook-form`             | Form management          | ^7.x    |
| `zod`                         | Schema validation        | ^3.x    |
| `@hookform/resolvers`         | Zod ↔ react-hook-form    | ^3.x    |
| `date-fns`                    | Date formatting          | ^3.x    |
| `sonner` or `react-hot-toast` | Toast notifications      | latest  |
| `clsx`                        | Class name utility       | ^2.x    |

### 16.2 End-User App Only

| Package         | Purpose                         |
| --------------- | ------------------------------- |
| `qrcode.react`  | QR code display on digital card |
| `react-barcode` | Barcode display on digital card |

### 16.3 Business App Only

| Package        | Purpose                          |
| -------------- | -------------------------------- |
| `html5-qrcode` | Camera-based QR/barcode scanning |

### 16.4 Admin App Only

| Package                 | Purpose                            |
| ----------------------- | ---------------------------------- |
| `@tanstack/react-table` | Data tables with sorting/filtering |
| `recharts`              | Dashboard charts                   |

---

## 17. Appendix — Seed Data

### 17.1 Business Categories

```sql
INSERT INTO public.business_categories (name, slug, icon, display_order) VALUES
  ('Food & Dining',    'food-dining',    '🍽️', 1),
  ('Beauty & Wellness','beauty-wellness','💆', 2),
  ('Clothing & Fashion','clothing-fashion','👗', 3),
  ('Health & Fitness', 'health-fitness', '💪', 4),
  ('Entertainment',    'entertainment',  '🎭', 5),
  ('Retail & Shopping','retail-shopping','🛍️', 6),
  ('Services',         'services',       '🔧', 7),
  ('Cafés & Bars',     'cafes-bars',     '☕', 8),
  ('Education',        'education',      '📚', 9),
  ('Other',            'other',          '📦', 10);
```

### 17.2 Badges

```sql
INSERT INTO public.badges (name, description, icon_url, badge_type, criteria_type, criteria_value, display_order) VALUES
  ('First Purchase',     'Made your first purchase as a member',            NULL, 'milestone', 'transaction_count',  1,    1),
  ('Regular Shopper',    'Completed 5 transactions',                        NULL, 'milestone', 'transaction_count',  5,    2),
  ('Loyal Customer',     'Completed 10 transactions',                       NULL, 'milestone', 'transaction_count',  10,   3),
  ('Super Loyal',        'Completed 25 transactions',                       NULL, 'milestone', 'transaction_count',  25,   4),
  ('Elite Member',       'Completed 50 transactions',                       NULL, 'milestone', 'transaction_count',  50,   5),
  ('Big Spender',        'Spent €100 in total',                             NULL, 'milestone', 'total_spent',        100,  6),
  ('Premium Spender',    'Spent €500 in total',                             NULL, 'milestone', 'total_spent',        500,  7),
  ('Explorer',           'Visited 3 different businesses',                  NULL, 'activity',  'businesses_visited', 3,    8),
  ('World Traveler',     'Visited 10 different businesses',                 NULL, 'activity',  'businesses_visited', 10,   9),
  ('Points Collector',   'Earned 100 reward points',                        NULL, 'milestone', 'rewards_earned',     100,  10),
  ('Points Master',      'Earned 500 reward points',                        NULL, 'milestone', 'rewards_earned',     500,  11),
  ('Veteran Member',     'Member for 1 year',                               NULL, 'milestone', 'account_age_days',   365, 12);
```

### 17.3 Subscription Plans

```sql
INSERT INTO public.subscription_plans (name, plan_type, lemon_squeezy_product_id, lemon_squeezy_variant_id, price_monthly_cents, setup_fee_cents) VALUES
  ('User Premium Membership', 'end_user',  'PRODUCT_ID_HERE', 'VARIANT_ID_HERE', 200,  0),
  ('Business Membership',     'business',  'PRODUCT_ID_HERE', 'VARIANT_ID_HERE', 350,  3000);
```

### 17.4 Platform Settings

```sql
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('rewards_points_per_euro',   '1',                                    'Points awarded per €1 spent'),
  ('free_user_offer_limit',     '3',                                    'Max offers visible to free users'),
  ('card_auto_activate_days',   '14',                                   'Days after shipping to auto-activate card'),
  ('platform_name',             '"LoyaltyCard GR"',                     'Platform display name'),
  ('support_email',             '"support@domain.com"',                 'Support contact email'),
  ('maintenance_mode',          'false',                                'Enable maintenance mode');
```

### 17.5 Initial Admin User

After creating the user in Supabase Auth dashboard:

```sql
-- Replace with actual auth.users UUID after creation
INSERT INTO public.profiles (id, role, email, first_name, last_name, is_active)
VALUES (
  'AUTH_USER_UUID_HERE',
  'admin',
  'admin@domain.com',
  'Platform',
  'Admin',
  true
);
```

---

## 18. Project Structure Reference

### 18.1 Recommended Frontend App Structure (each app)

```
src/
├── components/
│   ├── guards/              # AuthGuard, OnboardingGuard, PaidGuard, etc.
│   ├── layout/              # Sidebar, Header, Footer, PageLayout
│   ├── ui/                  # Button, Input, Card, Modal, Badge, etc.
│   └── features/            # Domain-specific components
│       ├── auth/
│       ├── marketplace/     # (user app)
│       ├── offers/          # (business app)
│       ├── scanner/         # (business app)
│       ├── cards/           # (admin app)
│       └── ...
├── hooks/
│   ├── useAuth.ts
│   ├── useProfile.ts
│   ├── useEndUserProfile.ts # (user app)
│   ├── useBusiness.ts       # (business app)
│   ├── useNotifications.ts
│   └── ...
├── lib/
│   ├── supabase.ts          # Supabase client init
│   └── utils.ts             # Helpers (formatDate, formatCurrency, etc.)
├── pages/                   # Route-level page components
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   └── ...
├── providers/
│   ├── AuthProvider.tsx
│   ├── QueryProvider.tsx
│   └── ThemeProvider.tsx
├── types/
│   ├── database.types.ts    # Generated Supabase types
│   └── index.ts
├── App.tsx                  # Router setup
├── main.tsx                 # Entry point
└── index.css                # Tailwind directives
```

---

## 19. Glossary

| Term                      | Definition                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Public User ID**        | Unique 9-digit number assigned to each end user, printed on their physical card and used for identification |
| **Member**                | An end user registered on the platform                                                                      |
| **Paid Member / Premium** | End user with active paid subscription ($€2$/mo)                                                            |
| **Free Member**           | End user on the free plan                                                                                   |
| **Transaction**           | A recorded in-store purchase event                                                                          |
| **Reward**                | Points earned from transactions                                                                             |
| **Badge**                 | Achievement earned after meeting specific criteria                                                          |
| **Offer**                 | A promotional deal published by a business                                                                  |
| **Marketplace**           | The section of the end-user app where offers are browsed                                                    |
| **Onboarding**            | Multi-step registration/setup flow for new users or businesses                                              |
| **Card Fulfillment**      | The process of producing, printing, shipping, and activating physical membership cards                      |
| **Setup Fee**             | One-time $€30$ fee charged to businesses on first subscription                                              |
| **RLS**                   | Row Level Security — PostgreSQL feature that filters data per-user                                          |
| **RPC**                   | Remote Procedure Call — calling a PostgreSQL function from the client                                       |
| **Edge Function**         | Serverless function running on Supabase infrastructure (Deno)                                               |
| **Lemon Squeezy (LS)**    | Third-party payment processor / Merchant of Record                                                          |
| **Variant**               | A specific pricing option within a Lemon Squeezy product                                                    |
| **Webhook**               | HTTP callback from Lemon Squeezy to our Edge Function when a payment event occurs                           |
