# ai-documents — مستندات التخطيط والقرارات التقنية

> **المشروع**: تطبيق المعارض (App Exhibition)
> **النوع**: B2B Marketplace + SaaS هجين لقطاع الدعاية والمعارض في السعودية
> **المؤسس**: عبدالله زيدان
> **تاريخ الإنشاء**: 2026-05-01

هذا المجلد يحتوي على **كل المستندات التحليلية والتقنية** التي تسبق كتابة الكود. الهدف: أي مطور يدخل المشروع يقرأ هذا المجلد بترتيب ويفهم كل القرارات.

---

## ترتيب القراءة (مهم!)

| # | الملف | الغرض | الوقت |
|---|-------|------|------|
| 1 | [`00-files-observations.md`](./00-files-observations.md) | ملاحظات من الـ 4 PDFs الأصلية + التضاربات | 15 د |
| 2 | [`01-tech-stack-decisions.md`](./01-tech-stack-decisions.md) | كل قرار تقني + سببه + بديله | 20 د |
| 3 | [`02-database-schema.md`](./02-database-schema.md) | Schema + RLS + Triggers + Storage | 30 د |
| 4 | [`03-user-journey-tech.md`](./03-user-journey-tech.md) | Tech Journey لكل من 4 أدوار | 25 د |
| 5 | [`04-screens-inventory.md`](./04-screens-inventory.md) | جرد ~92 شاشة موزعة وموصوفة | 20 د |
| 6 | [`05-orders-flow-detailed.md`](./05-orders-flow-detailed.md) | منطق الـ Orders بالتفصيل (E2E) | 30 د |
| 7 | [`06-project-structure.md`](./06-project-structure.md) | هيكل المشروع Next.js 16 | 15 د |
| 8 | [`07-mvp-scope.md`](./07-mvp-scope.md) | MVP scope + 8 phases | 20 د |

**إجمالي وقت القراءة: ~3 ساعات** — يكفي لفهم المشروع بالكامل.

---

## 1. الفكرة في 30 ثانية

> منصة B2B Marketplace تربط مديري التسويق والمشتريات بالموردين المعتمدين (طباعة، أجنحة معارض، هدايا، فعاليات)، مع طبقة حماية مالية (Escrow 50%-50%)، شات real-time مع Admin طرف ثالث، توثيق اتفاقات بـ AI، وفاتورة ZATCA موحدة.
>
> **العمولة**: 5% فقط (2% عميل + 3% مورد).
> **الفرق عن المنافسين**: لا وكالة بهامش 60%، ولا واتساب فوضوي، ولا منصة عالمية بدون ZATCA.

---

## 2. القرارات الجوهرية بنظرة سريعة

### Tech Stack
```
Frontend:  Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui
Backend:   Next.js Server Actions + Route Handlers
DB:        PostgreSQL (Supabase managed) + RLS صارم
Auth:      Supabase Auth — 3 أدوار (admin, client, supplier)
Storage:   Supabase Storage (9 buckets)
Realtime:  Supabase Realtime (Chat + Notifications)
AI:        Vercel AI Gateway → Claude Sonnet 4.6
Email:     Resend
i18n:      next-intl (ar default, en optional)
Hosting:   Vercel (Fluid Compute, Node.js 24)
```

### Roles & Access
- **Guest**: 14 صفحة عامة (تسويق + Public Supplier Profiles)
- **Client**: 35 شاشة (Dashboard + RFQ Wizard + Compare + Chat + Approve)
- **Supplier**: 20 شاشة (Onboarding + Available RFQs + Submit Proposal + Project Workspace + Earnings)
- **Admin**: 25 شاشة (Reviews + Escrow + Disputes + Reports)
- **CEO Read-only**: 3 شاشات (Phase 2)

### الـ 9 ميزات التنافسية
1. عمولة 5% فقط
2. Escrow (50% مقدماً + 50% عند التسليم)
3. عين الـ CEO (read-only access)
4. زر الفزعة (يستدعي Admin)
5. AI لمقارنة العروض
6. AI لتوثيق الاتفاق
7. ZATCA Invoice موحدة
8. Corporate Wallet
9. CRM مجاني للموردين

---

## 3. الـ 16 أسبوع لـ MVP

```
Week 1-2:   التأسيس (Setup + Schema + Auth)
Week 3-4:   Onboarding (Sign Up + Verify)
Week 5-6:   RFQ Creation & Discovery
Week 7-8:   Proposals + AI Comparison
Week 9-10:  Real-time Chat (3 parties)
Week 11-12: Award + AI Agreement Documentation
Week 13-14: Escrow + Execution + Delivery
Week 15-16: Reviews + Polish + Launch
```

---

## 4. ما الذي ليس في الـ MVP

❌ Mobile native app (PWA كافي)
❌ ZATCA integration حقيقي (PDF عادي)
❌ Payment Gateway (تحويل بنكي يدوي)
❌ Lead Capture في يوم المعرض
❌ ROI Reports تلقائية
❌ CEO Read-only ("عين الـ CEO")
❌ Multi-team management
❌ التوسع الإقليمي

---

## 5. ICP (الهدف الأول)

| ICP | الحجم | دورة البيع | الأولوية |
|-----|-------|-----------|----------|
| ICP 1: شركات كبيرة (محمد السالم) | 500-3000 موظف | 45-90 يوم | قصوى |
| **ICP 2: متوسطة (سارة العتيبي)** | 100-500 موظف | 7-21 يوم | **الأنسب للـ MVP** |
| ICP 3: ناشئة ممولة (فيصل الشمري) | 50-200 موظف | 1-7 أيام | جيدة |

**ابدأ بـ ICP 2** للنتائج السريعة، **و Pilot ICP 1** بالخلفية للمصداقية.

---

## 6. القواعد الحاكمة (Non-Negotiables)

### Product Rules
- ❌ لا حذف لأي رسالة شات أو ملف مرفوع
- ❌ لا تواصل مباشر بين العميل والمورد خارج المنصة
- ❌ لا تحويل مالي مباشر — كل شيء عبر حساب المنصة
- ✅ Admin طرف ثالث صامت في كل شات
- ✅ Approve داخل المنصة فقط (لا DocuSign)
- ✅ زر الفزعة متاح في كل صفحة مشروع
- ✅ المورد لا يُفعّل إلا بعد موافقة Admin
- ✅ الأموال لا تُفرج إلا بضغط العميل + Admin

### Tech Rules
- ✅ Server Components افتراضياً
- ✅ `'use client'` فقط للتفاعل
- ✅ Zod validation على كل user input (frontend + backend)
- ✅ RLS policies على كل جدول
- ✅ Audit log لكل state transition حساس
- ✅ Idempotency للـ webhooks
- ✅ `proxy.ts` بدلاً من `middleware.ts` (Next.js 16)
- ✅ AI Gateway (لا OpenAI/Anthropic SDK مباشرة)
- ✅ TypeScript strict, no `any`

---

## 7. Risk Register

| Risk | الأثر | الحل المخطط |
|------|------|-------------|
| Solo Founder bottleneck | عالي | تجنيد co-founder تقني (مفاوضات Bound Technical) |
| ساما compliance للـ Escrow | عالي | في MVP: تحويل يدوي. Phase 2: PSP integration |
| ZATCA Phase 2 | متوسط | PDF عادي في MVP، integration حقيقي في Phase 2 |
| الموردون يتجاوزون المنصة | عالي | عقود SLA + ban policy + تتبع IPs/devices |
| الوكالات الكبرى تحتكر الموردين | متوسط | شراكات حصرية في البداية + تسعير حصري |
| نزاع مالي كبير | حرج | تأمين شامل قبل أول معاملة + استشارة قانونية |

---

## 8. كيف تستخدم هذه المستندات

### للمؤسس (عبدالله)
- اقرأ كل شيء بالترتيب
- أي قرار جديد → حدّث المستند المعني
- لا تبدأ كود قبل حسم تضاربات `00-files-observations.md`

### للمطور التالي (Co-founder/Hire)
- ابدأ بـ `README.md` (هذا)
- اقرأ `01-tech-stack-decisions.md` لفهم لماذا
- اقرأ `06-project-structure.md` قبل أي PR
- التزم بـ `07-mvp-scope.md` — لا scope creep

### للـ AI/LLM Assistants (Claude/GPT)
- ابدأ بـ `00-files-observations.md` للسياق
- استخدم `03-user-journey-tech.md` + `04-screens-inventory.md` كمرجع للـ UX
- استخدم `02-database-schema.md` كـ source of truth للـ DB
- استخدم `05-orders-flow-detailed.md` كـ source of truth للـ business logic
- التزم بـ `06-project-structure.md` للـ file organization

### للمستثمر
- اقرأ `README.md` (هذا) فقط
- ادخل على `07-mvp-scope.md` لرؤية timeline + KPIs

---

## 9. ما الخطوة التالية بعد قراءة هذه المستندات؟

### إذا أنت Founder
1. حسم تضاربات الوثائق الأصلية (راجع `00-files-observations.md` Section 5)
2. استشارة قانونية + محاسبية
3. حسم اسم النطاق (يفضل `.sa`)
4. تصميم Brand + Mockups Figma لـ 10 شاشات حرجة
5. تجنيد 5 موردين mock + قائمة 20 Pilot
6. إنشاء حساب بنكي تجاري + Vercel + Supabase + Resend

### إذا أنت Developer
1. `pnpm create next-app` حسب `06-project-structure.md`
2. Supabase setup + apply migrations من `02-database-schema.md`
3. Phase 0 من `07-mvp-scope.md`
4. PR صغيرة + Preview deployments

---

## 10. رابط للوثائق الأصلية

```
~/Downloads/المعارض - حمدي/
├── Vision___Mission_v2.pdf
├── تطبيق_المعارض___User_Journey_Map_v3.pdf
├── تطبيق_المعارض_-_ICP_v9.pdf
└── تطبيق_المعارض_-_الوثيقة_الداخلية_الشاملة_2.pdf
```

---

## 11. Changelog

### v1.1 — 2026-05-02 — مراجعة نقدية للـ Schema
بناءً على مراجعة خبير B2B Marketplace، طُبِّقت **5 إصلاحات حرجة** للـ MVP وأُجِّلت **5 نقاط** صراحةً لـ Phase 2:

**مُطبَّق في `02-database-schema.md`**:
- ✅ `escrow_events` — append-only ledger للمعاملات (تنظيمي/ساما)
- ✅ `agreement_revisions` — تاريخ تعديلات الاتفاقية (حماية قانونية)
- ✅ `invoices` — جدول مبسط للـ ZATCA (حقول Phase 2 فارغة)
- ✅ VAT fields على `escrow_transactions` (15% على العمولة)
- ✅ إصلاح Circular FK على `winning_proposal_id` + إضافة `inactive` لـ `supplier_status` + JSONB CHECK

**مُؤجَّل لـ Phase 2 (موثق في القسم 11 و12 من schema)**:
- ❌ `organizations` (دمج companies + suppliers)
- ❌ `company_members` (multi-user per company)
- ❌ `rfq_invitations` (تتبع supplier visibility)
- ❌ Per-service-type detail tables
- ❌ `chat_read_cursors` + إصلاحات scale أخرى

### v1.0 — 2026-05-01
- إنشاء جميع المستندات الـ 8
- تحليل كامل للـ 4 PDFs الأصلية
- قرارات تقنية محسومة (Next.js 16 + Supabase + AI Gateway)
- MVP scope محدد (16 أسبوع)
- ~92 شاشة مفصلة عبر 4 أدوار

---

## 12. الخلاصة

> **هذه المستندات هي العقد بين المؤسس والكود.**
> أي انحراف عنها يجب أن يمر بـ PR لتحديث المستند أولاً.
>
> **القاعدة الأخيرة**: المستندات حية — تتطور مع كل تعلم جديد من السوق والمستخدمين. لا تعاملها كـ stone tablets.
