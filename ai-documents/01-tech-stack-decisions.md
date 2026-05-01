# قرارات الـ Tech Stack

> **المبدأ**: كل قرار له **سبب من الوثائق** + **بديل مرفوض** + **متى نعيد التقييم**.

---

## 1. الـ Stack بنظرة سريعة

```
┌─────────────────────────────────────────────────────────┐
│  Frontend          → Next.js 16 (App Router) + TS       │
│  Styling           → Tailwind CSS v4 + shadcn/ui        │
│  Forms             → React Hook Form + Zod              │
│  State (client)    → Zustand (للحالة الكبيرة فقط)        │
│  i18n / RTL        → next-intl (ar default, en optional)│
│                                                         │
│  Backend           → Next.js Route Handlers + Server    │
│                      Actions + Supabase                 │
│  Database          → PostgreSQL (Supabase managed)      │
│  Auth              → Supabase Auth                      │
│  Storage           → Supabase Storage                   │
│  Realtime          → Supabase Realtime (للشات + الإشعارات)│
│  RLS               → Postgres Row-Level Security        │
│                                                         │
│  AI                → Vercel AI Gateway (Claude Sonnet)  │
│                      للمقارنة + توثيق الاتفاق            │
│  Email             → Resend                             │
│  Hosting           → Vercel (Fluid Compute, Node.js 24) │
│  Monitoring        → Vercel Analytics + Sentry          │
│  Payments (later)  → HyperPay/Tap/Moyasar (مرحلة 2)      │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Framework — Next.js 16 (App Router)

### القرار
استخدام **Next.js 16 App Router** مع TypeScript و Server Components افتراضياً.

### السبب من الوثائق
- ICP 1 (محمد السالم) **يبحث على Google** عن "موردي معارض السعودية" → **SEO حرج**
- **Server Components** = أمان أكبر للـ business logic (لا يُسرّب لـ client)
- **RSC** = أداء أفضل للوحات Dashboard المعقدة (Admin + CEO Eye)
- **Streaming + Suspense** = تحسين تجربة استقبال العروض في الوقت الفعلي

### بديل مرفوض
- ❌ **Vite + React (المذكور في الوثيقة الشاملة)** — مرفوض لأن:
  - لا SEO تلقائي (يحتاج SSR يدوي)
  - لا File-based routing
  - لا Server Components
- ❌ **Remix** — مجتمع أصغر في السعودية، أدوات أقل
- ❌ **SvelteKit** — يحتاج إعادة تدريب الفريق المستقبلي

### إعدادات حاكمة
```ts
// قواعد لا تُكسر
- App Router فقط (لا Pages Router)
- Server Components افتراضياً
- 'use client' فقط للتفاعل (forms, charts, real-time)
- proxy.ts بدلاً من middleware.ts (Next.js 16)
- Turbopack افتراضياً
- Node.js runtime (لا Edge للأمان والاستقرار)
```

### متى نعيد التقييم
بعد 6 أشهر إذا ظهرت Next.js 17 بميزات حاسمة (نادر).

---

## 3. Database — PostgreSQL على Supabase

### القرار
**Supabase Postgres** كـ Single Source of Truth.

### السبب
- **Supabase ذُكر صراحة** في الوثيقة الشاملة كاختيار مفضل
- **Postgres** = أقوى علاقات + JSON Mixed (لمدخلات RFQ المختلفة)
- **RLS** = حماية تلقائية بحسب الدور (admin/client/supplier)
- **Realtime مدمج** = لا حاجة لـ Pusher/Ably منفصل
- **Auth + Storage + DB في مكان واحد** = سرعة بناء الـ MVP

### بديل مرفوض
- ❌ **Vercel Postgres** — مهجور حسب knowledge update
- ❌ **MongoDB** — لا يناسب الفواتير والمعاملات المالية (ACID مطلوب)
- ❌ **Firebase** — Firestore لا يناسب JOIN معقدة + قفل قاعدة بيانات
- ❌ **Neon (Vercel Marketplace)** — جيد، لكن لا يجمع Auth + Storage في حزمة واحدة

### Schema المبدئية
- 12 جدول رئيسي (راجع `02-database-schema.md`)
- استخدام `jsonb` لـ RFQ details (مرونة بين 4 خدمات)
- `uuid` للـ PK كل الجداول
- `created_at` + `updated_at` على كل جدول
- Soft delete عبر `deleted_at` للجداول الحساسة (لا حذف فعلي)

### حدود لازم نحترمها
- ⚠️ **حجز أموال الغير = ساما**: Supabase ليس مرخصاً → في MVP، نسجل المعاملات فقط (التحويل خارجي)
- ⚠️ **حجم الملفات في Storage**: 50MB لكل ملف (Supabase Free)، ترقية مدفوعة عند 1GB+

---

## 4. Auth — Supabase Auth

### القرار
**Supabase Auth** مع 3 أدوار: `admin`, `client`, `supplier`.

### السبب
- مدمج مع RLS بشكل طبيعي (`auth.uid()` في كل policy)
- يدعم Email + Password + OTP + OAuth
- التحقق من البريد المؤسسي مذكور في الوثائق
- مجاني حتى 50,000 MAU

### تدفق التسجيل
```
Client:
  1. Email + Password → التحقق من الإيميل المؤسسي
  2. ملء بيانات الشركة (الاسم، CR، VAT)
  3. تفعيل تلقائي

Supplier:
  1. Email + Password
  2. ملء البيانات + رفع السجل التجاري + ZATCA + Portfolio
  3. حالة "قيد المراجعة" (لا يمكن تقديم عروض)
  4. Admin يراجع → يفعّل أو يرفض
```

### بديل مرفوض
- ❌ **Clerk** — ممتاز لكن مكلف عند الـ scale + احتكاك إضافي مع Supabase RLS
- ❌ **NextAuth** — يحتاج DB schema يدوية + لا يدمج مع Supabase RLS بسلاسة
- ❌ **Auth0** — مكلف جداً للـ B2B بهذا الحجم

---

## 5. Realtime Chat — Supabase Realtime

### القرار
**Supabase Realtime** للشات بين العميل والمورد، مع Admin طرف ثالث صامت.

### السبب
- مذكور صراحة في الوثائق
- يستخدم Postgres Logical Replication (موثوق)
- مجاني حتى 200 concurrent connections
- لا حاجة لـ WebSocket server منفصل

### قواعد الشات (من الوثائق)
- ❌ لا يمكن حذف أي رسالة (audit trail قانوني)
- ✅ Admin مشترك تلقائياً في كل غرفة شات (read + send)
- ✅ زر الفزعة يرسل event خاص يستدعي Admin
- ✅ كل ملف مرفوع يبقى للأبد
- ✅ كل شات مربوط بـ RFQ واحد (لا شات بدون سياق)

### بديل مرفوض
- ❌ **Pusher** — تكلفة إضافية + إعداد منفصل
- ❌ **Socket.io** — يحتاج Node server مخصص (لا يعمل مع Vercel Fluid Compute بسلاسة)
- ❌ **Ably** — جيد لكن أغلى من Supabase

---

## 6. AI Layer — Vercel AI Gateway

### القرار
**Vercel AI Gateway** مع Claude Sonnet 4.6 كـ default model.

### السبب
- **عربي ممتاز** (Claude متفوق على GPT في العربية)
- **Vercel AI Gateway** = موحد + observability + fallbacks
- **Claude Sonnet 4.6** = توازن سعر/جودة ممتاز
- ZDR (Zero Data Retention) متاح

### الاستخدامات في الـ MVP
1. **AI Comparison** — مقارنة 3-5 عروض أسعار + توصية
2. **AI Documentation** — تحليل فهم كل طرف للاتفاق + كشف التناقضات
3. **AI Search** — ربط RFQ بالموردين المؤهلين تلقائياً (مرحلة 2)
4. **AI ROI Report** — توليد تقرير ROI تلقائي بعد المعرض (مرحلة 2)

### الكود نموذجياً
```ts
import { generateText } from 'ai';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4.6', // عبر AI Gateway (نقاط لا شَرطات في الإصدار)
  prompt: `قارن العروض التالية...`,
});
```

### بديل مرفوض
- ❌ **OpenAI مباشرة** — Claude أفضل في العربي
- ❌ **Anthropic SDK مباشرة** — AI Gateway يضيف observability + fallback مجاناً

---

## 7. Styling — Tailwind CSS v4 + shadcn/ui

### القرار
**Tailwind CSS v4** + **shadcn/ui** للمكونات الأساسية.

### السبب
- مذكور صراحة في الوثائق
- shadcn = ملكية كاملة للكود (لا حزمة خارجية تتحكم في styling)
- دعم RTL ممتاز
- مكونات جاهزة لكل ما نحتاجه (Form, Dialog, Tabs, DataTable)

### إعدادات RTL
```tsx
// app/[locale]/layout.tsx
<html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
```

### Font Stack
- **عربي**: IBM Plex Sans Arabic عبر `next/font/google`
- **إنجليزي**: Inter عبر `next/font/google`

### بديل مرفوض
- ❌ **MUI** — حزمة كبيرة + RTL مضطرب أحياناً
- ❌ **Chakra UI** — توقف تطوير v3 الأخير
- ❌ **Radix من الصفر** — shadcn مبني عليه أصلاً + مكونات جاهزة

---

## 8. Forms — React Hook Form + Zod

### القرار
**React Hook Form** للنماذج + **Zod** للـ validation.

### السبب
- نماذج RFQ معقدة (4 أنواع خدمات × 8-12 حقل لكل نوع)
- Zod schemas تُستخدم في **frontend + backend** (DRY)
- تكامل ممتاز مع shadcn/ui Form

### نمط Schema موحد
```ts
// schemas/rfq.ts
export const rfqBoothSchema = z.object({
  serviceType: z.literal('booth'),
  area: z.string(),
  exhibitionName: z.string(),
  // ...
});

// تُستخدم في:
// - Server Action للحفظ
// - React Hook Form للنموذج
// - API Route Handler إذا احتجناه
```

---

## 9. i18n — next-intl

### القرار
**next-intl** للترجمة، عربي افتراضي + إنجليزي اختياري.

### السبب
- **عربي default** لأن السوق سعودي 100%
- **إنجليزي اختياري** للـ ICP 3 (الناشئة الممولة) و bilingual personas
- next-intl مدمج تماماً مع App Router + Server Components

### Routing
```
/ar (default)  → الواجهة العربية
/en            → الواجهة الإنجليزية
```

### الملفات
```
messages/
  ar.json
  en.json
```

---

## 10. Hosting — Vercel

### القرار
**Vercel** على **Fluid Compute** (Node.js 24).

### السبب
- مدمج تماماً مع Next.js
- Preview Deployments لكل PR
- AI Gateway مدمج
- Vercel Postgres? **لا** — نستخدم Supabase

### الإعدادات
```ts
// vercel.ts
import { type VercelConfig } from '@vercel/config/v1';

export const config: VercelConfig = {
  framework: 'nextjs',
  buildCommand: 'next build',
  // crons للتذكيرات قبل المعارض (مرحلة 2)
};
```

### بديل مرفوض
- ❌ **Netlify** — أقل تكاملاً مع Next.js 16
- ❌ **Cloudflare Pages** — يحتاج Edge runtime، نحن نريد Node.js
- ❌ **Self-hosted (Docker)** — تكلفة إدارية كبيرة لـ MVP

---

## 11. Monitoring & Observability

### القرار
- **Vercel Analytics** — للـ traffic
- **Sentry** — للـ error tracking
- **Supabase Logs** — للـ DB queries
- **Vercel AI Gateway Dashboard** — للـ AI usage

---

## 12. Email — Resend

### القرار
**Resend** للإيميلات التشغيلية.

### السبب
- API نظيف
- React Email templates (نفس الـ stack)
- مجاني حتى 3000/شهر

### الاستخدامات
- تأكيد التسجيل
- إشعارات RFQ جديدة (للموردين)
- إشعار اختيار العرض (للموردين)
- إشعار تأمين Escrow
- تنبيه قبل المعرض (مرحلة 2)

---

## 13. ما **لن** نستخدمه في الـ MVP

| الخدمة | لماذا ليس الآن | متى نفكر فيها |
|--------|----------------|---------------|
| Stripe / محفظة افتراضية | يحتاج رخصة ساما | بعد التراخيص (شهر 6+) |
| Vercel KV / Redis | لا حاجة للـ caching المعقد بعد | عند 100+ معاملة/يوم |
| WebSockets مخصصة | Supabase Realtime يكفي | لا توجد حاجة |
| ZATCA Integration حقيقي | تحتاج موافقة Phase 2 | بعد إثبات النموذج |
| Mobile App (RN/Native) | الـ web responsive يكفي | بعد 100 عميل نشط |
| BNPL / QuickPay | شراكات مالية مطلوبة | مرحلة 3 |
| ESG Reports | للشركات الكبيرة جداً | مرحلة 3 |
| Edge Functions | Fluid Compute Node.js يكفي | غالباً لا |

---

## 14. الـ Dependencies الرئيسية المتوقعة

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.6.0",

    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",

    "next-intl": "^3.20.0",

    "tailwindcss": "^4.0.0",
    "@radix-ui/react-*": "...",
    "lucide-react": "^0.460.0",
    "class-variance-authority": "...",

    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.9.0",

    "ai": "^6.0.0",
    "zustand": "^5.0.0",

    "resend": "^4.0.0",
    "react-email": "...",

    "date-fns": "^4.0.0",
    "@vercel/analytics": "^1.4.0"
  },
  "devDependencies": {
    "@types/node": "...",
    "@types/react": "...",
    "eslint": "...",
    "prettier": "...",
    "@playwright/test": "..."
  }
}
```

---

## 15. متغيرات البيئة المطلوبة

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # للـ Admin operations فقط (server-side)

# AI — Vercel AI Gateway (لا متغير بيئة مطلوب)
# المصادقة عبر OIDC tokens يديرها Vercel تلقائياً — لا rotation يدوي.
# الإنتاج: ربط المشروع بـ Vercel كافٍ.
# التطوير المحلي: شغّل `vercel link` ثم `vercel env pull .env.local`
#   → يُحقن VERCEL_OIDC_TOKEN قصير العمر تلقائياً مع كل pull.

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=ar

# المرحلة 2
PAYMENT_PROVIDER_KEY=              # HyperPay/Tap/Moyasar
ZATCA_CERTIFICATE=
ZATCA_SECRET=
```

---

## 16. مخطط القرار النهائي

| الطبقة | الأداة | النسخة | البديل لو فشل |
|--------|--------|--------|----------------|
| Framework | Next.js | 16 | Remix |
| Language | TypeScript | 5.6+ | — |
| DB | Postgres | 15+ (Supabase) | Neon |
| Auth | Supabase Auth | latest | Clerk |
| Storage | Supabase Storage | latest | Vercel Blob |
| Realtime | Supabase Realtime | latest | Pusher |
| Styling | Tailwind | v4 | — |
| UI | shadcn/ui | latest | Radix من الصفر |
| Forms | React Hook Form + Zod | latest | — |
| i18n | next-intl | 3 | next-i18next |
| AI | AI Gateway + Claude | Sonnet 4.6 | OpenAI |
| Email | Resend | latest | Postmark |
| Hosting | Vercel | — | Railway |
| Runtime | Node.js | 24 LTS | — |

---

## 17. مبدأ توجيهي

> **نختار الأداة الأقل تعقيداً التي تحل المشكلة، ولا نضيف layer إلا إذا كان ألمه واضحاً في الوثائق.**
> كل dependency = surface attack + maintenance burden + onboarding cost للمطور التالي.
