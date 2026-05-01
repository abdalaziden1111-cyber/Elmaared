# Next.js 16 Project Structure

> **Framework**: Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui
> **Auth/DB**: Supabase
> **AI**: Vercel AI Gateway

---

## 1. الهيكل العام

```
app-exhibition/
├── app/                              # Next.js App Router
│   ├── [locale]/                     # i18n: ar (default), en
│   │   ├── (marketing)/              # Group: public marketing pages
│   │   │   ├── page.tsx              # Home
│   │   │   ├── how-it-works/
│   │   │   ├── for-clients/
│   │   │   ├── for-suppliers/
│   │   │   ├── pricing/
│   │   │   ├── about/
│   │   │   ├── contact/
│   │   │   ├── exhibitions/
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── suppliers/            # Public directory
│   │   │   │   └── [id]/page.tsx     # Public supplier profile
│   │   │   ├── legal/
│   │   │   │   ├── terms/page.tsx
│   │   │   │   └── privacy/page.tsx
│   │   │   └── layout.tsx            # Marketing layout (header + footer)
│   │   │
│   │   ├── (auth)/                   # Group: auth screens
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   │   ├── page.tsx          # Choose role
│   │   │   │   ├── client/
│   │   │   │   │   ├── account/
│   │   │   │   │   ├── company/
│   │   │   │   │   └── verify/
│   │   │   │   └── supplier/
│   │   │   │       ├── account/
│   │   │   │       ├── company/
│   │   │   │       ├── specializations/
│   │   │   │       └── documents/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── auth/
│   │   │       ├── verify-email/
│   │   │       └── callback/         # OAuth callback
│   │   │
│   │   ├── dashboard/                # Client dashboard (role: client)
│   │   │   ├── layout.tsx            # Client layout (sidebar + header)
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── onboarding/
│   │   │   │   ├── welcome/
│   │   │   │   ├── exhibition/
│   │   │   │   └── recommendations/
│   │   │   ├── discover/             # Suppliers explorer
│   │   │   ├── rfqs/                 # RFQ list
│   │   │   ├── rfq/
│   │   │   │   ├── new/
│   │   │   │   │   ├── service/
│   │   │   │   │   ├── details/
│   │   │   │   │   ├── files/
│   │   │   │   │   └── review/
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # RFQ overview
│   │   │   │       ├── compare/      # Proposals comparison
│   │   │   │       ├── chats/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── [supplierId]/
│   │   │   │       ├── agreement/
│   │   │   │       │   ├── draft/
│   │   │   │       │   ├── analysis/
│   │   │   │       │   └── final/
│   │   │   │       ├── escrow/
│   │   │   │       │   ├── deposit/
│   │   │   │       │   ├── upload-receipt/
│   │   │   │       │   └── awaiting/
│   │   │   │       ├── timeline/
│   │   │   │       ├── designs/
│   │   │   │       ├── approve/
│   │   │   │       ├── final-payment/
│   │   │   │       └── review/
│   │   │   ├── notifications/
│   │   │   ├── settings/
│   │   │   │   ├── profile/
│   │   │   │   ├── company/
│   │   │   │   └── team/             # Phase 2
│   │   │   └── reports/              # Phase 2
│   │   │
│   │   ├── supplier/                 # Supplier dashboard (role: supplier)
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── pending/              # Awaiting Admin review
│   │   │   ├── tutorial/
│   │   │   ├── rfqs/                 # Available RFQs
│   │   │   ├── rfq/[id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── proposal/
│   │   │   │   │   ├── price/
│   │   │   │   │   ├── details/
│   │   │   │   │   ├── files/
│   │   │   │   │   └── sent/
│   │   │   │   └── agreement/
│   │   │   ├── proposals/            # My submitted proposals
│   │   │   ├── chat/[id]/
│   │   │   ├── projects/             # Active projects
│   │   │   ├── project/[id]/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── designs/
│   │   │   │   └── delivery/
│   │   │   ├── earnings/
│   │   │   ├── withdraw/
│   │   │   ├── reviews/
│   │   │   └── profile/
│   │   │       ├── page.tsx
│   │   │       └── portfolio/
│   │   │
│   │   ├── ceo/                      # CEO read-only access
│   │   │   └── [token]/
│   │   │       ├── page.tsx          # Dashboard (read-only)
│   │   │       ├── rfq/[id]/
│   │   │       └── reports/
│   │   │
│   │   ├── layout.tsx                # Root locale layout (RTL/LTR + fonts)
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   │
│   ├── admin/                        # Admin section (no locale prefix)
│   │   ├── layout.tsx                # Admin layout
│   │   ├── page.tsx                  # Admin dashboard
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── suppliers/
│   │   │   ├── page.tsx              # All suppliers
│   │   │   ├── pending/              # Pending review
│   │   │   └── [id]/
│   │   ├── rfqs/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── chats/
│   │   ├── chat/[id]/
│   │   ├── panics/
│   │   ├── escrow/
│   │   │   ├── pending-deposits/
│   │   │   ├── pending-releases/
│   │   │   ├── deposit/[id]/
│   │   │   ├── release/[id]/
│   │   │   └── transactions/
│   │   ├── agreements/
│   │   │   ├── pending/
│   │   │   └── [id]/
│   │   ├── disputes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/
│   │   ├── field-visits/
│   │   ├── reports/
│   │   ├── activity/
│   │   ├── anomalies/
│   │   └── settings/
│   │
│   ├── api/                          # Route Handlers (REST endpoints)
│   │   ├── auth/
│   │   │   └── callback/route.ts     # Supabase auth callback
│   │   ├── webhooks/
│   │   │   └── supabase/route.ts     # DB webhooks (e.g., new RFQ)
│   │   ├── cron/                     # Vercel Cron jobs
│   │   │   ├── close-expired-rfqs/route.ts
│   │   │   ├── remind-suppliers/route.ts
│   │   │   └── exhibition-reminders/route.ts
│   │   ├── ai/
│   │   │   ├── score-proposal/route.ts
│   │   │   ├── analyze-agreement/route.ts
│   │   │   └── generate-roi/route.ts
│   │   ├── upload/route.ts           # File upload handler
│   │   └── og/route.tsx              # OG image generation
│   │
│   ├── proxy.ts                      # Auth gates + rewrites (Next.js 16)
│   ├── layout.tsx                    # Root layout (HTML shell)
│   ├── global-error.tsx
│   ├── globals.css
│   ├── icon.tsx                      # Favicon
│   ├── apple-icon.tsx
│   ├── opengraph-image.tsx
│   ├── manifest.ts                   # PWA manifest
│   ├── sitemap.ts                    # Dynamic sitemap
│   └── robots.ts
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── dialog.tsx
│   │   ├── tabs.tsx
│   │   ├── data-table.tsx
│   │   └── ...
│   ├── shared/                       # Cross-feature components
│   │   ├── header/
│   │   ├── footer/
│   │   ├── sidebar/
│   │   ├── language-switcher.tsx
│   │   ├── notification-bell.tsx
│   │   ├── empty-state.tsx
│   │   ├── loading-skeleton.tsx
│   │   └── error-boundary.tsx
│   ├── rfq/                          # RFQ-specific components
│   │   ├── rfq-status-badge.tsx
│   │   ├── rfq-card.tsx
│   │   ├── rfq-form/
│   │   │   ├── booth-form.tsx
│   │   │   ├── gifts-form.tsx
│   │   │   ├── event-form.tsx
│   │   │   └── printing-form.tsx
│   │   └── proposal-card.tsx
│   ├── chat/
│   │   ├── chat-window.tsx
│   │   ├── message-bubble.tsx
│   │   ├── composer.tsx
│   │   ├── panic-button.tsx
│   │   └── admin-presence-indicator.tsx
│   ├── supplier/
│   │   ├── supplier-mini-card.tsx
│   │   ├── supplier-profile-header.tsx
│   │   └── portfolio-grid.tsx
│   ├── escrow/
│   │   ├── escrow-progress-bar.tsx
│   │   └── transaction-summary.tsx
│   └── reviews/
│       ├── rating-stars.tsx
│       └── review-card.tsx
│
├── lib/                              # Utilities & shared code
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server (RSC + Server Actions)
│   │   ├── admin.ts                  # Service role (admin ops only)
│   │   ├── middleware.ts             # for proxy.ts
│   │   └── types.ts                  # Generated DB types
│   ├── ai/
│   │   ├── gateway.ts                # AI Gateway helpers
│   │   ├── score-proposal.ts
│   │   ├── analyze-agreement.ts
│   │   └── generate-roi-report.ts
│   ├── auth/
│   │   ├── get-user.ts
│   │   ├── require-role.ts
│   │   └── permissions.ts
│   ├── email/
│   │   ├── resend.ts
│   │   └── templates/                # React Email templates
│   │       ├── welcome.tsx
│   │       ├── rfq-match.tsx
│   │       ├── proposal-shortlisted.tsx
│   │       ├── proposal-awarded.tsx
│   │       ├── escrow-confirmed.tsx
│   │       └── delivery-approved.tsx
│   ├── i18n/
│   │   ├── config.ts
│   │   ├── messages/
│   │   │   ├── ar.json
│   │   │   └── en.json
│   │   └── routing.ts
│   ├── utils/
│   │   ├── format.ts                 # Currency, dates, numbers
│   │   ├── escrow-calculator.ts      # Calculate fees + amounts
│   │   ├── rfq-state-machine.ts      # State transitions logic
│   │   ├── cn.ts                     # Tailwind classnames merge
│   │   └── slugify.ts
│   └── constants/
│       ├── service-types.ts
│       ├── cities.ts
│       ├── exhibitions.ts            # تقويم المعارض
│       └── fees.ts                   # 2%, 3%, 5%
│
├── schemas/                          # Zod schemas (used both client + server)
│   ├── auth.ts
│   ├── rfq/
│   │   ├── booth.ts
│   │   ├── gifts.ts
│   │   ├── event.ts
│   │   └── printing.ts
│   ├── proposal.ts
│   ├── agreement.ts
│   ├── review.ts
│   └── supplier.ts
│
├── server/                           # Server-only code
│   ├── actions/                      # Server Actions
│   │   ├── auth.ts                   # Login, signup, logout
│   │   ├── rfq.ts                    # CRUD + state transitions
│   │   ├── proposal.ts
│   │   ├── chat.ts                   # Send message, panic
│   │   ├── agreement.ts
│   │   ├── escrow.ts                 # Confirm deposit, release
│   │   ├── delivery.ts
│   │   ├── review.ts
│   │   ├── supplier.ts               # Onboarding, portfolio mgmt
│   │   └── admin.ts                  # Admin-only actions
│   ├── queries/                      # Read queries (RSC-friendly)
│   │   ├── rfqs.ts
│   │   ├── proposals.ts
│   │   ├── suppliers.ts
│   │   ├── chats.ts
│   │   └── notifications.ts
│   └── jobs/                         # Background jobs
│       ├── score-proposal.ts
│       ├── notify-matching-suppliers.ts
│       └── send-email.ts
│
├── stores/                           # Zustand stores (client-only)
│   ├── rfq-wizard.ts                 # New RFQ multi-step form
│   ├── notifications.ts
│   └── ui.ts                         # Sidebar collapse, theme
│
├── hooks/                            # Custom React hooks
│   ├── use-supabase-channel.ts
│   ├── use-realtime-messages.ts
│   ├── use-current-user.ts
│   └── use-toast.ts
│
├── public/
│   ├── images/
│   ├── icons/
│   └── fonts/                        # Local fonts if needed
│
├── supabase/                         # Supabase project files
│   ├── migrations/                   # SQL migrations (versioned)
│   │   ├── 20260501000000_init.sql
│   │   ├── 20260501100000_rls_policies.sql
│   │   └── 20260501200000_triggers.sql
│   ├── functions/                    # Edge Functions (if needed)
│   ├── seed.sql                      # Sample data for dev
│   └── config.toml
│
├── tests/
│   ├── e2e/                          # Playwright
│   │   ├── client-rfq-flow.spec.ts
│   │   ├── supplier-proposal.spec.ts
│   │   └── admin-escrow.spec.ts
│   └── unit/                         # Vitest
│       ├── escrow-calculator.test.ts
│       └── rfq-state-machine.test.ts
│
├── .env.example
├── .env.local                        # gitignored
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── next.config.ts
├── vercel.ts                         # Vercel config (Next.js 16+)
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json                   # shadcn/ui config
├── package.json
├── pnpm-lock.yaml
└── README.md
```

---

## 2. الفصل بين Server و Client

### مبدأ صارم
- كل ملف افتراضياً Server Component
- `'use client'` فقط عند الحاجة الفعلية (interactivity, hooks, real-time)
- `'use server'` للـ Server Actions (top of file أو inline)

### أمثلة

#### Server Component (افتراضي)
```tsx
// app/[locale]/dashboard/rfqs/page.tsx
import { getMyRFQs } from '@/server/queries/rfqs';

export default async function RFQsPage() {
  const rfqs = await getMyRFQs();
  return <RFQsList rfqs={rfqs} />;
}
```

#### Client Component
```tsx
// components/rfq/rfq-form/booth-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createRFQ } from '@/server/actions/rfq';

export function BoothForm() {
  const form = useForm({...});
  // ...
}
```

#### Server Action
```ts
// server/actions/rfq.ts
'use server';

import { createClient } from '@/lib/supabase/server';
import { boothSchema } from '@/schemas/rfq/booth';

export async function createRFQ(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // validate + insert + redirect
}
```

---

## 3. ملف proxy.ts (Next.js 16)

```ts
// app/proxy.ts (was middleware.ts)
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // 1. i18n redirect (no locale → ar default)
  // 2. Auth gate for /dashboard, /supplier, /admin, /ceo
  // 3. Role-based redirects (client trying to access /supplier → block)

  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith('/dashboard') ||
                      pathname.startsWith('/supplier') ||
                      pathname.startsWith('/admin');

  if (!isProtected) return NextResponse.next();

  const supabase = createServerClient(/* ... */);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (pathname.startsWith('/admin') && profile?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  // ... other role checks

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
```

---

## 4. ملف vercel.ts

```ts
// vercel.ts
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'pnpm build',
  installCommand: 'pnpm install',

  crons: [
    { path: '/api/cron/close-expired-rfqs', schedule: '0 * * * *' },      // كل ساعة
    { path: '/api/cron/remind-suppliers', schedule: '0 9 * * *' },        // يومياً 9 صباحاً
    { path: '/api/cron/exhibition-reminders', schedule: '0 9 * * *' },
    { path: '/api/cron/cleanup-storage', schedule: '0 2 * * 0' },         // أسبوعياً
  ],
};

export default config;
```

---

## 5. next.config.ts

```ts
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./lib/i18n/config.ts');

const nextConfig: NextConfig = {
  experimental: {
    // Cache Components حسب الحاجة في Phase 2
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  typedRoutes: true,

  // ZATCA + financial APIs need stable Node runtime
  serverExternalPackages: [],
};

export default withNextIntl(nextConfig);
```

---

## 6. tailwind.config.ts (RTL + theming)

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        arabic: ['var(--font-ibm-plex-arabic)', 'sans-serif'],
        latin: ['var(--font-inter)', 'sans-serif'],
      },
      colors: {
        // من Vision document
        brand: {
          primary: '#1a3a52',  // كحلي أكاديمي
          accent: '#d4a017',   // ذهبي
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

---

## 7. components.json (shadcn/ui)

```json
{
  "style": "new-york",
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
    "ui": "@/components/ui"
  }
}
```

---

## 8. tsconfig.json paths

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["./components/*"],
      "@/lib/*": ["./lib/*"],
      "@/schemas/*": ["./schemas/*"],
      "@/server/*": ["./server/*"],
      "@/stores/*": ["./stores/*"],
      "@/hooks/*": ["./hooks/*"]
    }
  }
}
```

---

## 9. Routing Strategy ملخص

### Public (Guest)
- `/` → redirect to `/ar` (default locale)
- `/ar/*`, `/en/*` → marketing + auth pages

### Client
- `/[locale]/dashboard/**`
- محمي بـ proxy: لازم role=client

### Supplier
- `/[locale]/supplier/**`
- محمي بـ proxy: لازم role=supplier && status=approved

### Admin
- `/admin/**` (no locale)
- محمي بـ proxy: لازم role=admin

### CEO Read-only
- `/[locale]/ceo/[token]/**`
- مفتوح بـ token، لا يحتاج Supabase Auth (verify token vs `ceo_access` table)

---

## 10. قواعد التسمية والتنظيم

### الملفات
- صغير `kebab-case`: `rfq-status-badge.tsx`
- `PascalCase` للـ default exports: `export default function RFQStatusBadge()`

### المتغيرات
- `camelCase` للـ JS/TS
- `snake_case` للـ DB columns

### Imports
```ts
// ترتيب imports ثابت (eslint-plugin-import)
// 1. React + Next
import { Suspense } from 'react';
import Link from 'next/link';

// 2. External packages
import { z } from 'zod';

// 3. Internal: schemas → lib → server → components
import { rfqSchema } from '@/schemas/rfq';
import { createClient } from '@/lib/supabase/server';
import { getMyRFQs } from '@/server/queries/rfqs';
import { Button } from '@/components/ui/button';

// 4. Relative
import { LocalThing } from './local-thing';
```

---

## 11. Database Types Generation

```bash
# إنشاء types من Supabase
pnpm dlx supabase gen types typescript \
  --project-id $SUPABASE_PROJECT_ID \
  > lib/supabase/types.ts
```

استخدام في الكود:
```ts
import type { Database } from '@/lib/supabase/types';

type RFQ = Database['public']['Tables']['rfqs']['Row'];
```

---

## 12. ملخص

| الـ Layer | المسار | المسؤولية |
|----------|--------|-----------|
| Routes | `app/` | Page composition + layouts |
| Components | `components/` | UI primitives + feature components |
| Schemas | `schemas/` | Zod validation (shared) |
| Server | `server/` | Actions + queries + jobs |
| Lib | `lib/` | Supabase clients + utilities + i18n |
| Stores | `stores/` | Zustand client state |
| Hooks | `hooks/` | Custom React hooks |

> **القاعدة**: لو ملف يستخدم في **client + server** → `lib/` أو `schemas/`. لو في **server فقط** → `server/`. لو في **client فقط** → `components/` أو `stores/`.
