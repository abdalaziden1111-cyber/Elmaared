# Microcopy Guide — Elmaared

**Source:** UX Plan v2, §14.3 (Information Design Strategy).
**Audience:** every dev writing user-visible text. Read this before adding new strings to `lib/i18n/messages/*.json` or hard-coded Arabic in pages.

---

## The 12-Term Plain Language Dictionary

The committee decided English jargon kills trust with a Saudi B2B audience. Replace every technical term in user-visible copy with the plain equivalent. The English term may still appear in legal pages, tooltips, and audit logs.

| ❌ Don't use (jargon) | ✅ Use (plain) | Why |
|----------------------|---------------|-----|
| Escrow Account | أمانة Elmaared™ | "أمانة" carries religious/ethical weight in Saudi culture (Decision #04). |
| RFQ / Request for Quotation | طلب عرض أسعار | Arabic by default; no English abbreviations in body copy. |
| Onboarding | إعداد الحساب | "إعداد" is concrete; "Onboarding" is opaque. |
| SLA / Service Level Agreement | تعهّد الخدمة | "تعهّد" reads as a promise, not an HR doc. |
| Dispute Resolution | حلّ الخلافات | "خلاف" sits lighter than "نزاع". |
| KYC / Know Your Customer | التحقق من الهوية | Compliance lingo simplified. |
| Payment Processing | تنفيذ الدفع | Concrete verb. |
| Verification Badge | توثيق المنصة | "توثيق" is a familiar Saudi concept (Twitter blue tick mental model). |
| Lead Capture | تسجيل الزوّار | "Lead" isn't legible to Sara (the buyer persona). |
| ROI Dashboard | تقرير العائد | Numbers belong in a "تقرير", not a "Dashboard". |
| Bidding | تقديم العروض | "المزايدة" implies haggling; we don't haggle. |
| Bulk Actions | إجراءات متعددة | Plain. |

**Rule of thumb:** if you'd say it differently to your mom than to a developer, use the mom-version in the UI and keep the developer-version in code/comments.

---

## Numerals & Currency

| Rule | Example |
|------|---------|
| Large amounts: Arabic-Indic digits with thousands separator | `42,000 ر.س` |
| Percentages: digit + `%` | `5%` (not "خمسة بالمئة") |
| Counts <10 in flowing prose: word | "خمس عروض" |
| Counts in tables / stats: digit | `5` |
| Years: Hijri + Gregorian | `1447هـ (2026م)` |

---

## Tone Guide

- **Voice:** professional and warm. Saudi audiences read American "Hi, welcome!" as cold.
- **Greeting:** "أهلاً سارة، شرّفتنا" beats "Hi Sarah, welcome".
- **Polite particles:** "الرجاء" not "بليز". "تواصل معنا" not "كلّمنا".
- **Email salutations:** "السلام عليكم ورحمة الله وبركاته" for formal outbound mail.
- **Avoid:**
  - Empty filler ("يرجى الانتظار..." with no context).
  - Generic errors ("حدث خطأ" with no recovery hint).
  - Generic CTAs ("موافق" / "إرسال" when a specific verb fits).

---

## State Messages — Canonical Examples

Use `t('common.states.<key>')` from `lib/i18n/messages/{ar,en}.json` for these contexts. New keys go in the `common.states` namespace.

| Context | ❌ Stock | ✅ Plan v2 |
|---------|---------|----------|
| Loading offers | "يرجى الانتظار..." | "نحضّر لك العروض المميزة..." (`common.states.loadingProposals`) |
| Loading payment | "جارٍ التحميل..." | "نحوّل الدفعة بأمان..." (`common.states.loadingPayment`) |
| AI working | "AI يعمل..." | "AI يحلّل العرض لك..." (`common.states.loadingAi`) |
| Empty events list | "لا توجد فعاليات" | "حان وقت معرضك الأول. اضغط هنا للبدء." (`common.states.noEvents`) |
| Payment bank error | "حدث خطأ. حاول مجدداً" | "البنك لم يستجب. أمانتك آمنة. جرّب بعد 5 دقائق أو راسلنا." (`common.states.bankUnresponsive`) |
| RFQ sent success | "تم الإرسال بنجاح" | "وصل طلبك للمزوّدين. ستصلك العروض خلال 24 ساعة." (`common.states.rfqSubmitted`) |
| Confirm destructive action | "هل أنت متأكد؟" | "هذا الإجراء سيُلغي تجهيزات المورد. تحبّ الاستمرار؟" (`common.states.confirmDestructive`) |
| Primary CTA on RFQ form | "موافق" / "إرسال" | "احصل على عروض" / "أرسل الطلب الآن" |

Pattern: **state + reassurance + action**. Tell the user what's happening, that they're not in danger, and what to do next.

---

## How to Use This in New Code

1. **Before adding a new string**, scan this guide for the right plain term.
2. Prefer adding to `common.states.*` over inventing local strings.
3. If the string is one-off and clearly contextual (e.g. a feature-specific empty state), inline Arabic is fine — but copy the **tone** from §State Messages above.
4. If you're unsure, ask for a microcopy review in PR.

---

## Compliance with Plan v2 §14.3

- [x] 12-term dictionary documented
- [x] Numerals & currency rules documented
- [x] Tone guide (warmth + Saudi formality) documented
- [x] State-message examples documented + corresponding `common.states.*` keys added to `lib/i18n/messages/{ar,en}.json`
- [ ] Sweep of existing strings to apply the new tone (deferred — most existing copy is already aligned; touched only the highest-traffic surfaces in Sprint 0. Full sweep happens in Sprint 4 alongside Saudi Cultural Layer.)
