# App Exhibition — تطبيق المعارض

> **B2B Marketplace + SaaS** هجين لقطاع الدعاية والمعارض في المملكة العربية السعودية.
> يربط مديري التسويق بالموردين المعتمدين، مع طبقة حماية مالية (Escrow)، شات real-time، توثيق اتفاقات بالذكاء الاصطناعي، وفاتورة ZATCA موحدة.

**الشعار**: مستقبل الفعاليات.. صار أذكى.

---

## الحالة الحالية

🟡 **Pre-development** — التخطيط والتصميم. الكود لم يبدأ بعد.

كل التوثيق موجود في [`ai-documents/`](./ai-documents/).

---

## التقنيات المختارة

```
Frontend:  Next.js 16 App Router + TypeScript + Tailwind v4 + shadcn/ui
Backend:   Next.js Server Actions + Route Handlers
Database:  PostgreSQL على Supabase (مع RLS صارم)
Auth:      Supabase Auth (3 أدوار: admin/client/supplier)
Storage:   Supabase Storage
Realtime:  Supabase Realtime (Chat + Notifications)
AI:        Vercel AI Gateway → Claude Sonnet 4.6
Email:     Resend
i18n:      next-intl (ar default, en optional)
Hosting:   Vercel (Fluid Compute, Node.js 24)
```

---

## الـ MVP في 16 أسبوع

| Phase | الأسابيع | المحتوى |
|-------|---------|---------|
| 0 | 1-2 | التأسيس (Setup + Schema + Auth) |
| 1 | 3-4 | Onboarding (Sign Up + Verify) |
| 2 | 5-6 | RFQ Creation & Discovery |
| 3 | 7-8 | Proposals + AI Comparison |
| 4 | 9-10 | Real-time Chat (3 parties) |
| 5 | 11-12 | Award + AI Agreement Documentation |
| 6 | 13-14 | Escrow + Execution + Delivery |
| 7 | 15-16 | Reviews + Polish + Launch |

---

## ابدأ من هنا

اقرأ الوثائق بالترتيب التالي:

1. [`ai-documents/README.md`](./ai-documents/README.md) — فهرس وقواعد حاكمة
2. [`ai-documents/00-files-observations.md`](./ai-documents/00-files-observations.md) — تحليل الـ 4 PDFs الأصلية
3. [`ai-documents/01-tech-stack-decisions.md`](./ai-documents/01-tech-stack-decisions.md) — قرارات Stack
4. [`ai-documents/02-database-schema.md`](./ai-documents/02-database-schema.md) — Schema (v1.1 بعد المراجعة النقدية)
5. [`ai-documents/03-user-journey-tech.md`](./ai-documents/03-user-journey-tech.md) — رحلة كل دور تقنياً
6. [`ai-documents/04-screens-inventory.md`](./ai-documents/04-screens-inventory.md) — جرد ~92 شاشة
7. [`ai-documents/05-orders-flow-detailed.md`](./ai-documents/05-orders-flow-detailed.md) — تدفق الـ Orders E2E
8. [`ai-documents/06-project-structure.md`](./ai-documents/06-project-structure.md) — هيكل Next.js
9. [`ai-documents/07-mvp-scope.md`](./ai-documents/07-mvp-scope.md) — Phases وDoD

---

## القواعد الذهبية

### Product
- ❌ لا حذف لأي رسالة شات أو ملف
- ❌ لا تواصل خارج المنصة
- ❌ لا تحويل مالي مباشر — كل شيء عبر حساب المنصة
- ✅ Admin طرف ثالث صامت في كل شات
- ✅ Approve داخل المنصة فقط
- ✅ Escrow 50% + 50%

### Tech
- ✅ Server Components افتراضياً
- ✅ Zod validation على كل user input
- ✅ RLS على كل جدول
- ✅ Audit log لكل state transition حساس
- ✅ TypeScript strict, no `any`

---

## License

سري وخاص — Confidential © 2026
