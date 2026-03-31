# SL-SOP-001 — Production Environment Setup & Git Branch Strategy

**Organization:** Saphire Labs  
**Document ID:** SL-SOP-001  
**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Effective Date:** March 28, 2026  
**Author:** CTO, Saphire Labs  
**Audience:** Developers, AI Coding Agents, DevOps

---

> **CONFIDENTIAL — SAPHIRE LABS INTERNAL USE ONLY**  
> This document is binding for all human engineers and AI coding agents operating on Saphire Labs infrastructure. Deviations require written CTO approval.

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Definitions](#2-definitions)
3. [Monorepo Repository Structure](#3-monorepo-repository-structure)
4. [Branch Strategy — The Three Environments](#4-branch-strategy--the-three-environments)
5. [Supabase Setup — Three Separate Projects](#5-supabase-setup--three-separate-projects)
6. [Client Application Setup](#6-client-application-setup)
7. [GitHub Repository Secrets Configuration](#7-github-repository-secrets-configuration)
8. [GitHub Actions — CI/CD Pipeline Definitions](#8-github-actions--cicd-pipeline-definitions)
9. [Lemon Squeezy Integration](#9-lemon-squeezy-integration)
10. [Commit Message Convention](#10-commit-message-convention)
11. [Hotfix Procedure](#11-hotfix-procedure)
12. [Rules for AI Coding Agents](#12-rules-for-ai-coding-agents)
13. [New Environment Setup Master Checklist](#13-new-environment-setup-master-checklist)
14. [Document Version History](#14-document-version-history)

---

## 1. Purpose & Scope

This Standard Operating Procedure (SOP) defines the authoritative process for configuring, managing, and deploying production-grade software environments at Saphire Labs. It is binding for all human developers and must be followed precisely by all AI coding agents operating within Saphire Labs infrastructure.

This document governs the complete lifecycle of our primary technology stack:

- **Supabase (Pro)** — PostgreSQL database, Auth, Storage, Edge Functions
- **React + Vite + TypeScript + Tailwind CSS** — Frontend client application
- **Lemon Squeezy** — Payment processing and subscription management
- **GitHub** — Version control, CI/CD pipeline, branch strategy

> ⚠️ **WARNING:** Any deviation from this SOP must be approved in writing by the CTO before implementation. AI agents that encounter ambiguous scenarios not covered here must halt and request human review.

---

## 2. Definitions

| Term              | Definition                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Monorepo**      | A single Git repository containing multiple distinct project directories (`supabase/`, `client/`).                     |
| **Branch**        | An isolated line of Git history. Used to separate development stages.                                                  |
| **Environment**   | A distinct deployment target: `development`, `staging`, or `production`, each with its own secrets and infrastructure. |
| **PR / MR**       | Pull Request. A formal request to merge one branch into another, subject to code review.                               |
| **CI/CD**         | Continuous Integration / Continuous Delivery. Automated pipelines triggered by Git events.                             |
| **Supabase CLI**  | The official command-line interface for managing Supabase projects and migrations.                                     |
| **Migration**     | A versioned SQL script that modifies database schema. Must be tracked in source control.                               |
| **Lemon Squeezy** | Payment processor used for one-time purchases and recurring subscriptions.                                             |
| **Secret**        | Any credential, API key, connection string, or token. **NEVER committed to Git.**                                      |

---

## 3. Monorepo Repository Structure

### 3.1 Directory Layout

The Saphire Labs codebase lives in a single GitHub repository structured as follows:

```
saphire-labs/                          ← Root of the monorepo
├── .github/
│   ├── workflows/
│   │   ├── ci-client.yml              ← Client CI (lint, test, build)
│   │   ├── ci-supabase.yml            ← Supabase migration checks
│   │   ├── deploy-staging.yml         ← Auto-deploy to staging
│   │   └── deploy-production.yml      ← Gated deploy to production
│   └── PULL_REQUEST_TEMPLATE.md
├── supabase/                          ← All Supabase project files
│   ├── migrations/                    ← Versioned SQL migrations
│   │   └── 20240101000000_init.sql
│   ├── functions/                     ← Supabase Edge Functions
│   │   └── hello-world/
│   │       └── index.ts
│   ├── seed.sql                       ← Development seed data ONLY
│   └── config.toml                    ← Supabase project config
├── client/                            ← React + Vite + TS + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── supabase.ts            ← Supabase client initializer
│   │   │   └── lemonsqueezy.ts        ← Lemon Squeezy initializer
│   │   ├── types/
│   │   └── main.tsx
│   ├── .env.development               ← Local dev vars (gitignored)
│   ├── .env.staging                   ← Staging vars template (gitignored)
│   ├── .env.production                ← Production vars template (gitignored)
│   ├── .env.example                   ← ✅ COMMITTED — placeholder values only
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── package.json
├── .gitignore
└── README.md
```

> 🔴 **CRITICAL:** NEVER commit real `.env` files containing secrets to Git. Only `.env.example` (with placeholder values) should ever be committed. All real environment variables are managed exclusively through GitHub Secrets and your hosting platform's environment configuration.

### 3.2 Initial Repository Setup

Perform these steps exactly once when bootstrapping a new Saphire Labs project.

#### Step 1 — Create the GitHub Repository

```bash
# 1. Create the repository on GitHub
gh repo create saphire-labs/saphire-labs --private --clone

# 2. Navigate into the repo
cd saphire-labs

# 3. Create the required top-level directories
mkdir -p .github/workflows supabase/migrations supabase/functions client/src

# 4. Create a root .gitignore
cat > .gitignore << 'EOF'
# Environment files — NEVER commit real secrets
.env
.env.local
.env.development
.env.staging
.env.production

# Dependencies
node_modules/

# Build outputs
dist/
.vite/

# Supabase local
.supabase/
EOF

# 5. Initial commit
git add .
git commit -m "chore: initialize monorepo structure"
git push origin main
```

#### Step 2 — Initialize the Client (React + Vite + TypeScript + Tailwind)

```bash
# From the repo root
cd client

# Create Vite project with React + TypeScript template
npm create vite@latest . -- --template react-ts

# Install dependencies
npm install

# Install Tailwind CSS and its peer dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install Supabase JS client
npm install @supabase/supabase-js

# Install Lemon Squeezy JS SDK
npm install @lemonsqueezy/lemonsqueezy.js

# Install additional recommended dependencies
npm install react-router-dom
npm install -D @types/node
```

#### Step 3 — Initialize Supabase CLI

```bash
# Install Supabase CLI globally (requires Node.js ≥ 18)
npm install -g supabase

# From the repo root, initialize the supabase directory
supabase init

# Link to your Supabase DEVELOPMENT project
# (Project ref found in: Supabase Dashboard → Project Settings → General)
supabase link --project-ref YOUR_DEV_PROJECT_REF

# Verify connection
supabase status
```

---

## 4. Branch Strategy — The Three Environments

Saphire Labs operates a strict three-branch model. Each branch corresponds to exactly one deployment environment. **Merges only flow in one direction: `development` → `staging` → `production`.**

| Branch        | Environment | Access            | Purpose                                                                       |
| ------------- | ----------- | ----------------- | ----------------------------------------------------------------------------- |
| `development` | Development | Team only         | Active feature development, prototyping, experimentation. Expect instability. |
| `staging`     | Staging     | Team + beta users | Internal QA and controlled beta testing. Mirror of production configuration.  |
| `production`  | Production  | Public            | Live public application. Strictly stable. All changes require PR + approval.  |

### 4.1 Creating and Protecting the Three Branches

#### Creating Branches

```bash
# Starting from main — rename it to development (do this once during setup)
git branch -m main development
git push -u origin development

# Create staging branch from development
git checkout -b staging
git push -u origin staging

# Create production branch from staging
git checkout -b production
git push -u origin production

# Return to development for day-to-day work
git checkout development
```

#### Configuring Branch Protection Rules

Navigate to: **GitHub Repository → Settings → Branches → Add branch protection rule**

**For the `development` branch:**

- Require a pull request before merging: **YES**
- Require approvals: **1**
- Dismiss stale pull request approvals when new commits are pushed: **YES**
- Require status checks to pass before merging: **YES** (add CI workflow checks)
- Do not allow bypassing the above settings: **YES**

**For the `staging` branch** (same as above, plus):

- Restrict who can push: restrict to CTO and senior engineers only
- Require linear history: **YES**

**For the `production` branch** (strictest settings):

- Require a pull request before merging: **YES**
- Require approvals: **2** (CTO must be one approver)
- Require signed commits: **YES**
- Restrict who can push: **CTO only**
- Require deployments to succeed before merging: **YES** (staging environment check)
- Do not allow force pushes: **YES**
- Do not allow deletions: **YES**

> 🔴 **CRITICAL:** NEVER force-push to `staging` or `production` branches. If a force-push is needed on `development`, communicate to all team members immediately. Force-pushing rewrites history and can destroy teammates' work.

### 4.2 Feature Branch Workflow

All development work happens on short-lived **feature branches**, not directly on the `development` branch.

#### Naming Convention

```
# Format: <type>/<ticket-id>-<short-description>

# Types:
#   feat/     → new feature
#   fix/      → bug fix
#   chore/    → maintenance, dependency updates
#   hotfix/   → urgent production fix
#   docs/     → documentation only
#   refactor/ → code restructuring, no behavior change

# Examples:
feat/SL-42-user-authentication
fix/SL-87-payment-webhook-timeout
chore/SL-91-upgrade-supabase-js
hotfix/SL-101-stripe-price-id-null
```

#### Complete Feature Development Lifecycle

```bash
# ── STEP 1: Always start from a fresh development branch ─────────────────
git checkout development
git pull origin development          # Pull latest changes

# ── STEP 2: Create your feature branch ───────────────────────────────────
git checkout -b feat/SL-42-user-authentication

# ── STEP 3: Do your work, commit frequently ───────────────────────────────
# Commit message format: <type>(scope): <description>
git add .
git commit -m "feat(auth): add email/password sign-up flow"
git commit -m "feat(auth): implement JWT session persistence"
git commit -m "test(auth): add unit tests for auth hooks"

# ── STEP 4: Keep branch up to date with development ──────────────────────
git fetch origin
git rebase origin/development        # Prefer rebase over merge for clean history

# ── STEP 5: Push feature branch and open a Pull Request ──────────────────
git push origin feat/SL-42-user-authentication
# Then open a PR on GitHub: feat/SL-42... → development

# ── STEP 6: After PR approval, squash-merge into development ─────────────
# Done via the GitHub UI "Squash and merge" button.
# Results in one clean commit on development:
# "feat(auth): add email/password sign-up flow (#42)"

# ── STEP 7: Delete the feature branch after merge ────────────────────────
git branch -d feat/SL-42-user-authentication
git push origin --delete feat/SL-42-user-authentication
```

### 4.3 Promoting Code: `development` → `staging` → `production`

Code promotion follows a strict linear path. **No branch can skip a stage.**

#### Promoting `development` to `staging`

```bash
# Open a PR on GitHub: development → staging
gh pr create \
  --base staging \
  --head development \
  --title "release: promote development to staging [$(date +%Y-%m-%d)]" \
  --body "## Changes included
- List all changes

## Testing
- [ ] All CI checks pass
- [ ] Manually tested locally"

# After review and CI passes, merge using "Create a merge commit"
# (no squash for promotion PRs — preserve the commit history)

# Tag the staging release
git checkout staging
git pull origin staging
git tag -a staging-2026-03-28 -m "Staging release 2026-03-28"
git push origin staging-2026-03-28
```

#### Promoting `staging` to `production`

```bash
# Only promote after staging has been tested for ≥ 24 hours

# Open a PR on GitHub: staging → production
gh pr create \
  --base production \
  --head staging \
  --title "release: v1.2.0 production deploy" \
  --body "## Release Notes
...

## Checklist
- [ ] Staging tests passed
- [ ] DB migrations reviewed
- [ ] Rollback plan documented"

# Requires 2 approvals — CTO must be one of them

# After merge, tag the production release (Semantic Versioning)
git checkout production
git pull origin production
git tag -a v1.2.0 -m "Release v1.2.0 — Feature: User authentication"
git push origin v1.2.0

# GitHub automatically triggers deploy-production.yml CI/CD
```

---

## 5. Supabase Setup — Three Separate Projects

Each environment requires a **completely separate Supabase project**. Never share a Supabase project between environments.

| Project         | Purpose                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **Development** | Used exclusively for local development and feature building. May contain test/seed data. OK to reset.    |
| **Staging**     | Mirror of production schema. Contains sanitized test data. Never contains real user PII.                 |
| **Production**  | Live customer data. Full backups enabled. Point-in-time recovery enabled (Pro feature). **NEVER reset.** |

#### Naming Convention

```
saphire-labs-development
saphire-labs-staging
saphire-labs-production
```

### 5.1 Database Migrations

Migrations are the **single source of truth** for database schema. Every schema change MUST be created as a migration file. Never use the Supabase Dashboard to make schema changes directly on staging or production.

#### Creating a New Migration

```bash
# Always run migration commands from the supabase/ directory
cd supabase/

# Create a new migration file (Supabase CLI auto-generates timestamp)
supabase migration new add_user_profiles_table

# This creates: supabase/migrations/20260328143000_add_user_profiles_table.sql

# Example migration content:
```

```sql
-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = id);
```

#### Applying Migrations per Environment

```bash
# ── Apply to DEVELOPMENT ──────────────────────────────────────────────────
supabase db push --project-ref YOUR_DEV_PROJECT_REF

# ── Apply to STAGING ──────────────────────────────────────────────────────
# Done automatically by CI/CD on merge to staging branch.
# Or manually:
supabase db push --project-ref YOUR_STAGING_PROJECT_REF

# ── Apply to PRODUCTION ───────────────────────────────────────────────────
# Done automatically by CI/CD on merge to production branch.
# ALWAYS review the migration diff before running on production:
supabase db diff --project-ref YOUR_PROD_PROJECT_REF
# Then apply:
supabase db push --project-ref YOUR_PROD_PROJECT_REF

# ── Check migration status ────────────────────────────────────────────────
supabase migration list --project-ref YOUR_PROJECT_REF
```

> ⚠️ **WARNING:** Migrations are IRREVERSIBLE in spirit. You cannot "undo" a migration on a live database with real user data. If a migration needs to be reverted, write a **new** migration that undoes the changes. Test all migrations on development and staging **before** applying to production.

### 5.2 Row Level Security (RLS)

RLS must be enabled on **every table that contains user data**. This is non-negotiable for production.

```sql
-- Always enable RLS on new tables
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- Standard CRUD policies
CREATE POLICY "Users select own rows" ON public.your_table
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own rows" ON public.your_table
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own rows" ON public.your_table
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users delete own rows" ON public.your_table
  FOR DELETE USING (auth.uid() = user_id);
```

### 5.3 Environment Variables — Supabase

```bash
# .env.example  (commit this file — NO real values)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Server-side only — NEVER expose to the browser:
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> ℹ️ **NOTE:** The `ANON KEY` is safe to expose to the browser — it is rate-limited and RLS-restricted. The `SERVICE ROLE KEY` bypasses RLS entirely and must **NEVER** be exposed client-side or committed to Git.

---

## 6. Client Application Setup

### 6.1 Vite Configuration

```typescript
// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		sourcemap: true, // Always generate sourcemaps
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ["react", "react-dom"],
					supabase: ["@supabase/supabase-js"],
				},
			},
		},
	},
});
```

### 6.2 Tailwind CSS Configuration

```typescript
// client/tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
	content: ["./index.html", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				brand: {
					50: "#E8F2FB",
					500: "#2D7DD2",
					900: "#0F2A4A",
				},
			},
		},
	},
	plugins: [],
} satisfies Config;
```

### 6.3 Supabase Client Initializer

```typescript
// client/src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		"Missing Supabase environment variables. Check your .env file.",
	);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
	},
});
```

### 6.4 Lemon Squeezy Client Initializer

```typescript
// client/src/lib/lemonsqueezy.ts
import { lemonSqueezySetup } from "@lemonsqueezy/lemonsqueezy.js";

// NOTE: Sensitive API calls must happen server-side (Supabase Edge Functions).
// This client-side setup is only for the checkout overlay integration.
export function initLemonSqueezy(): void {
	lemonSqueezySetup({
		apiKey: import.meta.env.VITE_LEMONSQUEEZY_API_KEY,
		onError: (error) => {
			console.error("[LemonSqueezy] Error:", error);
		},
	});
}

// Call in main.tsx before rendering the app:
// initLemonSqueezy();
```

> 🔴 **CRITICAL:** Lemon Squeezy API calls that handle sensitive operations (creating orders, fetching customer data, managing subscriptions) **MUST** be executed in Supabase Edge Functions — **NOT** in the React client. The webhook signing secret must only live in Supabase Edge Function secrets.

---

## 7. GitHub Repository Secrets Configuration

Navigate to: **GitHub Repository → Settings → Secrets and variables → Actions**

### 7.1 Required Repository Secrets

| Secret Name                    | Description                                                              |
| ------------------------------ | ------------------------------------------------------------------------ |
| `SUPABASE_ACCESS_TOKEN`        | Supabase personal access token. Used by CI to run Supabase CLI commands. |
| `SUPABASE_DEV_PROJECT_REF`     | Project reference ID for the development Supabase project.               |
| `SUPABASE_STAGING_PROJECT_REF` | Project reference ID for the staging Supabase project.                   |
| `SUPABASE_PROD_PROJECT_REF`    | Project reference ID for the production Supabase project.                |
| `SUPABASE_DEV_DB_PASSWORD`     | Database password for the development project.                           |
| `SUPABASE_STAGING_DB_PASSWORD` | Database password for the staging project.                               |
| `SUPABASE_PROD_DB_PASSWORD`    | Database password for the production project.                            |
| `LEMONSQUEEZY_WEBHOOK_SECRET`  | Webhook signing secret from Lemon Squeezy dashboard.                     |
| `LEMONSQUEEZY_API_KEY`         | Lemon Squeezy API key. Used in Edge Functions only.                      |

### 7.2 Hosting Platform Environment Variables (per environment)

Configure these in your hosting platform (e.g., Vercel) for each separate environment:

| Variable Name            | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL for the corresponding environment.     |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key for the corresponding environment. |
| `VITE_APP_ENV`           | `"development"`, `"staging"`, or `"production"`.            |
| `VITE_LS_STORE_ID`       | Your Lemon Squeezy store ID (safe to expose client-side).   |

---

## 8. GitHub Actions — CI/CD Pipeline Definitions

### 8.1 Client CI Workflow

```yaml
# .github/workflows/ci-client.yml
name: Client CI

on:
  push:
    branches: [development, staging, production]
    paths: ["client/**"]
  pull_request:
    branches: [development, staging, production]
    paths: ["client/**"]

jobs:
  lint-test-build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: client

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: client/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Lint
        run: npm run lint

      - name: Run tests
        run: npm run test --if-present

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_DEV_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_DEV_ANON_KEY }}
```

### 8.2 Supabase Migration CI Workflow

```yaml
# .github/workflows/ci-supabase.yml
name: Supabase Migration Check

on:
  pull_request:
    branches: [development, staging, production]
    paths: ["supabase/migrations/**"]

jobs:
  migration-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Verify migration files are valid
        run: |
          supabase db lint \
            --project-ref ${{ secrets.SUPABASE_DEV_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 8.3 Staging Deployment Workflow

```yaml
# .github/workflows/deploy-staging.yml
# Auto-triggers when development is merged into staging
name: Deploy to Staging

on:
  push:
    branches: [staging]

jobs:
  deploy-supabase-staging:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Apply database migrations to staging
        run: |
          supabase db push \
            --project-ref ${{ secrets.SUPABASE_STAGING_PROJECT_REF }} \
            --password    ${{ secrets.SUPABASE_STAGING_DB_PASSWORD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy Edge Functions to staging
        run: |
          supabase functions deploy \
            --project-ref ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-client-staging:
    runs-on: ubuntu-latest
    needs: deploy-supabase-staging
    defaults:
      run:
        working-directory: client

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: client/package-lock.json

      - name: Install and build
        run: |
          npm ci
          npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.STAGING_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.STAGING_SUPABASE_ANON_KEY }}
          VITE_APP_ENV: staging

      # Replace with your hosting platform deploy step:
      - name: Deploy to Vercel (Staging)
        run: |
          npx vercel --prod \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --scope=${{ secrets.VERCEL_ORG_ID }}
```

### 8.4 Production Deployment Workflow

```yaml
# .github/workflows/deploy-production.yml
# Triggers ONLY when a PR is merged into production
name: Deploy to Production

on:
  push:
    branches: [production]

jobs:
  deploy-supabase-production:
    runs-on: ubuntu-latest
    environment: production # GitHub environment — requires manual approval

    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Apply database migrations to PRODUCTION
        run: |
          supabase db push \
            --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }} \
            --password    ${{ secrets.SUPABASE_PROD_DB_PASSWORD }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy Edge Functions to PRODUCTION
        run: |
          supabase functions deploy \
            --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-client-production:
    runs-on: ubuntu-latest
    environment: production
    needs: deploy-supabase-production
    defaults:
      run:
        working-directory: client

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install and build
        run: |
          npm ci
          npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.PROD_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.PROD_SUPABASE_ANON_KEY }}
          VITE_APP_ENV: production

      - name: Deploy to Vercel (Production)
        run: |
          npx vercel --prod \
            --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 9. Lemon Squeezy Integration

### 9.1 Webhook Handler Edge Function

All payment events from Lemon Squeezy are received via a Supabase Edge Function. This is the authoritative pattern for handling subscriptions at Saphire Labs.

```typescript
// supabase/functions/lemon-squeezy-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const WEBHOOK_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET")!;

async function verifySignature(req: Request, body: string): Promise<boolean> {
	const signature = req.headers.get("X-Signature");
	if (!signature) return false;

	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(WEBHOOK_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["verify"],
	);

	const sig = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));
	return await crypto.subtle.verify(
		"HMAC",
		key,
		sig,
		new TextEncoder().encode(body),
	);
}

serve(async (req) => {
	if (req.method !== "POST") {
		return new Response("Method Not Allowed", { status: 405 });
	}

	const body = await req.text();

	if (!(await verifySignature(req, body))) {
		return new Response("Unauthorized", { status: 401 });
	}

	const event = JSON.parse(body);

	const supabase = createClient(
		Deno.env.get("SUPABASE_URL")!,
		Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
	);

	switch (event.meta.event_name) {
		case "subscription_created":
		case "subscription_updated":
			await supabase.from("subscriptions").upsert({
				user_id: event.data.attributes.user_email,
				status: event.data.attributes.status,
				variant_id: event.data.attributes.variant_id,
				renews_at: event.data.attributes.renews_at,
				ends_at: event.data.attributes.ends_at,
			});
			break;

		case "subscription_cancelled":
			await supabase
				.from("subscriptions")
				.update({ status: "cancelled" })
				.eq("user_id", event.data.attributes.user_email);
			break;
	}

	return new Response(JSON.stringify({ received: true }), {
		headers: { "Content-Type": "application/json" },
		status: 200,
	});
});
```

### 9.2 Setting Lemon Squeezy Secrets in Edge Functions

```bash
# Development
supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=your-dev-secret \
  --project-ref YOUR_DEV_PROJECT_REF

# Staging
supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=your-staging-secret \
  --project-ref YOUR_STAGING_PROJECT_REF

# Production
supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=your-prod-secret \
  --project-ref YOUR_PROD_PROJECT_REF
```

> ⚠️ **IMPORTANT:** Use **test mode** webhooks in development/staging. Only the production Supabase project should receive live Lemon Squeezy webhooks.

---

## 10. Commit Message Convention

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This enables automated changelog generation and semantic versioning.

| Type       | Description                                             | Version Bump |
| ---------- | ------------------------------------------------------- | ------------ |
| `feat`     | A new feature                                           | MINOR        |
| `fix`      | A bug fix                                               | PATCH        |
| `chore`    | Build process, tooling, dependency updates              | None         |
| `docs`     | Documentation changes only                              | None         |
| `refactor` | Code change that neither fixes a bug nor adds a feature | None         |
| `test`     | Adding or updating tests                                | None         |
| `perf`     | Performance improvement                                 | PATCH        |
| `ci`       | Changes to GitHub Actions workflows                     | None         |
| `hotfix`   | Emergency production fix. Use sparingly.                | PATCH        |

```bash
# Format:
<type>(<scope>): <short description in present tense>

# Examples:
feat(auth): add Google OAuth sign-in
fix(payments): handle null variant_id in webhook
chore(deps): upgrade supabase-js to 2.43.0
docs(readme): update local setup instructions
ci(deploy): add staging approval gate

# Breaking changes — triggers MAJOR version bump:
feat(api)!: rename user_profile to profile

# With body and footer:
fix(auth): prevent session duplication on refresh

When multiple tabs are open, the auth state listener was firing
multiple times causing duplicate sessions in localStorage.

Closes #SL-87
```

---

## 11. Hotfix Procedure

A hotfix **bypasses** the normal `development → staging → production` flow **only** for critical production bugs. It must still be tested and reviewed.

```
┌─────────────────────────────────────────────────────────────────┐
│  HOTFIX FLOW                                                    │
│                                                                 │
│  production ──► hotfix/SL-xxx ──► PR to production (urgent)   │
│                      └──────────► PR to development (backport) │
└─────────────────────────────────────────────────────────────────┘
```

#### Step 1 — Branch from `production`

```bash
git checkout production
git pull origin production
git checkout -b hotfix/SL-101-null-variant-id
```

#### Step 2 — Implement the minimal fix

Fix **only** the critical issue. No unrelated changes.

```bash
git commit -m "hotfix(payments): handle null variant_id in LS webhook"
```

#### Step 3 — Open PRs to BOTH `production` AND `development`

```bash
git push origin hotfix/SL-101-null-variant-id

# PR to production (expedited — CTO approval required)
gh pr create --base production --head hotfix/SL-101-null-variant-id \
  --title "hotfix: handle null variant_id (#101)"

# PR to development (backport — prevents regression)
gh pr create --base development --head hotfix/SL-101-null-variant-id \
  --title "hotfix backport: handle null variant_id (#101)"
```

#### Step 4 — Tag the hotfix release after production merge

```bash
git checkout production && git pull
git tag -a v1.2.1 -m "Hotfix v1.2.1: handle null variant_id"
git push origin v1.2.1
```

---

## 12. Rules for AI Coding Agents

> 🔴 **AI AGENTS: READ THIS SECTION IN FULL BEFORE MAKING ANY CHANGES TO THE CODEBASE.**

### 12.1 What AI Agents MUST Always Do

- Work on **feature branches only**. Never commit directly to `development`, `staging`, or `production`.
- Follow the exact commit message convention defined in [Section 10](#10-commit-message-convention).
- Place all new environment variables in `.env.example` with placeholder values.
- Enable RLS on **every new Supabase table** created (see [Section 5.2](#52-row-level-security-rls)).
- Create a migration file for **every database schema change** (see [Section 5.1](#51-database-migrations)).
- Run `npx tsc --noEmit` before considering any task complete.
- Implement all payment-related logic exclusively in **Supabase Edge Functions**, never in client code.

### 12.2 What AI Agents MUST Never Do

- **Never** hardcode API keys, secrets, or credentials anywhere in source code.
- **Never** directly modify migration files in `supabase/migrations/` that have already been applied to staging or production.
- **Never** push directly to `staging` or `production` branches.
- **Never** use the Supabase `SERVICE_ROLE_KEY` in client-side React code.
- **Never** disable TypeScript strict mode or add `@ts-ignore` without an explanatory comment.
- **Never** install npm packages without checking for security advisories first (`npm audit`).

### 12.3 Agent Pre-PR Checklist

Run all of the following commands before opening a Pull Request:

```bash
# 1. TypeScript check — must pass with zero errors
cd client && npx tsc --noEmit

# 2. Lint — must pass with zero errors
npm run lint

# 3. Production build — must succeed
npm run build

# 4. Security audit — no high/critical vulnerabilities
npm audit --audit-level=high

# 5. Secret scan — must return no results
git diff --cached | grep -iE "(api_key|secret|password|token)" \
  && echo "⛔ SECRETS DETECTED — ABORT AND REMOVE BEFORE COMMITTING"
```

---

## 13. New Environment Setup Master Checklist

Use this checklist when setting up a new Saphire Labs project from scratch.

### GitHub Setup

- [ ] Create private GitHub repository with monorepo structure
- [ ] Create `development`, `staging`, and `production` branches
- [ ] Configure branch protection rules for all three branches
- [ ] Add all required GitHub Secrets (Section 7.1)
- [ ] Commit `.github/workflows/` CI/CD files
- [ ] Configure GitHub Environments with required reviewers for `production`

### Supabase Setup

- [ ] Create three separate Supabase projects (dev, staging, prod)
- [ ] Enable Point-in-Time Recovery on production project (Pro feature)
- [ ] Run `supabase init` and link to development project
- [ ] Apply initial migrations to all three environments
- [ ] Configure RLS on all tables
- [ ] Set Edge Function secrets in all three projects
- [ ] Configure webhook endpoints in Lemon Squeezy for each environment

### Client Setup

- [ ] Initialize Vite + React + TypeScript project in `client/`
- [ ] Configure Tailwind CSS
- [ ] Create `.env.example` with all required variable names (no real values)
- [ ] Implement Supabase client initializer (`src/lib/supabase.ts`)
- [ ] Implement Lemon Squeezy initializer (`src/lib/lemonsqueezy.ts`)
- [ ] Verify `vite.config.ts` is configured per Section 6.1

### Lemon Squeezy Setup

- [ ] Create **Test Mode** store for development/staging
- [ ] Create **Live** store for production
- [ ] Configure webhook endpoints pointing to Supabase Edge Functions
- [ ] Set webhook signing secrets in each Supabase project

### CI/CD Verification

- [ ] Push a test commit to `development` and verify CI passes
- [ ] Open a test PR from `development` to `staging` and verify pipeline runs
- [ ] Confirm Supabase migration is applied automatically on staging deployment
- [ ] Confirm deployment workflows trigger correctly on branch merge
- [ ] Verify production deployment requires manual approval

---

## 14. Document Version History

| Version | Date           | Author            | Changes         |
| ------- | -------------- | ----------------- | --------------- |
| 1.0.0   | March 28, 2026 | CTO, Saphire Labs | Initial release |

---

_This document is reviewed quarterly and updated whenever the technology stack or workflow changes. All engineers are responsible for reading and acknowledging updates._

---

_— End of Document — SL-SOP-001 v1.0.0 — Saphire Labs — Confidential_
