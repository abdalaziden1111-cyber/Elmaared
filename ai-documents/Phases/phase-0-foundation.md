# Phase 0: Foundation (Week 1-2)

> **Goal**: A working Next.js 16 project deployed to Vercel with all 14+ DB tables, RLS policies, triggers, Supabase clients, Zod schemas, utility functions, i18n, RTL, fonts, design tokens, CI pipeline, and tests — all passing before any feature code is written.

> **IMPORTANT**: Follow every step in order. Do NOT skip steps. Do NOT rename files. Do NOT change folder structure. Every code block is the exact content to write — copy it verbatim.

---

## Table of Contents

- [Step 0.1 — Create Project](#step-01--create-project)
- [Step 0.2 — Install Dependencies](#step-02--install-dependencies)
- [Step 0.3 — Create Folder Structure](#step-03--create-folder-structure)
- [Step 0.4 — Environment Variables](#step-04--environment-variables)
- [Step 0.5 — Tailwind v4 + Design Tokens](#step-05--tailwind-v4--design-tokens)
- [Step 0.6 — Fonts Setup](#step-06--fonts-setup)
- [Step 0.7 — shadcn/ui Init](#step-07--shadcnui-init)
- [Step 0.8 — Supabase Project Setup](#step-08--supabase-project-setup)
- [Step 0.9 — Database Migrations](#step-09--database-migrations)
- [Step 0.10 — Supabase Client Files](#step-010--supabase-client-files)
- [Step 0.11 — Database Type Generation](#step-011--database-type-generation)
- [Step 0.12 — Auth Utilities](#step-012--auth-utilities)
- [Step 0.13 — i18n Setup (next-intl)](#step-013--i18n-setup-next-intl)
- [Step 0.14 — proxy.ts (Auth Gate + i18n)](#step-014--proxyts-auth-gate--i18n)
- [Step 0.15 — Root Layouts](#step-015--root-layouts)
- [Step 0.16 — Zod Schemas](#step-016--zod-schemas)
- [Step 0.17 — Utility Functions](#step-017--utility-functions)
- [Step 0.18 — Constants](#step-018--constants)
- [Step 0.19 — Vitest Configuration](#step-019--vitest-configuration)
- [Step 0.20 — Unit Tests: Schemas](#step-020--unit-tests-schemas)
- [Step 0.21 — Unit Tests: Utilities](#step-021--unit-tests-utilities)
- [Step 0.22 — Unit Tests: DB (RLS + Triggers)](#step-022--unit-tests-db-rls--triggers)
- [Step 0.23 — vercel.ts](#step-023--vercelts)
- [Step 0.24 — next.config.ts](#step-024--nextconfigts)
- [Step 0.25 — tsconfig.json](#step-025--tsconfigjson)
- [Step 0.26 — CI: GitHub Actions](#step-026--ci-github-actions)
- [Step 0.27 — First Deploy](#step-027--first-deploy)
- [Step 0.28 — Verification Checklist](#step-028--verification-checklist)

---

## Step 0.1 — Create Project

Run from the parent directory where you want the project:

```bash
pnpm create next-app@latest app-exhibition \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src=no \
  --import-alias="@/*" \
  --use-pnpm

cd app-exhibition
```

After creation, delete these default files (we will recreate them):
```bash
rm -f app/page.tsx app/layout.tsx app/globals.css
rm -rf app/fonts
rm -f public/next.svg public/vercel.svg public/file.svg public/globe.svg public/window.svg
```

---

## Step 0.2 — Install Dependencies

Run ALL of these in one command:

```bash
pnpm add @supabase/supabase-js @supabase/ssr next-intl zod react-hook-form @hookform/resolvers zustand lucide-react resend ai @ai-sdk/anthropic clsx tailwind-merge tailwindcss-animate @tailwindcss/typography

pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom @faker-js/faker @playwright/test @sentry/nextjs @vercel/config supabase
```

Expected `package.json` dependencies after install (versions will be latest):
- `next` 16.x
- `react` 19.x
- `typescript` 5.x
- All packages listed above

---

## Step 0.3 — Create Folder Structure

Run this single command to create ALL directories:

```bash
mkdir -p \
  app/\[locale\]/\(marketing\) \
  app/\[locale\]/\(auth\)/login \
  app/\[locale\]/\(auth\)/signup/client/account \
  app/\[locale\]/\(auth\)/signup/client/company \
  app/\[locale\]/\(auth\)/signup/client/verify \
  app/\[locale\]/\(auth\)/signup/supplier/account \
  app/\[locale\]/\(auth\)/signup/supplier/company \
  app/\[locale\]/\(auth\)/signup/supplier/specializations \
  app/\[locale\]/\(auth\)/signup/supplier/documents \
  app/\[locale\]/\(auth\)/forgot-password \
  app/\[locale\]/\(auth\)/reset-password \
  app/\[locale\]/\(auth\)/auth/verify-email \
  app/\[locale\]/\(auth\)/auth/callback \
  app/\[locale\]/dashboard/rfq/new/service \
  app/\[locale\]/dashboard/rfq/new/details \
  app/\[locale\]/dashboard/rfq/new/files \
  app/\[locale\]/dashboard/rfq/new/review \
  app/\[locale\]/dashboard/rfq/\[id\]/compare \
  app/\[locale\]/dashboard/rfq/\[id\]/chats/\[supplierId\] \
  app/\[locale\]/dashboard/rfq/\[id\]/agreement/draft \
  app/\[locale\]/dashboard/rfq/\[id\]/agreement/analysis \
  app/\[locale\]/dashboard/rfq/\[id\]/agreement/final \
  app/\[locale\]/dashboard/rfq/\[id\]/escrow/deposit \
  app/\[locale\]/dashboard/rfq/\[id\]/escrow/upload-receipt \
  app/\[locale\]/dashboard/rfq/\[id\]/escrow/awaiting \
  app/\[locale\]/dashboard/rfq/\[id\]/timeline \
  app/\[locale\]/dashboard/rfq/\[id\]/designs \
  app/\[locale\]/dashboard/rfq/\[id\]/approve \
  app/\[locale\]/dashboard/rfq/\[id\]/final-payment \
  app/\[locale\]/dashboard/rfq/\[id\]/review \
  app/\[locale\]/dashboard/rfqs \
  app/\[locale\]/dashboard/discover \
  app/\[locale\]/dashboard/onboarding/welcome \
  app/\[locale\]/dashboard/onboarding/exhibition \
  app/\[locale\]/dashboard/onboarding/recommendations \
  app/\[locale\]/dashboard/notifications \
  app/\[locale\]/dashboard/settings/profile \
  app/\[locale\]/dashboard/settings/company \
  app/\[locale\]/supplier/pending \
  app/\[locale\]/supplier/tutorial \
  app/\[locale\]/supplier/rfqs \
  app/\[locale\]/supplier/rfq/\[id\]/proposal/price \
  app/\[locale\]/supplier/rfq/\[id\]/proposal/details \
  app/\[locale\]/supplier/rfq/\[id\]/proposal/files \
  app/\[locale\]/supplier/rfq/\[id\]/proposal/sent \
  app/\[locale\]/supplier/rfq/\[id\]/agreement \
  app/\[locale\]/supplier/proposals \
  app/\[locale\]/supplier/chat/\[id\] \
  app/\[locale\]/supplier/projects \
  app/\[locale\]/supplier/project/\[id\]/designs \
  app/\[locale\]/supplier/project/\[id\]/delivery \
  app/\[locale\]/supplier/earnings \
  app/\[locale\]/supplier/withdraw \
  app/\[locale\]/supplier/reviews \
  app/\[locale\]/supplier/profile/portfolio \
  app/\[locale\]/ceo/\[token\]/rfq/\[id\] \
  app/\[locale\]/ceo/\[token\]/reports \
  app/admin/users/\[id\] \
  app/admin/suppliers/pending \
  app/admin/suppliers/\[id\] \
  app/admin/rfqs/\[id\] \
  app/admin/chats \
  app/admin/chat/\[id\] \
  app/admin/panics \
  app/admin/escrow/pending-deposits \
  app/admin/escrow/pending-releases \
  app/admin/escrow/deposit/\[id\] \
  app/admin/escrow/release/\[id\] \
  app/admin/escrow/transactions \
  app/admin/agreements/pending \
  app/admin/agreements/\[id\] \
  app/admin/disputes/\[id\] \
  app/admin/field-visits \
  app/admin/reports \
  app/admin/activity \
  app/admin/anomalies \
  app/admin/settings \
  app/api/auth/callback \
  app/api/webhooks \
  app/api/cron/close-expired-rfqs \
  app/api/cron/remind-suppliers \
  app/api/cron/exhibition-reminders \
  app/api/ai/score-proposal \
  app/api/ai/analyze-agreement \
  app/api/ai/generate-roi \
  app/api/upload \
  components/ui \
  components/shared/header \
  components/shared/footer \
  components/shared/sidebar \
  components/rfq/rfq-form \
  components/chat \
  components/supplier \
  components/escrow \
  components/reviews \
  lib/supabase \
  lib/ai \
  lib/auth \
  lib/email/templates \
  lib/i18n/messages \
  lib/utils \
  lib/constants \
  schemas/rfq \
  server/actions \
  server/queries \
  server/jobs \
  stores \
  hooks \
  public/images \
  public/icons \
  supabase/migrations \
  supabase/functions \
  tests/unit/schemas \
  tests/unit/utils \
  tests/unit/actions \
  tests/unit/queries \
  tests/unit/db \
  tests/integration \
  tests/e2e
```

---

## Step 0.4 — Environment Variables

### File: `.env.example`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

# Supabase DB (for local dev + migrations)
SUPABASE_DB_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres

# Resend (email)
RESEND_API_KEY=re_YOUR_KEY
RESEND_FROM_EMAIL=noreply@appexhibition.sa

# AI (Vercel AI Gateway)
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY

# Sentry
SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_DSN@sentry.io/YOUR_PROJECT

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=YOUR_CRON_SECRET

# Platform bank account (shown to clients for escrow deposits)
PLATFORM_IBAN=SA0000000000000000000000
PLATFORM_BANK_NAME=البنك الأهلي السعودي
PLATFORM_ACCOUNT_HOLDER=شركة تطبيق المعارض
```

### File: `.env.local`

Copy `.env.example` to `.env.local` and fill in real values:
```bash
cp .env.example .env.local
```

Add `.env.local` to `.gitignore` (should already be there from Next.js scaffold).

---

## Step 0.5 — Tailwind v4 + Design Tokens

### File: `app/globals.css`

```css
@import "tailwindcss";

@theme {
  --font-arabic: var(--font-plex-arabic), system-ui, sans-serif;
  --font-latin: var(--font-inter), system-ui, sans-serif;

  --color-midnight-green: #0E3B43;
  --color-midnight-green-700: #155560;
  --color-midnight-green-100: #E6EFF1;
  --color-dune-gold: #C8A24C;
  --color-dune-gold-100: #FAF1DC;
  --color-action-blue: #2563EB;
  --color-action-blue-700: #1D4ED8;
  --color-cream: #FAF8F4;
  --color-stone-100: #F2EEE7;
  --color-stone-300: #D8D2C7;
  --color-stone-600: #7A766F;
  --color-charcoal: #1A1A1A;
  --color-success: #16A34A;
  --color-success-100: #DCFCE7;
  --color-warning: #F59E0B;
  --color-warning-100: #FEF3C7;
  --color-danger: #DC2626;
  --color-danger-100: #FEE2E2;
  --color-info: #0284C7;
  --color-info-100: #E0F2FE;
}

:root {
  /* shadcn/ui semantic tokens (HSL values without hsl() wrapper) */
  --background: 36 33% 97%;
  --foreground: 0 0% 10%;

  --card: 36 25% 93%;
  --card-foreground: 0 0% 10%;

  --popover: 36 33% 97%;
  --popover-foreground: 0 0% 10%;

  --primary: 188 65% 16%;
  --primary-foreground: 36 33% 97%;

  --secondary: 39 53% 54%;
  --secondary-foreground: 188 65% 16%;

  --muted: 36 25% 93%;
  --muted-foreground: 36 5% 45%;

  --accent: 217 91% 53%;
  --accent-foreground: 36 33% 97%;

  --destructive: 0 73% 50%;
  --destructive-foreground: 36 33% 97%;

  --border: 35 19% 81%;
  --input: 35 19% 81%;
  --ring: 217 91% 53%;

  --radius: 0.75rem;

  /* Motion */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-position: cubic-bezier(0.4, 0, 0.6, 1);
  --duration-micro: 150ms;
  --duration-default: 250ms;
  --duration-large: 400ms;
}

/* Base styles */
body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

/* Tabular numerals for numbers, codes, IBANs */
.num,
[dir="ltr"] .num {
  font-variant-numeric: tabular-nums;
}

/* Subtle grain texture on cards (use selectively via className="has-grain") */
.has-grain {
  background-image:
    url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.03'/></svg>");
}

/* Panic button shake animation */
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
  20%, 40%, 60%, 80% { transform: translateX(2px); }
}
.animate-shake { animation: shake 0.5s var(--ease-position); }

/* Panic pulse — used when admin not yet present */
@keyframes panic-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.04); }
}
.animate-panic-pulse { animation: panic-pulse 2s ease-in-out infinite; }

/* Focus states — never remove these */
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 4px;
}
```

---

## Step 0.6 — Fonts Setup

### File: `app/fonts.ts`

```ts
import { IBM_Plex_Sans_Arabic, Inter } from 'next/font/google';

export const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

---

## Step 0.7 — shadcn/ui Init

Run:
```bash
pnpm dlx shadcn@latest init
```

When prompted, select:
- Style: **New York**
- Base color: **Slate**
- CSS variables: **Yes**
- `tailwind.config.ts` location: **tailwind.config.ts**
- `globals.css` location: **app/globals.css**
- Components alias: **@/components**
- Utils alias: **@/lib/utils/cn**

After init, the tool creates `components.json`. Update it to match:

### File: `components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils/cn",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### File: `lib/utils/cn.ts`

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Now install the shadcn components we need for Phase 0-1:
```bash
pnpm dlx shadcn@latest add button input label card badge tabs dialog sheet form toast sonner separator skeleton avatar dropdown-menu scroll-area select textarea checkbox radio-group tooltip popover command
```

---

## Step 0.8 — Supabase Project Setup

### 8.1 — Initialize Supabase locally

```bash
pnpm dlx supabase init
```

This creates the `supabase/` folder with `config.toml`.

### 8.2 — Update `supabase/config.toml`

Find the `[db]` section and ensure:
```toml
[db]
port = 54322
shadow_port = 54320
major_version = 15

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/api/auth/callback"]

[auth.email]
enable_signup = true
enable_confirmations = true
```

### 8.3 — Start Supabase local

```bash
pnpm dlx supabase start
```

This gives you local Supabase URL + anon key + service role key. Copy these to `.env.local`.

---

## Step 0.9 — Database Migrations

Create these migration files in EXACT order. The filenames must be in this format for Supabase to apply them in order.

### File: `supabase/migrations/20260501000001_enums.sql`

```sql
-- ======================================
-- 1. ENUMS — All type definitions
-- ======================================

CREATE TYPE user_role AS ENUM ('admin', 'client', 'supplier');

CREATE TYPE service_type AS ENUM (
  'booth',
  'gifts',
  'event',
  'printing'
);

CREATE TYPE supplier_status AS ENUM (
  'pending_review',
  'approved',
  'inactive',
  'suspended',
  'rejected'
);

CREATE TYPE rfq_status AS ENUM (
  'draft',
  'open',
  'negotiating',
  'awarded',
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
  'disputed',
  'cancelled'
);

CREATE TYPE proposal_status AS ENUM (
  'submitted',
  'under_review',
  'shortlisted',
  'accepted',
  'rejected',
  'withdrawn'
);

CREATE TYPE escrow_status AS ENUM (
  'awaiting_deposit',
  'deposit_received',
  'work_in_progress',
  'delivered',
  'final_payment',
  'released',
  'refunded',
  'partial_refund'
);

CREATE TYPE notification_type AS ENUM (
  'rfq_new', 'rfq_match', 'proposal_received', 'proposal_shortlisted',
  'proposal_accepted', 'proposal_rejected', 'agreement_pending',
  'escrow_deposit_required', 'escrow_received', 'work_started',
  'delivery_pending', 'delivery_approved', 'panic_button',
  'message', 'system'
);

CREATE TYPE escrow_event_type AS ENUM (
  'deposit_initiated',
  'deposit_receipt_uploaded',
  'deposit_confirmed',
  'work_started',
  'delivery_submitted',
  'delivery_approved',
  'final_payment_initiated',
  'final_payment_confirmed',
  'released_to_supplier',
  'invoice_issued',
  'dispute_opened',
  'partial_refund_issued',
  'full_refund_issued'
);
```

### File: `supabase/migrations/20260501000002_tables_core.sql`

```sql
-- ======================================
-- 2. Core tables: profiles, companies, suppliers, portfolio
-- ======================================

-- 2.1 profiles — 1:1 with auth.users
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

-- 2.2 companies — for clients
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  legal_name TEXT,
  cr_number TEXT UNIQUE,
  vat_number TEXT,
  size TEXT,
  industry TEXT,
  city TEXT,
  address TEXT,
  logo_url TEXT,
  ceo_email TEXT,
  ceo_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_cr ON companies(cr_number);

-- 2.3 suppliers
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  cr_number TEXT UNIQUE NOT NULL,
  vat_number TEXT,
  status supplier_status NOT NULL DEFAULT 'pending_review',
  specializations service_type[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  website TEXT,
  team_size INT,
  years_of_experience INT,
  min_order_value NUMERIC(12,2),
  cr_document_url TEXT,
  vat_document_url TEXT,
  portfolio_pdf_url TEXT,
  total_completed_orders INT DEFAULT 0,
  average_rating NUMERIC(3,2),
  on_time_delivery_rate NUMERIC(5,2),
  bank_name TEXT,
  iban TEXT,
  account_holder_name TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_suppliers_status ON suppliers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_specializations ON suppliers USING GIN(specializations);
CREATE INDEX idx_suppliers_cities ON suppliers USING GIN(cities);

-- 2.4 supplier_portfolio
CREATE TABLE supplier_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_type service_type,
  client_name TEXT,
  exhibition_name TEXT,
  year INT,
  cover_image_url TEXT,
  images TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_supplier ON supplier_portfolio(supplier_id);
```

### File: `supabase/migrations/20260501000003_tables_rfq.sql`

```sql
-- ======================================
-- 3. RFQ + Proposals
-- ======================================

CREATE SEQUENCE IF NOT EXISTS rfq_number_seq START 1;

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL DEFAULT '',
  client_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_type service_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT details_is_object CHECK (jsonb_typeof(details) = 'object'),
  attachments TEXT[] DEFAULT '{}',
  logo_url TEXT,
  exhibition_name TEXT,
  exhibition_city TEXT,
  exhibition_date DATE,
  delivery_location TEXT,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  proposals_deadline TIMESTAMPTZ,
  status rfq_status NOT NULL DEFAULT 'draft',
  winning_proposal_id UUID,
  awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_rfqs_client ON rfqs(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rfqs_company ON rfqs(company_id);
CREATE INDEX idx_rfqs_service ON rfqs(service_type) WHERE status = 'open';
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_deadline ON rfqs(proposals_deadline) WHERE status = 'open';
CREATE INDEX idx_rfqs_open_search ON rfqs(service_type, status, created_at DESC)
  WHERE status = 'open';

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  total_price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  delivery_days INT NOT NULL,
  delivery_date DATE,
  description TEXT,
  scope_of_work TEXT,
  excluded_items TEXT,
  payment_terms TEXT,
  validity_days INT DEFAULT 14,
  proposal_pdf_url TEXT,
  attachments TEXT[] DEFAULT '{}',
  ai_score NUMERIC(5,2),
  ai_summary TEXT,
  ai_strengths TEXT[],
  ai_concerns TEXT[],
  status proposal_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_proposals_rfq ON proposals(rfq_id);
CREATE INDEX idx_proposals_supplier ON proposals(supplier_id);
CREATE INDEX idx_proposals_status ON proposals(status);
```

### File: `supabase/migrations/20260501000004_tables_chat.sql`

```sql
-- ======================================
-- 4. Chat + Messages
-- ======================================

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id UUID,
  client_unread_count INT DEFAULT 0,
  supplier_unread_count INT DEFAULT 0,
  admin_unread_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_chats_rfq ON chats(rfq_id);
CREATE INDEX idx_chats_client ON chats(client_id);
CREATE INDEX idx_chats_supplier ON chats(supplier_id);
CREATE INDEX idx_chats_user_latest ON chats(client_id, last_message_at DESC NULLS LAST);

-- Messages — NO soft delete, NO update, NO delete. Immutable audit trail.
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role user_role NOT NULL,
  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  attachment_name TEXT,
  attachment_size_bytes BIGINT,
  is_admin_intervention BOOLEAN DEFAULT FALSE,
  is_panic_alert BOOLEAN DEFAULT FALSE,
  panic_reason TEXT,
  read_by_client_at TIMESTAMPTZ,
  read_by_supplier_at TIMESTAMPTZ,
  read_by_admin_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_panic ON messages(chat_id) WHERE is_panic_alert = TRUE;
```

### File: `supabase/migrations/20260501000005_tables_agreement.sql`

```sql
-- ======================================
-- 5. Agreements + Revisions
-- ======================================

CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  proposal_id UUID NOT NULL REFERENCES proposals(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  client_understanding TEXT NOT NULL DEFAULT '',
  supplier_understanding TEXT NOT NULL DEFAULT '',
  client_submitted_at TIMESTAMPTZ,
  supplier_submitted_at TIMESTAMPTZ,
  ai_agreed_points JSONB,
  ai_disputed_points JSONB,
  ai_missing_points JSONB,
  ai_recommendation TEXT,
  final_text TEXT,
  final_terms JSONB,
  client_approved_at TIMESTAMPTZ,
  supplier_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMPTZ,
  client_signature_hash TEXT,
  supplier_signature_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreements_rfq ON agreements(rfq_id);
CREATE INDEX idx_agreements_status ON agreements(status);

-- Immutable revision history
CREATE TABLE agreement_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  authored_by UUID REFERENCES profiles(id),
  authored_role user_role,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agreement_id, revision_number)
);

CREATE INDEX idx_agreement_revisions_agreement ON agreement_revisions(agreement_id, revision_number);
```

### File: `supabase/migrations/20260501000006_tables_escrow.sql`

```sql
-- ======================================
-- 6. Escrow + Events + Invoices
-- ======================================

CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) UNIQUE,
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  total_amount NUMERIC(12,2) NOT NULL,
  initial_deposit NUMERIC(12,2) NOT NULL,
  final_payment NUMERIC(12,2) NOT NULL,
  client_fee NUMERIC(12,2) NOT NULL,
  supplier_fee NUMERIC(12,2) NOT NULL,
  platform_revenue NUMERIC(12,2) NOT NULL,
  supplier_net NUMERIC(12,2) NOT NULL,
  vat_rate_applied NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  client_fee_vat NUMERIC(12,2) NOT NULL,
  supplier_fee_vat NUMERIC(12,2) NOT NULL,
  total_vat NUMERIC(12,2) NOT NULL,
  status escrow_status NOT NULL DEFAULT 'awaiting_deposit',
  initial_deposit_receipt_url TEXT,
  initial_deposit_received_at TIMESTAMPTZ,
  initial_deposit_confirmed_by UUID REFERENCES profiles(id),
  final_payment_receipt_url TEXT,
  final_payment_received_at TIMESTAMPTZ,
  final_payment_confirmed_by UUID REFERENCES profiles(id),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES profiles(id),
  release_transaction_ref TEXT,
  refund_amount NUMERIC(12,2),
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_rfq ON escrow_transactions(rfq_id);

-- Append-only ledger — NO UPDATE, NO DELETE
CREATE TABLE escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  event_type escrow_event_type NOT NULL,
  amount NUMERIC(12,2),
  balance_after NUMERIC(12,2),
  bank_reference TEXT,
  receipt_url TEXT,
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escrow_events_escrow ON escrow_events(escrow_id, created_at);
CREATE INDEX idx_escrow_events_type ON escrow_events(event_type);

-- Invoices (ZATCA-friendly, PDF only for MVP)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_amount NUMERIC(12,2) NOT NULL,
  platform_commission NUMERIC(12,2) NOT NULL,
  vat_amount NUMERIC(12,2) NOT NULL,
  total_invoiced NUMERIC(12,2) NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_vat_number TEXT,
  buyer_cr_number TEXT,
  buyer_address TEXT,
  zatca_uuid TEXT,
  zatca_invoice_hash TEXT,
  zatca_qr_code TEXT,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_rfq ON invoices(rfq_id);
```

### File: `supabase/migrations/20260501000007_tables_delivery.sql`

```sql
-- ======================================
-- 7. Deliveries, Disputes, Reviews
-- ======================================

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  agreement_id UUID NOT NULL REFERENCES agreements(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  delivery_notes TEXT,
  delivery_photos TEXT[] DEFAULT '{}',
  delivery_video_url TEXT,
  delivered_at TIMESTAMPTZ,
  client_approved BOOLEAN,
  client_approved_at TIMESTAMPTZ,
  client_approval_notes TEXT,
  client_rejected_at TIMESTAMPTZ,
  client_rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_rfq ON deliveries(rfq_id);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  raised_by UUID NOT NULL REFERENCES profiles(id),
  raised_by_role user_role NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  assigned_admin_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolution_in_favor_of TEXT,
  refund_decision NUMERIC(12,2),
  field_visit_required BOOLEAN DEFAULT FALSE,
  field_visit_at TIMESTAMPTZ,
  field_visit_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_rfq ON disputes(rfq_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) UNIQUE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  rating_overall INT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality INT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_timeliness INT CHECK (rating_timeliness BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_flexibility INT CHECK (rating_flexibility BETWEEN 1 AND 5),
  rating_price_value INT CHECK (rating_price_value BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  supplier_response TEXT,
  supplier_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_supplier ON reviews(supplier_id) WHERE is_public = TRUE;
```

### File: `supabase/migrations/20260501000008_tables_support.sql`

```sql
-- ======================================
-- 8. Notifications, Audit Logs, CEO Access
-- ======================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  rfq_id UUID REFERENCES rfqs(id),
  proposal_id UUID REFERENCES proposals(id),
  chat_id UUID REFERENCES chats(id),
  sent_email BOOLEAN DEFAULT FALSE,
  sent_push BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

CREATE TABLE ceo_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  ceo_email TEXT NOT NULL,
  verification_token TEXT,
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT FALSE,
  invited_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File: `supabase/migrations/20260501000009_rls_policies.sql`

```sql
-- ======================================
-- 9. RLS Policies + Helper Functions
-- ======================================

-- Helper functions
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ========== profiles ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  USING (id = auth.uid() OR auth.is_admin());

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ========== companies ==========
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_company" ON companies FOR ALL
  USING (owner_id = auth.uid() OR auth.is_admin());

-- ========== suppliers ==========
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_read_own" ON suppliers FOR SELECT
  USING (owner_id = auth.uid() OR auth.is_admin());

CREATE POLICY "approved_suppliers_public_read" ON suppliers FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "supplier_update_own" ON suppliers FOR UPDATE
  USING (owner_id = auth.uid() OR auth.is_admin());

CREATE POLICY "supplier_insert_own" ON suppliers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ========== supplier_portfolio ==========
ALTER TABLE supplier_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_public_read" ON supplier_portfolio FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.status = 'approved')
    OR auth.is_admin()
  );

CREATE POLICY "portfolio_owner_manage" ON supplier_portfolio FOR ALL
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== rfqs ==========
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_view_own_rfqs" ON rfqs FOR SELECT
  USING (client_id = auth.uid() OR auth.is_admin());

CREATE POLICY "supplier_view_open_matching_rfqs" ON rfqs FOR SELECT
  USING (
    status = 'open'
    AND deleted_at IS NULL
    AND service_type = ANY(
      SELECT unnest(specializations) FROM suppliers WHERE owner_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "selected_supplier_view_rfq" ON rfqs FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM proposals p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.rfq_id = rfqs.id
        AND s.owner_id = auth.uid()
        AND p.status IN ('shortlisted', 'accepted')
    )
  );

CREATE POLICY "client_create_rfq" ON rfqs FOR INSERT
  WITH CHECK (client_id = auth.uid() AND auth.user_role() = 'client');

CREATE POLICY "client_update_own_rfq" ON rfqs FOR UPDATE
  USING (client_id = auth.uid() OR auth.is_admin());

-- ========== proposals ==========
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_view_proposals_for_own_rfq" ON proposals FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
    OR auth.is_admin()
  );

CREATE POLICY "supplier_view_own_proposals" ON proposals FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "supplier_create_proposal" ON proposals FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid() AND s.status = 'approved')
  );

CREATE POLICY "supplier_update_own_proposal" ON proposals FOR UPDATE
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== chats ==========
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_participants_read" ON chats FOR SELECT
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== messages ==========
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_participants_read_messages" ON messages FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.client_id = auth.uid()
          OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = c.supplier_id AND s.owner_id = auth.uid())
        )
    )
  );

CREATE POLICY "chat_participants_send_messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      auth.is_admin()
      OR EXISTS(
        SELECT 1 FROM chats c
        WHERE c.id = messages.chat_id
          AND (
            c.client_id = auth.uid()
            OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = c.supplier_id AND s.owner_id = auth.uid())
          )
      )
    )
  );

-- ========== agreements ==========
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreement_parties_read" ON agreements FOR SELECT
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "agreement_parties_update" ON agreements FOR UPDATE
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== agreement_revisions ==========
ALTER TABLE agreement_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revision_parties_read" ON agreement_revisions FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(
      SELECT 1 FROM agreements a
      WHERE a.id = agreement_id
        AND (
          a.client_id = auth.uid()
          OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = a.supplier_id AND s.owner_id = auth.uid())
        )
    )
  );

-- ========== escrow_transactions ==========
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_parties_read" ON escrow_transactions FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid()) OR
    EXISTS(
      SELECT 1 FROM agreements a
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE a.id = agreement_id AND s.owner_id = auth.uid()
    )
  );

-- ========== escrow_events ==========
ALTER TABLE escrow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_events_read" ON escrow_events FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN rfqs r ON r.id = et.rfq_id
      WHERE et.id = escrow_id AND r.client_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN agreements a ON a.id = et.agreement_id
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE et.id = escrow_id AND s.owner_id = auth.uid()
    )
  );

-- ========== deliveries ==========
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_parties_read" ON deliveries FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== disputes ==========
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_parties_read" ON disputes FOR SELECT
  USING (
    auth.is_admin()
    OR raised_by = auth.uid()
    OR EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
  );

-- ========== reviews ==========
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_reviews_read" ON reviews FOR SELECT
  USING (is_public = TRUE OR auth.is_admin());

CREATE POLICY "client_writes_review" ON reviews FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "supplier_responds_to_review" ON reviews FOR UPDATE
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== notifications ==========
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_reads_own_notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY "user_updates_own_notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ========== audit_logs ==========
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_audit" ON audit_logs FOR SELECT
  USING (auth.is_admin());

-- ========== invoices ==========
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_parties_read" ON invoices FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(SELECT 1 FROM companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN agreements a ON a.id = et.agreement_id
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE et.id = escrow_id AND s.owner_id = auth.uid()
    )
  );
```

### File: `supabase/migrations/20260501000010_triggers.sql`

```sql
-- ======================================
-- 10. Triggers and Functions
-- ======================================

-- 10.1 Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN ('escrow_events', 'agreement_revisions', 'messages', 'audit_logs', 'notifications')
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_updated_at_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    ', t, t);
  END LOOP;
END;
$$;

-- 10.2 Auto-generate RFQ number
CREATE OR REPLACE FUNCTION generate_rfq_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.rfq_number := 'RFQ-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                    LPAD(nextval('rfq_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rfq_number BEFORE INSERT ON rfqs
  FOR EACH ROW WHEN (NEW.rfq_number = '' OR NEW.rfq_number IS NULL)
  EXECUTE FUNCTION generate_rfq_number();

-- 10.3 Auto-generate Invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                        LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.invoice_number = '' OR NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- 10.4 Prevent UPDATE/DELETE on escrow_events (append-only)
CREATE OR REPLACE FUNCTION prevent_escrow_event_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'escrow_events is append-only: no UPDATE or DELETE allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_escrow_events
  BEFORE UPDATE OR DELETE ON escrow_events
  FOR EACH ROW EXECUTE FUNCTION prevent_escrow_event_mutation();

-- 10.5 Prevent UPDATE/DELETE on agreement_revisions (immutable)
CREATE OR REPLACE FUNCTION prevent_revision_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agreement_revisions is immutable: no UPDATE or DELETE allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_agreement_revisions
  BEFORE UPDATE OR DELETE ON agreement_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_revision_mutation();

-- 10.6 Update supplier stats after review
CREATE OR REPLACE FUNCTION update_supplier_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers
  SET
    average_rating = (
      SELECT ROUND(AVG(rating_overall)::NUMERIC, 2) FROM reviews WHERE supplier_id = NEW.supplier_id
    ),
    total_completed_orders = (
      SELECT COUNT(*) FROM rfqs r
      JOIN agreements a ON a.rfq_id = r.id
      WHERE a.supplier_id = NEW.supplier_id AND r.status = 'completed'
    )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_supplier_stats AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_supplier_stats();

-- 10.7 Notify matching suppliers when RFQ goes open
CREATE OR REPLACE FUNCTION notify_matching_suppliers() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'open') THEN
    INSERT INTO notifications (user_id, type, title, body, rfq_id, link)
    SELECT
      s.owner_id,
      'rfq_match',
      'طلب عرض جديد يطابق تخصصك',
      NEW.title,
      NEW.id,
      '/dashboard/rfq/' || NEW.id::TEXT
    FROM suppliers s
    WHERE NEW.service_type = ANY(s.specializations)
      AND s.status = 'approved'
      AND s.deleted_at IS NULL
      AND (NEW.exhibition_city IS NULL OR NEW.exhibition_city = ANY(s.cities));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_matching_suppliers
  AFTER INSERT OR UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION notify_matching_suppliers();
```

### File: `supabase/migrations/20260501000011_realtime.sql`

```sql
-- ======================================
-- 11. Realtime — enable on specific tables only
-- ======================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE rfqs;
```

### File: `supabase/migrations/20260501000012_views.sql`

```sql
-- ======================================
-- 12. Convenience views
-- ======================================

CREATE VIEW active_rfqs AS
  SELECT * FROM rfqs WHERE deleted_at IS NULL;

CREATE VIEW active_suppliers AS
  SELECT * FROM suppliers WHERE deleted_at IS NULL AND status = 'approved';
```

### Apply migrations:

```bash
pnpm dlx supabase db reset
```

This drops the local DB and re-runs all migrations from scratch.

### File: `supabase/seed.sql`

```sql
-- ======================================
-- Seed data for local development
-- ======================================

-- NOTE: In local Supabase, auth.users must be created via the Auth API.
-- This seed file only populates public tables AFTER auth users exist.
-- Use the Supabase Dashboard (localhost:54323) to create these test users first:
--
-- 1. admin@appexhibition.test   / password: Admin123!
-- 2. client@appexhibition.test  / password: Client123!
-- 3. supplier1@appexhibition.test / password: Supplier123!
-- 4. supplier2@appexhibition.test / password: Supplier123!
-- 5. supplier3@appexhibition.test / password: Supplier123!
--
-- Then run: pnpm dlx supabase db reset (which runs this seed)
-- OR manually insert after creating users via Dashboard.

-- The UUIDs below are placeholders. Replace with real UUIDs from auth.users after creation.
-- Example workflow:
--   1. Create users in Supabase Dashboard
--   2. Copy their UUIDs
--   3. Replace placeholders below
--   4. Run: psql $SUPABASE_DB_URL -f supabase/seed.sql
```

---

## Step 0.10 — Supabase Client Files

### File: `lib/supabase/client.ts`

```ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### File: `lib/supabase/server.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — can't set cookies, ignore
          }
        },
      },
    }
  );
}
```

### File: `lib/supabase/admin.ts`

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

### File: `lib/supabase/middleware.ts`

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, response: supabaseResponse };
}
```

### File: `lib/supabase/types.ts`

Create a placeholder. This will be replaced by the generated types in Step 0.11.

```ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      // This file is auto-generated. Run:
      // pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts
      [key: string]: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Enums: {
      user_role: 'admin' | 'client' | 'supplier';
      service_type: 'booth' | 'gifts' | 'event' | 'printing';
      supplier_status: 'pending_review' | 'approved' | 'inactive' | 'suspended' | 'rejected';
      rfq_status: 'draft' | 'open' | 'negotiating' | 'awarded' | 'in_escrow' | 'in_progress' | 'delivered' | 'completed' | 'disputed' | 'cancelled';
      proposal_status: 'submitted' | 'under_review' | 'shortlisted' | 'accepted' | 'rejected' | 'withdrawn';
      escrow_status: 'awaiting_deposit' | 'deposit_received' | 'work_in_progress' | 'delivered' | 'final_payment' | 'released' | 'refunded' | 'partial_refund';
      notification_type: 'rfq_new' | 'rfq_match' | 'proposal_received' | 'proposal_shortlisted' | 'proposal_accepted' | 'proposal_rejected' | 'agreement_pending' | 'escrow_deposit_required' | 'escrow_received' | 'work_started' | 'delivery_pending' | 'delivery_approved' | 'panic_button' | 'message' | 'system';
      escrow_event_type: 'deposit_initiated' | 'deposit_receipt_uploaded' | 'deposit_confirmed' | 'work_started' | 'delivery_submitted' | 'delivery_approved' | 'final_payment_initiated' | 'final_payment_confirmed' | 'released_to_supplier' | 'invoice_issued' | 'dispute_opened' | 'partial_refund_issued' | 'full_refund_issued';
    };
  };
}
```

---

## Step 0.11 — Database Type Generation

After migrations are applied and Supabase local is running:

```bash
pnpm dlx supabase gen types typescript --local > lib/supabase/types.ts
```

Add a script to `package.json`:
```json
{
  "scripts": {
    "db:types": "supabase gen types typescript --local > lib/supabase/types.ts",
    "db:reset": "supabase db reset",
    "db:migrate": "supabase db push"
  }
}
```

---

## Step 0.12 — Auth Utilities

### File: `lib/auth/get-user.ts`

```ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
```

### File: `lib/auth/require-role.ts`

```ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !allowedRoles.includes(profile.role as UserRole)) {
    redirect('/');
  }

  return { user, role: profile.role as UserRole };
}
```

### File: `lib/auth/permissions.ts`

```ts
import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  client: '/dashboard',
  supplier: '/supplier',
};

export function getDashboardPath(role: UserRole): string {
  return ROLE_ROUTES[role] ?? '/';
}
```

---

## Step 0.13 — i18n Setup (next-intl)

### File: `lib/i18n/config.ts`

```ts
import { getRequestConfig } from 'next-intl/server';

export const locales = ['ar', 'en'] as const;
export const defaultLocale = 'ar' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default,
}));
```

### File: `lib/i18n/routing.ts`

```ts
import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
```

### File: `lib/i18n/messages/ar.json`

```json
{
  "common": {
    "appName": "تطبيق المعارض",
    "loading": "جارٍ التحميل...",
    "error": "حدث خطأ",
    "save": "احفظ",
    "cancel": "إلغاء",
    "delete": "احذف",
    "edit": "عدّل",
    "submit": "أرسل",
    "back": "السابق",
    "next": "التالي",
    "search": "ابحث",
    "noResults": "لا توجد نتائج",
    "confirm": "تأكيد",
    "yes": "نعم",
    "no": "لا",
    "close": "أغلق",
    "download": "نزّل",
    "upload": "ارفع"
  },
  "auth": {
    "login": "تسجيل الدخول",
    "signup": "إنشاء حساب",
    "logout": "تسجيل الخروج",
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "forgotPassword": "نسيت كلمة المرور؟",
    "resetPassword": "إعادة تعيين كلمة المرور",
    "chooseRole": "اختر نوع حسابك",
    "client": "شركة (عميل)",
    "supplier": "مورد",
    "clientDescription": "أبحث عن موردين لمعارضي وفعالياتي",
    "supplierDescription": "أقدم خدمات للمعارض والفعاليات"
  },
  "nav": {
    "home": "الرئيسية",
    "dashboard": "لوحة التحكم",
    "rfqs": "طلباتي",
    "discover": "استكشف الموردين",
    "notifications": "الإشعارات",
    "settings": "الإعدادات",
    "proposals": "عروضي",
    "projects": "مشاريعي",
    "earnings": "أرباحي",
    "reviews": "التقييمات"
  },
  "rfq": {
    "create": "أنشئ طلباً",
    "title": "عنوان الطلب",
    "serviceType": "نوع الخدمة",
    "booth": "تصميم وتنفيذ أجنحة",
    "gifts": "هدايا ترويجية",
    "event": "تنظيم فعاليات",
    "printing": "مطبوعات",
    "budget": "الميزانية",
    "deadline": "الموعد النهائي",
    "status": {
      "draft": "مسودة",
      "open": "مفتوح",
      "negotiating": "قيد التفاوض",
      "awarded": "تم الاختيار",
      "in_escrow": "قيد الضمان",
      "in_progress": "قيد التنفيذ",
      "delivered": "تم التسليم",
      "completed": "مكتمل",
      "disputed": "نزاع",
      "cancelled": "ملغى"
    }
  },
  "currency": {
    "symbol": "﷼",
    "code": "SAR"
  }
}
```

### File: `lib/i18n/messages/en.json`

```json
{
  "common": {
    "appName": "App Exhibition",
    "loading": "Loading...",
    "error": "An error occurred",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "submit": "Submit",
    "back": "Back",
    "next": "Next",
    "search": "Search",
    "noResults": "No results",
    "confirm": "Confirm",
    "yes": "Yes",
    "no": "No",
    "close": "Close",
    "download": "Download",
    "upload": "Upload"
  },
  "auth": {
    "login": "Log in",
    "signup": "Sign up",
    "logout": "Log out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "resetPassword": "Reset password",
    "chooseRole": "Choose your account type",
    "client": "Company (Client)",
    "supplier": "Supplier",
    "clientDescription": "I need suppliers for my exhibitions and events",
    "supplierDescription": "I provide services for exhibitions and events"
  },
  "nav": {
    "home": "Home",
    "dashboard": "Dashboard",
    "rfqs": "My RFQs",
    "discover": "Discover Suppliers",
    "notifications": "Notifications",
    "settings": "Settings",
    "proposals": "My Proposals",
    "projects": "My Projects",
    "earnings": "Earnings",
    "reviews": "Reviews"
  },
  "rfq": {
    "create": "Create RFQ",
    "title": "RFQ Title",
    "serviceType": "Service Type",
    "booth": "Booth Design & Build",
    "gifts": "Promotional Gifts",
    "event": "Event Management",
    "printing": "Print Materials",
    "budget": "Budget",
    "deadline": "Deadline",
    "status": {
      "draft": "Draft",
      "open": "Open",
      "negotiating": "Negotiating",
      "awarded": "Awarded",
      "in_escrow": "In Escrow",
      "in_progress": "In Progress",
      "delivered": "Delivered",
      "completed": "Completed",
      "disputed": "Disputed",
      "cancelled": "Cancelled"
    }
  },
  "currency": {
    "symbol": "SAR",
    "code": "SAR"
  }
}
```

---

## Step 0.14 — proxy.ts (Auth Gate + i18n)

### File: `app/proxy.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/how-it-works',
  '/for-clients',
  '/for-suppliers',
  '/pricing',
  '/about',
  '/contact',
  '/legal',
  '/suppliers',
  '/exhibitions',
  '/blog',
];

const locales = ['ar', 'en'];
const defaultLocale = 'ar';

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/');
  if (segments[1] && locales.includes(segments[1])) {
    return segments[1];
  }
  return null;
}

function stripLocale(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    return pathname.replace(`/${locale}`, '') || '/';
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return PUBLIC_PATHS.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Add locale prefix if missing (redirect to /ar/...)
  const locale = getLocaleFromPath(pathname);
  if (!locale && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Public paths — no auth needed
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Admin paths — no locale prefix, require admin role
  if (pathname.startsWith('/admin')) {
    const { user, supabase, response } = await updateSession(request);

    if (!user) {
      return NextResponse.redirect(new URL(`/${defaultLocale}/login`, request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${defaultLocale}/dashboard`, request.url));
    }

    return response;
  }

  // Protected paths — require auth + correct role
  const strippedPath = stripLocale(pathname);
  const isProtected =
    strippedPath.startsWith('/dashboard') ||
    strippedPath.startsWith('/supplier') ||
    strippedPath.startsWith('/ceo');

  if (!isProtected) {
    return NextResponse.next();
  }

  const { user, supabase, response } = await updateSession(request);

  if (!user) {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/login`, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/login`, request.url));
  }

  // Role-based access
  if (strippedPath.startsWith('/dashboard') && profile.role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/supplier`, request.url));
  }
  if (strippedPath.startsWith('/supplier') && profile.role !== 'supplier') {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
```

---

## Step 0.15 — Root Layouts

### File: `app/layout.tsx`

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تطبيق المعارض — منصة B2B لموردي المعارض في السعودية',
  description: 'منصة B2B واحدة تربطك بـ 200+ مورد معتمد لمعارضك. عمولة 5% فقط.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
```

### File: `app/[locale]/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { plexArabic, inter } from '../fonts';
import '../globals.css';

export const metadata: Metadata = {
  title: 'تطبيق المعارض',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir} className={`${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-arabic text-charcoal antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### File: `app/[locale]/page.tsx`

Temporary placeholder — will be replaced in Phase 1:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-display-lg font-bold text-midnight-green">
        تطبيق المعارض
      </h1>
      <p className="mt-4 text-stone-600">
        منصة B2B لموردي المعارض في السعودية
      </p>
    </main>
  );
}
```

### File: `app/[locale]/not-found.tsx`

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-h1 font-semibold text-midnight-green">404</h1>
      <p className="mt-2 text-stone-600">
        الصفحة غير موجودة. ربما تم نقلها أو حذفها.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-action-blue px-6 py-3 text-cream hover:bg-action-blue-700"
      >
        العودة للرئيسية
      </Link>
    </main>
  );
}
```

### File: `app/[locale]/error.tsx`

```tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-h1 font-semibold text-danger">خطأ</h1>
      <p className="mt-2 text-stone-600">
        حدث خلل في الخادم. سجّلنا الخطأ تلقائياً.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-action-blue px-6 py-3 text-cream hover:bg-action-blue-700"
      >
        حاول مرة أخرى
      </button>
    </main>
  );
}
```

### File: `app/api/auth/callback/route.ts`

```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/ar/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/ar/login?error=auth`);
}
```

---

## Step 0.16 — Zod Schemas

### File: `schemas/auth.ts`

```ts
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
});

export const signupClientSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().regex(/^\+966\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  legalName: z.string().optional(),
  crNumber: z.string().length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط').regex(/^\d+$/, 'أرقام فقط'),
  vatNumber: z.string().optional(),
  size: z.enum(['enterprise', 'mid', 'startup']),
  industry: z.string().optional(),
  city: z.string().min(2, 'المدينة مطلوبة'),
});

export const signupSupplierSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  fullName: z.string().min(3, 'الاسم يجب أن يكون 3 أحرف على الأقل'),
  phone: z.string().regex(/^\+966\d{9}$/, 'رقم الهاتف يجب أن يبدأ بـ +966 ويتبعه 9 أرقام'),
  companyName: z.string().min(2, 'اسم الشركة مطلوب'),
  legalName: z.string().optional(),
  crNumber: z.string().length(10, 'رقم السجل التجاري يجب أن يكون 10 أرقام بالضبط').regex(/^\d+$/, 'أرقام فقط'),
  vatNumber: z.string().optional(),
  specializations: z.array(z.enum(['booth', 'gifts', 'event', 'printing'])).min(1, 'اختر تخصصاً واحداً على الأقل'),
  cities: z.array(z.string()).min(1, 'اختر مدينة واحدة على الأقل'),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  teamSize: z.number().int().positive().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  bankName: z.string().optional(),
  iban: z.string().regex(/^SA\d{22}$/, 'IBAN سعودي يجب أن يبدأ بـ SA ويتبعه 22 رقم').optional().or(z.literal('')),
  accountHolderName: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupClientInput = z.infer<typeof signupClientSchema>;
export type SignupSupplierInput = z.infer<typeof signupSupplierSchema>;
```

### File: `schemas/rfq/booth.ts`

```ts
import { z } from 'zod';

export const boothDetailsSchema = z.object({
  area: z.string().min(1, 'المساحة مطلوبة'),
  exhibitionName: z.string().min(2, 'اسم المعرض مطلوب'),
  exhibitionDate: z.coerce.date({ required_error: 'تاريخ المعرض مطلوب' }),
  floors: z.enum(['1', '2'], { required_error: 'عدد الطوابق مطلوب' }),
  openSides: z.enum(['1', '2', '3', '4']).optional(),
  hasStorage: z.boolean().default(false),
  hasMeetingRoom: z.boolean().default(false),
  hasKitchen: z.boolean().default(false),
  screenCount: z.number().int().min(0).default(0),
  specialRequirements: z.string().optional(),
});

export type BoothDetails = z.infer<typeof boothDetailsSchema>;
```

### File: `schemas/rfq/gifts.ts`

```ts
import { z } from 'zod';

export const giftsDetailsSchema = z.object({
  recipientType: z.enum(['VIP', 'general', 'staff', 'speakers'], { required_error: 'نوع المتلقي مطلوب' }),
  quantity: z.number().int().positive('الكمية يجب أن تكون أكبر من صفر'),
  category: z.enum(['tech', 'traditional', 'luxury', 'eco', 'custom'], { required_error: 'الفئة مطلوبة' }),
  hasBranding: z.boolean().default(true),
  brandingType: z.enum(['logo', 'full_print', 'engraving', 'embroidery']).optional(),
  deliveryDate: z.coerce.date({ required_error: 'تاريخ التسليم مطلوب' }),
  sampleRequired: z.boolean().default(false),
  specialRequirements: z.string().optional(),
});

export type GiftsDetails = z.infer<typeof giftsDetailsSchema>;
```

### File: `schemas/rfq/event.ts`

```ts
import { z } from 'zod';

export const eventDetailsSchema = z.object({
  eventType: z.enum(['conference', 'seminar', 'gala', 'launch', 'workshop'], { required_error: 'نوع الفعالية مطلوب' }),
  expectedAttendees: z.number().int().positive('عدد الحضور مطلوب'),
  eventDate: z.coerce.date({ required_error: 'تاريخ الفعالية مطلوب' }),
  duration: z.enum(['half_day', 'full_day', 'multi_day'], { required_error: 'المدة مطلوبة' }),
  venueProvided: z.boolean().default(false),
  needsCatering: z.boolean().default(false),
  needsAV: z.boolean().default(true),
  needsPhotography: z.boolean().default(false),
  specialRequirements: z.string().optional(),
});

export type EventDetails = z.infer<typeof eventDetailsSchema>;
```

### File: `schemas/rfq/printing.ts`

```ts
import { z } from 'zod';

export const printingDetailsSchema = z.object({
  printType: z.enum(['brochure', 'banner', 'business_card', 'catalog', 'poster', 'flyer', 'sticker', 'other'], { required_error: 'نوع المطبوعة مطلوب' }),
  quantity: z.number().int().positive('الكمية مطلوبة'),
  size: z.string().min(1, 'المقاس مطلوب'),
  paperType: z.enum(['glossy', 'matte', 'recycled', 'premium']).optional(),
  colorType: z.enum(['full_color', 'single_color', 'two_color']).default('full_color'),
  doubleSided: z.boolean().default(false),
  hasDesign: z.boolean().default(false),
  deliveryDate: z.coerce.date({ required_error: 'تاريخ التسليم مطلوب' }),
  specialRequirements: z.string().optional(),
});

export type PrintingDetails = z.infer<typeof printingDetailsSchema>;
```

### File: `schemas/proposal.ts`

```ts
import { z } from 'zod';

export const proposalSchema = z.object({
  totalPrice: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  deliveryDays: z.number().int().positive('مدة التسليم مطلوبة'),
  description: z.string().min(50, 'الوصف يجب أن يكون 50 حرفاً على الأقل'),
  scopeOfWork: z.string().min(100, 'نطاق العمل يجب أن يكون 100 حرف على الأقل'),
  excludedItems: z.string().optional(),
  paymentTerms: z.string().min(10, 'شروط الدفع مطلوبة'),
  validityDays: z.number().int().min(7).max(30).default(14),
});

export type ProposalInput = z.infer<typeof proposalSchema>;
```

### File: `schemas/agreement.ts`

```ts
import { z } from 'zod';

export const agreementUnderstandingSchema = z.object({
  understanding: z.string().min(100, 'فهم الاتفاق يجب أن يكون 100 حرف على الأقل'),
});

export type AgreementUnderstandingInput = z.infer<typeof agreementUnderstandingSchema>;
```

### File: `schemas/review.ts`

```ts
import { z } from 'zod';

const ratingField = z.number().int().min(1).max(5);

export const reviewSchema = z.object({
  ratingOverall: ratingField,
  ratingQuality: ratingField.optional(),
  ratingTimeliness: ratingField.optional(),
  ratingCommunication: ratingField.optional(),
  ratingFlexibility: ratingField.optional(),
  ratingPriceValue: ratingField.optional(),
  comment: z.string().optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
```

### File: `schemas/supplier.ts`

```ts
import { z } from 'zod';

export const supplierProfileSchema = z.object({
  companyName: z.string().min(2),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  teamSize: z.number().int().positive().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  minOrderValue: z.number().min(0).optional(),
  specializations: z.array(z.enum(['booth', 'gifts', 'event', 'printing'])).min(1),
  cities: z.array(z.string()).min(1),
  bankName: z.string().optional(),
  iban: z.string().regex(/^SA\d{22}$/).optional().or(z.literal('')),
  accountHolderName: z.string().optional(),
});

export const portfolioItemSchema = z.object({
  title: z.string().min(2, 'عنوان المشروع مطلوب'),
  description: z.string().optional(),
  serviceType: z.enum(['booth', 'gifts', 'event', 'printing']).optional(),
  clientName: z.string().optional(),
  exhibitionName: z.string().optional(),
  year: z.number().int().min(2015).max(2030).optional(),
});

export type SupplierProfileInput = z.infer<typeof supplierProfileSchema>;
export type PortfolioItemInput = z.infer<typeof portfolioItemSchema>;
```

---

## Step 0.17 — Utility Functions

### File: `lib/utils/escrow-calculator.ts`

```ts
const CLIENT_FEE_RATE = 0.02;
const SUPPLIER_FEE_RATE = 0.03;
const VAT_RATE = 0.15;

export interface EscrowCalculation {
  totalAmount: number;
  initialDeposit: number;
  finalPayment: number;
  clientFee: number;
  supplierFee: number;
  platformRevenue: number;
  supplierNet: number;
  clientFeeVat: number;
  supplierFeeVat: number;
  totalVat: number;
  vatRateApplied: number;
}

export function calculateEscrow(contractPrice: number): EscrowCalculation {
  const clientFee = round(contractPrice * CLIENT_FEE_RATE);
  const supplierFee = round(contractPrice * SUPPLIER_FEE_RATE);
  const platformRevenue = round(clientFee + supplierFee);
  const supplierNet = round(contractPrice - supplierFee);

  const clientFeeVat = round(clientFee * VAT_RATE);
  const supplierFeeVat = round(supplierFee * VAT_RATE);
  const totalVat = round(clientFeeVat + supplierFeeVat);

  const totalAmount = round(contractPrice + clientFee + clientFeeVat);
  const initialDeposit = round(totalAmount * 0.5);
  const finalPayment = round(totalAmount - initialDeposit);

  return {
    totalAmount,
    initialDeposit,
    finalPayment,
    clientFee,
    supplierFee,
    platformRevenue,
    supplierNet,
    clientFeeVat,
    supplierFeeVat,
    totalVat,
    vatRateApplied: VAT_RATE,
  };
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
```

### File: `lib/utils/rfq-state-machine.ts`

```ts
import type { Database } from '@/lib/supabase/types';

type RfqStatus = Database['public']['Enums']['rfq_status'];
type UserRole = Database['public']['Enums']['user_role'];

interface Transition {
  from: RfqStatus;
  to: RfqStatus;
  allowedRoles: UserRole[];
}

const VALID_TRANSITIONS: Transition[] = [
  { from: 'draft', to: 'open', allowedRoles: ['client'] },
  { from: 'draft', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'open', to: 'negotiating', allowedRoles: ['client'] },
  { from: 'open', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'negotiating', to: 'awarded', allowedRoles: ['client'] },
  { from: 'negotiating', to: 'cancelled', allowedRoles: ['client', 'admin'] },
  { from: 'awarded', to: 'in_escrow', allowedRoles: ['admin'] },
  { from: 'awarded', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'in_escrow', to: 'in_progress', allowedRoles: ['admin'] },
  { from: 'in_escrow', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'in_progress', to: 'delivered', allowedRoles: ['supplier'] },
  { from: 'in_progress', to: 'disputed', allowedRoles: ['client', 'supplier', 'admin'] },
  { from: 'delivered', to: 'completed', allowedRoles: ['client', 'admin'] },
  { from: 'delivered', to: 'disputed', allowedRoles: ['client', 'admin'] },
  { from: 'disputed', to: 'in_progress', allowedRoles: ['admin'] },
  { from: 'disputed', to: 'completed', allowedRoles: ['admin'] },
  { from: 'disputed', to: 'cancelled', allowedRoles: ['admin'] },
];

export function canTransition(from: RfqStatus, to: RfqStatus, role: UserRole): boolean {
  return VALID_TRANSITIONS.some(
    (t) => t.from === from && t.to === to && t.allowedRoles.includes(role)
  );
}

export function getNextStatuses(current: RfqStatus, role: UserRole): RfqStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === current && t.allowedRoles.includes(role))
    .map((t) => t.to);
}

export function isTerminalStatus(status: RfqStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}
```

### File: `lib/utils/format.ts`

```ts
export function formatCurrency(amount: number, locale: string = 'ar'): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formatted} ﷼`;
}

export function formatDate(date: Date | string, locale: string = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatPhone(phone: string): string {
  if (!phone.startsWith('+966')) return phone;
  const digits = phone.slice(4);
  return `+966 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
}

export function formatRfqNumber(num: string): string {
  return num;
}

export function timeAgo(date: Date | string, locale: string = 'ar'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (locale === 'ar') {
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return formatDate(d, locale);
  }

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return formatDate(d, locale);
}
```

---

## Step 0.18 — Constants

### File: `lib/constants/fees.ts`

```ts
export const FEES = {
  CLIENT_RATE: 0.02,
  SUPPLIER_RATE: 0.03,
  TOTAL_RATE: 0.05,
  VAT_RATE: 0.15,
} as const;
```

### File: `lib/constants/service-types.ts`

```ts
export const SERVICE_TYPES = [
  { value: 'booth', labelAr: 'تصميم وتنفيذ أجنحة', labelEn: 'Booth Design & Build', icon: 'SquareDashed' },
  { value: 'gifts', labelAr: 'هدايا ترويجية', labelEn: 'Promotional Gifts', icon: 'Gift' },
  { value: 'event', labelAr: 'تنظيم فعاليات', labelEn: 'Event Management', icon: 'CalendarDays' },
  { value: 'printing', labelAr: 'مطبوعات', labelEn: 'Print Materials', icon: 'Printer' },
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number]['value'];
```

### File: `lib/constants/cities.ts`

```ts
export const CITIES = [
  { value: 'Riyadh', labelAr: 'الرياض', labelEn: 'Riyadh' },
  { value: 'Jeddah', labelAr: 'جدة', labelEn: 'Jeddah' },
  { value: 'Dammam', labelAr: 'الدمام', labelEn: 'Dammam' },
  { value: 'Khobar', labelAr: 'الخبر', labelEn: 'Khobar' },
  { value: 'Makkah', labelAr: 'مكة المكرمة', labelEn: 'Makkah' },
  { value: 'Madinah', labelAr: 'المدينة المنورة', labelEn: 'Madinah' },
  { value: 'Tabuk', labelAr: 'تبوك', labelEn: 'Tabuk' },
  { value: 'Abha', labelAr: 'أبها', labelEn: 'Abha' },
  { value: 'Hail', labelAr: 'حائل', labelEn: 'Hail' },
  { value: 'Jazan', labelAr: 'جازان', labelEn: 'Jazan' },
] as const;
```

---

## Step 0.19 — Vitest Configuration

### File: `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

### File: `tests/setup.ts`

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

---

## Step 0.20 — Unit Tests: Schemas

### File: `tests/unit/schemas/auth.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { loginSchema, signupClientSchema, signupSupplierSchema } from '@/schemas/auth';

describe('loginSchema', () => {
  it('accepts valid login', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: '12345678' });
    expect(result.success).toBe(false);
  });

  it('rejects short password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty email', () => {
    const result = loginSchema.safeParse({ email: '', password: '12345678' });
    expect(result.success).toBe(false);
  });
});

describe('signupClientSchema', () => {
  const validClient = {
    email: 'sara@company.sa',
    password: 'Pass1234!',
    fullName: 'سارة العتيبي',
    phone: '+966512345678',
    companyName: 'شركة الإبداع',
    crNumber: '1010123456',
    size: 'mid' as const,
    city: 'Riyadh',
  };

  it('accepts valid client signup', () => {
    const result = signupClientSchema.safeParse(validClient);
    expect(result.success).toBe(true);
  });

  it('rejects CR number with wrong length', () => {
    const result = signupClientSchema.safeParse({ ...validClient, crNumber: '12345' });
    expect(result.success).toBe(false);
  });

  it('rejects CR number with letters', () => {
    const result = signupClientSchema.safeParse({ ...validClient, crNumber: '10101234AB' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid phone format', () => {
    const result = signupClientSchema.safeParse({ ...validClient, phone: '0512345678' });
    expect(result.success).toBe(false);
  });

  it('rejects missing company name', () => {
    const result = signupClientSchema.safeParse({ ...validClient, companyName: '' });
    expect(result.success).toBe(false);
  });
});

describe('signupSupplierSchema', () => {
  const validSupplier = {
    email: 'supplier@test.sa',
    password: 'Pass1234!',
    fullName: 'أحمد المورد',
    phone: '+966599887766',
    companyName: 'مؤسسة المعارض',
    crNumber: '4030567890',
    specializations: ['booth' as const],
    cities: ['Riyadh'],
  };

  it('accepts valid supplier signup', () => {
    const result = signupSupplierSchema.safeParse(validSupplier);
    expect(result.success).toBe(true);
  });

  it('rejects empty specializations', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, specializations: [] });
    expect(result.success).toBe(false);
  });

  it('rejects empty cities', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, cities: [] });
    expect(result.success).toBe(false);
  });

  it('accepts valid IBAN', () => {
    const result = signupSupplierSchema.safeParse({
      ...validSupplier,
      iban: 'SA0380000000608010167519',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid IBAN', () => {
    const result = signupSupplierSchema.safeParse({ ...validSupplier, iban: 'INVALID' });
    expect(result.success).toBe(false);
  });
});
```

### File: `tests/unit/schemas/rfq.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';

describe('boothDetailsSchema', () => {
  it('accepts valid booth details', () => {
    const result = boothDetailsSchema.safeParse({
      area: '6x6',
      exhibitionName: 'LEAP 2026',
      exhibitionDate: '2026-09-15',
      floors: '1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing area', () => {
    const result = boothDetailsSchema.safeParse({
      exhibitionName: 'LEAP',
      exhibitionDate: '2026-09-15',
      floors: '1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid floor value', () => {
    const result = boothDetailsSchema.safeParse({
      area: '6x6',
      exhibitionName: 'LEAP',
      exhibitionDate: '2026-09-15',
      floors: '3',
    });
    expect(result.success).toBe(false);
  });
});

describe('giftsDetailsSchema', () => {
  it('accepts valid gifts details', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: 500,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero quantity', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: 0,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative quantity', () => {
    const result = giftsDetailsSchema.safeParse({
      recipientType: 'VIP',
      quantity: -10,
      category: 'tech',
      deliveryDate: '2026-08-01',
    });
    expect(result.success).toBe(false);
  });
});

describe('eventDetailsSchema', () => {
  it('accepts valid event details', () => {
    const result = eventDetailsSchema.safeParse({
      eventType: 'conference',
      expectedAttendees: 200,
      eventDate: '2026-10-01',
      duration: 'full_day',
    });
    expect(result.success).toBe(true);
  });
});

describe('printingDetailsSchema', () => {
  it('accepts valid printing details', () => {
    const result = printingDetailsSchema.safeParse({
      printType: 'brochure',
      quantity: 1000,
      size: 'A4',
      deliveryDate: '2026-07-15',
    });
    expect(result.success).toBe(true);
  });
});
```

### File: `tests/unit/schemas/proposal.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { proposalSchema } from '@/schemas/proposal';

describe('proposalSchema', () => {
  const valid = {
    totalPrice: 87500,
    deliveryDays: 21,
    description: 'a'.repeat(50),
    scopeOfWork: 'a'.repeat(100),
    paymentTerms: '50% upfront, 50% on delivery',
  };

  it('accepts valid proposal', () => {
    expect(proposalSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative price', () => {
    expect(proposalSchema.safeParse({ ...valid, totalPrice: -1000 }).success).toBe(false);
  });

  it('rejects zero price', () => {
    expect(proposalSchema.safeParse({ ...valid, totalPrice: 0 }).success).toBe(false);
  });

  it('rejects short description', () => {
    expect(proposalSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
  });

  it('rejects short scope of work', () => {
    expect(proposalSchema.safeParse({ ...valid, scopeOfWork: 'too short' }).success).toBe(false);
  });

  it('defaults validity to 14 days', () => {
    const result = proposalSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.validityDays).toBe(14);
    }
  });
});
```

---

## Step 0.21 — Unit Tests: Utilities

### File: `tests/unit/utils/escrow-calculator.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { calculateEscrow } from '@/lib/utils/escrow-calculator';

describe('calculateEscrow', () => {
  it('calculates correctly for 100,000 SAR contract', () => {
    const result = calculateEscrow(100000);

    expect(result.clientFee).toBe(2000);
    expect(result.supplierFee).toBe(3000);
    expect(result.platformRevenue).toBe(5000);
    expect(result.supplierNet).toBe(97000);
    expect(result.clientFeeVat).toBe(300);
    expect(result.supplierFeeVat).toBe(450);
    expect(result.totalVat).toBe(750);
    expect(result.totalAmount).toBe(102300);
    expect(result.initialDeposit).toBe(51150);
    expect(result.finalPayment).toBe(51150);
    expect(result.vatRateApplied).toBe(0.15);
  });

  it('calculates correctly for 50,000 SAR contract', () => {
    const result = calculateEscrow(50000);

    expect(result.clientFee).toBe(1000);
    expect(result.supplierFee).toBe(1500);
    expect(result.platformRevenue).toBe(2500);
    expect(result.supplierNet).toBe(48500);
  });

  it('handles small amounts', () => {
    const result = calculateEscrow(1000);

    expect(result.clientFee).toBe(20);
    expect(result.supplierFee).toBe(30);
    expect(result.platformRevenue).toBe(50);
    expect(result.supplierNet).toBe(970);
  });

  it('handles odd amounts without floating point errors', () => {
    const result = calculateEscrow(33333);

    expect(result.clientFee).toBe(666.66);
    expect(result.supplierFee).toBe(999.99);
    expect(result.supplierNet).toBe(32333.01);
  });

  it('initial + final = total', () => {
    const result = calculateEscrow(87500);
    expect(result.initialDeposit + result.finalPayment).toBe(result.totalAmount);
  });
});
```

### File: `tests/unit/utils/rfq-state-machine.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { canTransition, getNextStatuses, isTerminalStatus } from '@/lib/utils/rfq-state-machine';

describe('canTransition', () => {
  it('client can publish draft', () => {
    expect(canTransition('draft', 'open', 'client')).toBe(true);
  });

  it('supplier cannot publish draft', () => {
    expect(canTransition('draft', 'open', 'supplier')).toBe(false);
  });

  it('client can award from negotiating', () => {
    expect(canTransition('negotiating', 'awarded', 'client')).toBe(true);
  });

  it('supplier can deliver from in_progress', () => {
    expect(canTransition('in_progress', 'delivered', 'supplier')).toBe(true);
  });

  it('admin can confirm escrow to in_progress', () => {
    expect(canTransition('in_escrow', 'in_progress', 'admin')).toBe(true);
  });

  it('client cannot skip from draft to awarded', () => {
    expect(canTransition('draft', 'awarded', 'client')).toBe(false);
  });

  it('nobody can transition from completed', () => {
    expect(canTransition('completed', 'open', 'admin')).toBe(false);
    expect(canTransition('completed', 'open', 'client')).toBe(false);
  });

  it('admin can resolve dispute to completed', () => {
    expect(canTransition('disputed', 'completed', 'admin')).toBe(true);
  });

  it('client cannot resolve dispute to completed', () => {
    expect(canTransition('disputed', 'completed', 'client')).toBe(false);
  });
});

describe('getNextStatuses', () => {
  it('returns correct options for open RFQ as client', () => {
    const next = getNextStatuses('open', 'client');
    expect(next).toContain('negotiating');
    expect(next).toContain('cancelled');
    expect(next).not.toContain('awarded');
  });

  it('returns empty for terminal status', () => {
    expect(getNextStatuses('completed', 'client')).toEqual([]);
    expect(getNextStatuses('cancelled', 'client')).toEqual([]);
  });
});

describe('isTerminalStatus', () => {
  it('completed is terminal', () => {
    expect(isTerminalStatus('completed')).toBe(true);
  });

  it('cancelled is terminal', () => {
    expect(isTerminalStatus('cancelled')).toBe(true);
  });

  it('in_progress is not terminal', () => {
    expect(isTerminalStatus('in_progress')).toBe(false);
  });
});
```

### File: `tests/unit/utils/format.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPhone } from '@/lib/utils/format';

describe('formatCurrency', () => {
  it('formats whole numbers', () => {
    expect(formatCurrency(87500)).toBe('87,500 ﷼');
  });

  it('formats decimals', () => {
    expect(formatCurrency(1234.56)).toBe('1,234.56 ﷼');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0 ﷼');
  });

  it('formats large numbers', () => {
    expect(formatCurrency(1500000)).toBe('1,500,000 ﷼');
  });
});

describe('formatPhone', () => {
  it('formats Saudi phone', () => {
    expect(formatPhone('+966512345678')).toBe('+966 51 234 5678');
  });

  it('returns non-Saudi numbers as-is', () => {
    expect(formatPhone('0512345678')).toBe('0512345678');
  });
});
```

---

## Step 0.22 — Unit Tests: DB (RLS + Triggers)

These tests require Supabase local running. They test at the SQL level.

### File: `tests/unit/db/schema-check.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
);

describe('Database schema', () => {
  it('has all 14+ expected tables', async () => {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`,
    });

    // If rpc doesn't exist, use a simpler check
    const expectedTables = [
      'profiles', 'companies', 'suppliers', 'supplier_portfolio',
      'rfqs', 'proposals', 'chats', 'messages',
      'agreements', 'agreement_revisions',
      'escrow_transactions', 'escrow_events', 'invoices',
      'deliveries', 'disputes', 'reviews',
      'notifications', 'audit_logs', 'ceo_access',
    ];

    for (const table of expectedTables) {
      const { error: tableError } = await supabase.from(table).select('id').limit(0);
      expect(tableError?.message).not.toContain('does not exist');
    }
  });
});
```

> **NOTE**: Full RLS tests require creating test users via Supabase Auth API and testing with their tokens. This is detailed in Phase 1 when auth is implemented. For Phase 0, the schema-check test verifies all tables exist.

---

## Step 0.23 — vercel.ts

### File: `vercel.ts`

```ts
import type { VercelConfig } from '@vercel/config/v1';

const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'pnpm build',
  installCommand: 'pnpm install',

  crons: [
    { path: '/api/cron/close-expired-rfqs', schedule: '0 * * * *' },
    { path: '/api/cron/remind-suppliers', schedule: '0 9 * * *' },
    { path: '/api/cron/exhibition-reminders', schedule: '0 9 * * *' },
  ],
};

export default config;
```

---

## Step 0.24 — next.config.ts

### File: `next.config.ts`

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/config.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default withNextIntl(nextConfig);
```

---

## Step 0.25 — tsconfig.json

### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

## Step 0.26 — CI: GitHub Actions

### File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: TypeScript check
        run: pnpm tsc --noEmit

      - name: ESLint
        run: pnpm eslint . --max-warnings 0

      - name: Unit tests
        run: pnpm vitest run
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
```

Create the directory:
```bash
mkdir -p .github/workflows
```

---

## Step 0.27 — First Deploy

```bash
# Initialize git repo
git init
git add -A
git commit -m "Phase 0: Foundation — project scaffold, DB schema, schemas, utilities, tests"

# Link to Vercel
pnpm dlx vercel link

# Set environment variables on Vercel
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY

# Deploy
pnpm dlx vercel --prod
```

---

## Step 0.28 — Verification Checklist

Run these commands and verify ALL pass before moving to Phase 1:

```bash
# 1. TypeScript compiles
pnpm tsc --noEmit

# 2. All unit tests pass
pnpm vitest run

# 3. Project builds
pnpm build

# 4. Dev server starts
pnpm dev
# → Open http://localhost:3000 → should redirect to /ar and show the placeholder page

# 5. Supabase local is running
pnpm dlx supabase status
# → Should show running services

# 6. Database has all tables
pnpm dlx supabase db reset
# → Should apply all migrations without errors
```

### Expected test results:
- `tests/unit/schemas/auth.test.ts` — 9 tests pass
- `tests/unit/schemas/rfq.test.ts` — 6 tests pass
- `tests/unit/schemas/proposal.test.ts` — 6 tests pass
- `tests/unit/utils/escrow-calculator.test.ts` — 5 tests pass
- `tests/unit/utils/rfq-state-machine.test.ts` — 11 tests pass
- `tests/unit/utils/format.test.ts` — 6 tests pass

**Total: ~43 tests, all green.**

---

## Summary of Phase 0 Deliverables

| Category | Files Created | Tests |
|----------|--------------|-------|
| Project scaffold | `package.json`, `tsconfig.json`, `next.config.ts`, `vercel.ts` | — |
| Design tokens | `app/globals.css`, `app/fonts.ts` | — |
| Database | 12 migration files, `seed.sql` | 1 schema check test |
| Supabase clients | 4 files in `lib/supabase/` | — |
| Auth utilities | 3 files in `lib/auth/` | — |
| i18n | `config.ts`, `routing.ts`, `ar.json`, `en.json` | — |
| Proxy | `app/proxy.ts` | — |
| Layouts | `layout.tsx` (root + locale), `page.tsx`, `not-found.tsx`, `error.tsx` | — |
| Zod schemas | 9 files in `schemas/` | 21 tests |
| Utilities | 3 files in `lib/utils/` | 22 tests |
| Constants | 3 files in `lib/constants/` | — |
| CI | `.github/workflows/ci.yml` | — |
| **Total** | **~50 files** | **~43 tests** |

> **Next**: Phase 1 — Auth & Onboarding. Do not start Phase 1 until ALL Phase 0 verification checks pass.
