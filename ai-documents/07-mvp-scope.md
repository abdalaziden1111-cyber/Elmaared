# MVP Scope & Build Phases

> **القاعدة الذهبية**: MVP = الحد الأدنى الذي يثبت أن العميل والمورد يمكنهما إنجاز معاملة كاملة (RFQ → Escrow → Delivery → Review) عبر المنصة.
> أي ميزة لا تخدم هذه الدورة → تُؤجل.

---

## 1. تعريف الـ MVP

### الهدف الواحد
أول معاملة حقيقية قابلة للإنهاء على المنصة بين عميل ومورد، مع Admin يضمن السلامة المالية والتشغيلية.

### معيار النجاح
- ✅ عميل ينشئ RFQ
- ✅ 3+ موردين مؤهلين يقدمون عروضاً
- ✅ AI يقارن ويوصي
- ✅ العميل يفاوض ويختار
- ✅ كل طرف يكتب فهمه للاتفاق
- ✅ AI يكشف التناقضات
- ✅ Admin يعتمد
- ✅ Escrow (تحويل بنكي يدوي)
- ✅ المورد ينفذ ويسلّم
- ✅ العميل يوافق
- ✅ Admin يفرج للمورد
- ✅ تقييم متبادل

---

## 2. الـ Phases الزمنية

### Phase 0: التأسيس (الأسبوع 1-2)
**الهدف**: مشروع شغّال على localhost + Vercel

**Deliverables**:
- [ ] `pnpm create next-app` (Next.js 16 App Router + TS)
- [ ] Tailwind v4 + shadcn/ui init
- [ ] Supabase project (production + staging)
- [ ] vercel link + deploy first commit
- [ ] CI/CD: GitHub Actions (lint + typecheck + build على PR)
- [ ] Sentry setup
- [ ] Environment variables موزعة على 3 بيئات (dev, preview, prod)
- [ ] هيكل المجلدات حسب `06-project-structure.md`
- [ ] DB schema الأساسي (الـ 14 جدول الرئيسية)
- [ ] RLS policies الأولية
- [ ] Database types generation script
- [ ] proxy.ts (auth gate + role-based routing + i18n)
- [ ] next-intl setup (ar default)
- [ ] Layout عام + RTL/LTR + fonts (IBM Plex Arabic + Inter)

---

### Phase 1: Auth & Onboarding (الأسبوع 3-4)
**الهدف**: المستخدم يسجل ويصل لـ dashboard فارغ حسب دوره

**Deliverables**:
- [ ] صفحة الـ Home (A1) — basic version
- [ ] صفحة Login (B1)
- [ ] صفحة Sign Up — اختيار الدور (C1)
- [ ] Sign Up Client — 3 steps (C2, C3, C4)
- [ ] Sign Up Supplier — 4 steps (D1, D2, D3, D4)
- [ ] Email verification flow (B6)
- [ ] Forgot/Reset password (B2, B3)
- [ ] Dashboard routing بحسب الدور (proxy.ts)
- [ ] Client Dashboard فارغ (C8 — placeholder)
- [ ] Supplier Pending screen (D5)
- [ ] Admin يوافق على المورد → email تفعيل
- [ ] Logout flow

**Acceptance**:
- يمكن للعميل التسجيل والوصول لـ /dashboard
- يمكن للمورد التسجيل ورؤية "قيد المراجعة"
- يمكن للـ Admin (manually created) رؤية الموردين المنتظرين

---

### Phase 2: RFQ Creation & Discovery (الأسبوع 5-6)
**الهدف**: العميل ينشئ RFQ والمورد يستقبله

**Deliverables**:
- [ ] صفحة Discover (C13) — قائمة موردين معتمدين
- [ ] Public Supplier Profile (A6)
- [ ] RFQ Wizard 4 steps (C14, C15, C16, C17)
  - [ ] نموذج Booth (الأولوية القصوى)
  - [ ] نموذج Gifts
  - [ ] نموذج Event
  - [ ] نموذج Printing
- [ ] رفع الملفات → Supabase Storage
- [ ] RFQs List للعميل (C18)
- [ ] RFQ Details (C19)
- [ ] Trigger DB: إشعارات الموردين المؤهلين
- [ ] Email template: rfq-match.tsx
- [ ] Available RFQs للمورد (D7)
- [ ] RFQ Details للمورد (D8)
- [ ] إعدادات بسيطة (Profile + Company) (C10, C11, D9)

**Acceptance**:
- العميل ينشئ RFQ ويراها في قائمته
- الموردون المؤهلون يصلهم email + in-app notification
- المورد يفتح الـ RFQ ويرى التفاصيل كاملة

---

### Phase 3: Proposals & AI Comparison (الأسبوع 7-8)
**الهدف**: المورد يقدم عرض، AI يحلل، العميل يقارن

**Deliverables**:
- [ ] Submit Proposal Wizard (D11, D12, D13)
- [ ] AI Scoring لكل عرض (background job via waitUntil)
- [ ] My Proposals للمورد (D14)
- [ ] Compare Proposals للعميل (C20)
- [ ] AI Recommendation Card
- [ ] Single Proposal View (C21)
- [ ] Email: proposal-received للعميل
- [ ] إشعارات in-app

**Acceptance**:
- مورد يقدم عرضاً → AI يحلله في < 30 ثانية
- العميل يفتح صفحة المقارنة ويرى جدول + AI rec
- العميل يستطيع إضافة موردين للقائمة المختصرة (max 4)

---

### Phase 4: Real-time Chat & Negotiation (الأسبوع 9-10)
**الهدف**: التفاوض والشات في الوقت الحقيقي + Admin مشرف

**Deliverables**:
- [ ] Chats List (C22)
- [ ] Chat Window (C23) — Real-time عبر Supabase channels
- [ ] Supplier Chat Window (D15)
- [ ] رفع ملفات في الشات
- [ ] Panic Button (يستدعي Admin)
- [ ] Admin Presence Indicator
- [ ] Admin Active Chats (E13)
- [ ] Admin Chat Intervention (E14)
- [ ] Admin Panic Alerts (E15)
- [ ] Email + SMS لـ Admin عند Panic
- [ ] إشعار Shortlisted للمورد

**Acceptance**:
- 3 أطراف يتراسلون في الوقت الفعلي
- زر الفزعة يستدعي Admin خلال 30 ثانية
- Admin يستطيع إرسال رسالة بـ badge "Admin"

---

### Phase 5: Award & Agreement (الأسبوع 11-12)
**الهدف**: الاتفاقية الموثقة بـ AI

**Deliverables**:
- [ ] Award Winner action (C24)
- [ ] Agreement Draft من العميل (C25)
- [ ] Agreement Draft من المورد (Supplier UI)
- [ ] AI Analysis للاتفاق (Output.object schema)
- [ ] Admin Review Agreement (E24)
- [ ] Final Agreement Approve (C27)
- [ ] إشعارات الإغلاق للموردين الآخرين

**Acceptance**:
- بعد Award، RFQ في حالة `awarded`
- كل طرف يكتب فهمه → AI يكشف التناقضات
- Admin يعتمد → كلا الطرفين يوقّع → RFQ في `in_escrow`

---

### Phase 6: Escrow & Execution (الأسبوع 13-14)
**الهدف**: الدفع المحمي والتنفيذ

**Deliverables**:
- [ ] Escrow Deposit Page (C28)
- [ ] Upload Receipt (C29)
- [ ] Awaiting Confirmation (C30)
- [ ] Admin Pending Deposits (E16)
- [ ] Admin Confirm Deposit (E17)
- [ ] Project Timeline (C31) — basic version
- [ ] Active Projects للمورد (D16)
- [ ] Project Workspace (D17)
- [ ] Submit Delivery (D18)
- [ ] Approve Delivery (C33)
- [ ] Final Payment Page (C34)
- [ ] Admin Pending Releases (E18)
- [ ] Admin Process Release (E19)
- [ ] Earnings للمورد (D19)
- [ ] إشعارات في كل مرحلة

**Acceptance**:
- العميل يحول 50% → Admin يؤكد → المورد يبدأ
- المورد يسلم → العميل يوافق → 50% الباقية
- Admin يحول للمورد → المورد يرى الرصيد

---

### Phase 7: Reviews + Foundations Polish (الأسبوع 15-16)
**الهدف**: إغلاق الدورة + جاهزية الإطلاق

**Deliverables**:
- [ ] Review Supplier (C35)
- [ ] Reviews Received للمورد (D20)
- [ ] Reviews على Public Profile (A6)
- [ ] Triggers لتحديث supplier stats
- [ ] Disputes (E21, E22) — basic flow
- [ ] Admin Reports KPIs (E1 — basic)
- [ ] Notifications page (C9)
- [ ] إصلاحات UX من اختبار الـ 10 Pilot
- [ ] Performance: lighthouse score > 90
- [ ] SEO basics (sitemap, robots, OG images)
- [ ] Marketing pages (A2, A3, A4, A10)

**Acceptance**:
- معاملة كاملة E2E تتم على المنصة
- العميل يقيّم المورد بـ 6 معايير
- 10 شركات Pilot يستخدمون المنصة

---

## 3. ما **لن** يكون في الـ MVP (يُؤجل)

### Phase 2 (شهور 5-6 بعد الإطلاق):
- ❌ ZATCA E-invoice integration حقيقي (في MVP: PDF عادي)
- ❌ Payment Gateway (HyperPay/Tap) — في MVP: تحويل بنكي يدوي
- ❌ ROI Report تلقائي
- ❌ Lead Capture في يوم المعرض
- ❌ تقويم المعارض interactive
- ❌ Blog
- ❌ CEO Read-only ("عين الـ CEO")
- ❌ CRM المجاني للموردين
- ❌ Annual Reports
- ❌ Refer a Colleague program
- ❌ Multi-team management
- ❌ Mobile app (PWA basic كافي)

### Phase 3 (بعد Series A):
- ❌ QuickPay (دفع سريع للمورد)
- ❌ BNPL B2B
- ❌ ESG Reports
- ❌ TWalk-in payment options
- ❌ التوسع لـ EAU/Kuwait

---

## 4. Definition of Done (DoD) لكل feature

كل ميزة لا تُعتبر منجزة إلا بعد:
1. ✅ TypeScript types صحيحة (no `any`)
2. ✅ Zod validation على كل user input
3. ✅ Server-side authentication checked
4. ✅ RLS policies on all touched tables
5. ✅ Loading state + Empty state + Error state
6. ✅ Mobile responsive (375px + 1440px tested)
7. ✅ RTL works correctly
8. ✅ Audit log entry لكل state change حساس
9. ✅ Email/Notification إذا relevant
10. ✅ Manual QA على الـ Preview deployment
11. ✅ Performance: lazy load حيث ممكن

---

## 5. الـ Non-functional Requirements

### Performance
- **LCP < 2.5s** على 3G connection
- **TTFB < 800ms** للصفحات الـ dynamic
- **Lighthouse score > 90** للصفحات الرئيسية

### Security
- ✅ HTTPS only
- ✅ HSTS headers
- ✅ CSP strict
- ✅ Rate limiting على Auth endpoints
- ✅ Service role key لا يُستخدم في client code
- ✅ Storage signed URLs للملفات الحساسة
- ✅ No PII in logs

### Reliability
- ✅ Error boundaries على كل route
- ✅ Sentry لـ exception tracking
- ✅ Vercel Analytics للـ web vitals
- ✅ Database backups يومية (Supabase Pro)
- ✅ Idempotency للـ webhooks

### Compliance
- ✅ Privacy Policy متوافق مع نظام حماية البيانات السعودي
- ✅ Terms of Service يغطي مسؤولية المنصة كـ PO رسمي
- ⏳ ZATCA Phase 2 integration (Phase 2 من المنتج)
- ⏳ ساما compliance للمحفظة الافتراضية (مستقبلاً)

---

## 6. مؤشرات النجاح بعد الإطلاق

### Week 1
- [ ] 5 موردين معتمدين
- [ ] أول RFQ على المنصة
- [ ] Zero critical bugs

### Month 1
- [ ] 30 موردين
- [ ] 50 RFQ
- [ ] 5 معاملات مكتملة
- [ ] NPS > 40

### Month 3
- [ ] 100 موردين
- [ ] 300 RFQ
- [ ] 50 معاملة مكتملة
- [ ] GMV: 1.5م ريال
- [ ] NPS > 60

### Month 6
- [ ] 200 موردين
- [ ] 1000 RFQ
- [ ] 200 معاملة
- [ ] GMV: 7.5م ريال
- [ ] أول investment round prep

---

## 7. ميزانية وقت تقريبية

| Phase | الأسابيع | عدد الـ tasks تقريبي |
|-------|---------|---------------------|
| 0 — التأسيس | 1-2 | 15 |
| 1 — Auth & Onboarding | 3-4 | 12 |
| 2 — RFQ & Discovery | 5-6 | 18 |
| 3 — Proposals & AI | 7-8 | 10 |
| 4 — Chat & Real-time | 9-10 | 14 |
| 5 — Award & Agreement | 11-12 | 8 |
| 6 — Escrow & Execution | 13-14 | 18 |
| 7 — Reviews & Polish | 15-16 | 15 |
| **الإجمالي** | **16 أسبوع** | **~110 task** |

> **ملاحظة**: هذا تقدير لـ Solo founder + 1 مساعد تقني. يمكن تقليصه إلى 12 أسبوع مع team من 3 (1 fullstack senior + 1 UI + 1 backend).

---

## 8. ما يُبنى أولاً قبل أي كود (الأسبوع 0)

### Pre-development checklist
- [ ] حسم تعارضات الوثائق (5% vs 3%، 4 vs 5 موردين)
- [ ] استشارة قانونية: مسؤولية المنصة كـ PO
- [ ] استشارة محاسبية: ZATCA + الفواتير
- [ ] تجهيز حساب بنكي للمنصة (commercial)
- [ ] اختيار اسم النطاق (`.sa` يفضل)
- [ ] تصميم الشعار + Brand guidelines
- [ ] Mockups لـ 10 شاشات حرجة (Figma)
- [ ] تجنيد 5 موردين mock للاختبار
- [ ] قائمة 20 شركة Pilot كأهداف
- [ ] صفحة Coming Soon لجمع emails

---

## 9. Anti-Patterns — لا تفعل

❌ **لا تبدأ بالـ Mobile App** — Web responsive كافٍ
❌ **لا تبني خاصية AI advanced** قبل MVP — Claude Sonnet مع prompt جيد كافٍ
❌ **لا تبني Payment Gateway حقيقي** قبل التراخيص — تحويل يدوي + إيصال
❌ **لا تدخل في 4 خدمات معاً** — ركز على Booth أولاً
❌ **لا تبني CMS داخلي** — استخدم Markdown ثابت في البداية
❌ **لا تتسرع في multi-language** — العربي يكفي لـ 6 أشهر
❌ **لا تبني Analytics معقد** — Vercel Analytics + 3 KPIs أساسية تكفي
❌ **لا تستهدف 3 ICPs معاً** — ركز على ICP 2 (سارة) لـ Wins سريعة + Pilot ICP 1 (محمد) في الباكجراوند

---

## 10. الخلاصة

> **MVP في 16 أسبوع** = منصة كاملة E2E تستطيع تنفيذ معاملة بقيمة 100K ريال بأمان.
> **بعد MVP**: تراكم بيانات + تعليقات → تحديد Phase 2 المركز.

> **القاعدة الذهبية للـ Solo founder**: إذا الميزة لا تخدم الـ 16 أسبوع → ضعها في `LATER.md`.
