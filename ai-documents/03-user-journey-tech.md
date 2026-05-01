# Tech User Journey Map — رحلة المستخدم التقنية الكاملة

> **الهدف**: تحويل الـ 9 مراحل من Journey Map الرسمية إلى **رحلة تقنية ملموسة** = شاشات + APIs + states + transitions.

---

## نظرة كلية على الأدوار الأربعة

```
┌──────────────┬──────────────────────────────────────────────────────┐
│ Guest        │ زائر بدون حساب — صفحات تسويقية + صفحات الموردين العامة │
├──────────────┼──────────────────────────────────────────────────────┤
│ Client       │ الشركة المشترية — مدير تسويق/مشتريات                  │
├──────────────┼──────────────────────────────────────────────────────┤
│ Supplier     │ المورد — وكالة دعاية / شركة طباعة / منظم فعاليات        │
├──────────────┼──────────────────────────────────────────────────────┤
│ Admin        │ موظف المنصة — مراجعة + وساطة + إفراج مالي              │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

## رحلة 1 — Guest (الزائر)

### المرحلة 1: الاكتشاف
**Touchpoints**:
- LinkedIn Ad → `/ar/landing/leap-2026`
- Google Search → `/ar` (Home)
- توصية → `/ar/about`

**Screens**:
| الشاشة | الـ Route | المكونات الرئيسية |
|--------|-----------|-------------------|
| الصفحة الرئيسية | `/[locale]` | Hero + Value props + Logos + CTA |
| كيف نعمل | `/[locale]/how-it-works` | 7 خطوات + فيديو 90 ثانية |
| للموردين | `/[locale]/suppliers` | فوائد التسجيل + CTA |
| للعملاء | `/[locale]/clients` | فوائد + 3 ICPs (مخفية بـ tabs) |
| الموردون المعتمدون | `/[locale]/supplier/[slug]` | Profile عام للمورد (Portfolio + Reviews) |
| المعارض القادمة | `/[locale]/exhibitions` | Calendar — أفضل وقت لطلب RFQ |
| المدونة | `/[locale]/blog` | محتوى تعليمي (دليل المعرض الأول) |
| Pricing | `/[locale]/pricing` | شفافية العمولة 5% |
| About | `/[locale]/about` | الرؤية + الفريق |
| تواصل معنا | `/[locale]/contact` | نموذج بسيط |
| الشروط | `/[locale]/legal/terms` | |
| الخصوصية | `/[locale]/legal/privacy` | |

**State Machine**:
```
Guest:
  → ينقر "ابدأ كعميل" → Sign Up Client
  → ينقر "ابدأ كمورد" → Sign Up Supplier
  → ينقر "تسجيل دخول" → Login
  → يصفح profile مورد → Profile Viewer
```

### المرحلة 2: التقييم والتسجيل

#### Sign Up Client (3 خطوات)
| الخطوة | الـ Route | المدخلات |
|--------|-----------|---------|
| 1. الحساب | `/[locale]/signup/client/account` | Email, Password, Phone |
| 2. الشركة | `/[locale]/signup/client/company` | Company Name, CR Number, VAT (اختياري), City, Industry |
| 3. التحقق | `/[locale]/signup/client/verify` | OTP عبر Email |
| ✅ تفعيل | `/[locale]/dashboard/onboarding` | "Wow Moment" — أول توصية مورد في 60 ثانية |

#### Sign Up Supplier (4 خطوات)
| الخطوة | الـ Route | المدخلات |
|--------|-----------|---------|
| 1. الحساب | `/[locale]/signup/supplier/account` | Email, Password, Phone |
| 2. الشركة | `/[locale]/signup/supplier/company` | Company Name, CR, VAT, Bank Info |
| 3. التخصصات والتغطية | `/[locale]/signup/supplier/specializations` | Service Types[], Cities[], Min Order Value |
| 4. المستندات | `/[locale]/signup/supplier/documents` | Upload: CR PDF, VAT PDF, Portfolio PDF |
| ⏳ مراجعة | `/[locale]/dashboard/supplier/pending` | "حسابك قيد المراجعة (24-48 ساعة)" |
| ✅ تفعيل | Email link → Login | Admin يوافق → إيميل تفعيل |

#### Login
- `/[locale]/login` — Email + Password
- `/[locale]/login/magic-link` — للـ CEO (read-only)
- `/[locale]/forgot-password`
- `/[locale]/reset-password?token=`

---

## رحلة 2 — Client (العميل)

### الـ 9 مراحل من Journey Map → Tech Translation

#### المرحلة 1️⃣: الاكتشاف (Guest stage — قبل التسجيل)

#### المرحلة 2️⃣: التقييم
**Action**: يستكشف الموردين والـ case studies
**Screens**:
- `/[locale]/dashboard/discover` — Marketplace للموردين (فلاتر: تخصص، مدينة، تقييم)
- `/[locale]/supplier/[id]` — Profile كامل
- `/[locale]/case-studies` — قصص نجاح

#### المرحلة 3️⃣: الإعداد (Onboarding)
**Action**: يكمل Onboarding في 30-60 دقيقة
**Screens**:
| الشاشة | الـ Route | الهدف |
|--------|-----------|-------|
| Welcome | `/dashboard/onboarding/welcome` | فيديو 30 ثانية |
| المعرض المستهدف | `/dashboard/onboarding/exhibition` | اختيار من تقويم المعارض |
| الميزانية | `/dashboard/onboarding/budget` | تقدير + benchmarks |
| توصيات فورية | `/dashboard/onboarding/recommendations` | **Wow Moment** — 5 موردين مقترحين |
| ✅ Done | `/dashboard` | لوحة التحكم |

#### المرحلة 4️⃣: البحث والمقارنة (RFQ)
**Action**: ينشئ RFQ → يستقبل عروض → يقارن → يفاوض

**Sub-screens**:
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| New RFQ — Step 1 | `/dashboard/rfq/new/service` | اختيار نوع الخدمة (4 cards) |
| New RFQ — Step 2 | `/dashboard/rfq/new/details?type=booth` | نموذج ديناميكي حسب الخدمة |
| New RFQ — Step 3 | `/dashboard/rfq/new/files` | رفع التصميم/الشعار/المرجعيات |
| New RFQ — Step 4 | `/dashboard/rfq/new/review` | مراجعة + إرسال |
| RFQ Confirmation | `/dashboard/rfq/[id]/sent` | "تم الإرسال — العروض خلال 24 ساعة" |
| RFQs List | `/dashboard/rfqs` | جميع طلباتي مع فلاتر بالحالة |
| RFQ Details | `/dashboard/rfq/[id]` | تفاصيل + عروض واردة |
| Proposals Compare | `/dashboard/rfq/[id]/compare` | جدول مقارنة + AI Recommendation |
| Negotiation Chats | `/dashboard/rfq/[id]/chats` | حد أقصى 4 شات نشطة |
| Single Chat | `/dashboard/rfq/[id]/chat/[supplierId]` | غرفة شات (Real-time) |

**State machine لـ RFQ من منظور العميل**:
```
draft → open (24h timer)
  ↓
open + receiving proposals
  ↓
[يختار حتى 4 موردين للمفاوضة]
  ↓
negotiating (chats مفتوحة)
  ↓
[يختار الفائز]
  ↓
awarded → في انتظار توثيق الاتفاق
```

#### المرحلة 5️⃣: التعاقد
**Action**: يوثق الاتفاق + يدفع 50%

| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Agreement — Step 1 | `/dashboard/rfq/[id]/agreement/draft` | يكتب فهمه للاتفاق |
| Agreement — AI Analysis | `/dashboard/rfq/[id]/agreement/analysis` | AI يقارن مع فهم المورد |
| Agreement — Final | `/dashboard/rfq/[id]/agreement/final` | المسودة المعتمدة من Admin → Approve |
| Escrow Instructions | `/dashboard/rfq/[id]/escrow/deposit` | تفاصيل تحويل 50% |
| Upload Receipt | `/dashboard/rfq/[id]/escrow/upload-receipt` | رفع إيصال التحويل |
| Awaiting Confirmation | `/dashboard/rfq/[id]/escrow/awaiting` | "Admin يراجع التحويل" |

#### المرحلة 6️⃣: التنفيذ والمتابعة (4-10 أسابيع)
**Action**: يتابع التنفيذ + يراجع التصاميم + يدير اللوجستيات

| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Project Timeline | `/dashboard/rfq/[id]/timeline` | Milestones + إشعارات استباقية |
| Designs Review | `/dashboard/rfq/[id]/designs` | معاينة + تعليقات + موافقة |
| Logistics Tracker | `/dashboard/rfq/[id]/logistics` | تتبع الشحن (مرحلة 2) |
| Chat Window | persistent | الاتصال مع المورد + Admin |
| Panic Button | في كل صفحة المشروع | استدعاء Admin فوراً |

#### المرحلة 7️⃣: يوم المعرض
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Exhibition Day Mode | `/dashboard/rfq/[id]/exhibition-day` | Checklist 20 بنداً |
| Lead Capture | `/dashboard/rfq/[id]/leads` | QR + manual entry |
| Real-time Counter | persistent | "47 عميل محتمل حتى الآن" |

#### المرحلة 8️⃣: ما بعد المعرض
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Approve Delivery | `/dashboard/rfq/[id]/approve` | معاينة صور التسليم + Approve |
| Final Payment | `/dashboard/rfq/[id]/final-payment` | تحويل الـ 50% المتبقية |
| Review Supplier | `/dashboard/rfq/[id]/review` | 6 معايير + تعليق |
| ROI Report | `/dashboard/rfq/[id]/roi` | تقرير تلقائي للإدارة |
| Export Invoice | `/dashboard/rfq/[id]/invoice` | Download ZATCA PDF |

#### المرحلة 9️⃣: التجديد والولاء
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Annual Report | `/dashboard/reports/annual` | ROI تجميعي + مقارنة بسنة سابقة |
| Refer a Colleague | `/dashboard/refer` | برنامج الإحالة |
| Recommendations | `/dashboard/recommendations` | "موردون يناسبون معرضك القادم" |

---

## رحلة 3 — Supplier (المورد)

### الـ 6 مراحل لرحلة المورد

#### المرحلة 1️⃣: الاكتشاف والتسجيل (Guest stage)

#### المرحلة 2️⃣: المراجعة والتفعيل
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Pending Review | `/dashboard/supplier/pending` | "جاري المراجعة 24-48 ساعة" |
| Approved (Email) | إيميل + Login | Activation link |
| Tutorial | `/dashboard/supplier/tutorial` | جولة 5 دقائق |

#### المرحلة 3️⃣: استقبال الطلبات (RFQ Inbox)
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Dashboard | `/dashboard/supplier` | KPIs: عروض مرسلة، صفقات نشطة، أرباح |
| RFQs Available | `/dashboard/supplier/rfqs` | الطلبات المؤهلة (مفلترة بتخصصه) |
| RFQ Details | `/dashboard/supplier/rfq/[id]` | كل التفاصيل + ملفات + Submit Proposal |

#### المرحلة 4️⃣: تقديم العرض
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| New Proposal — Step 1 | `/dashboard/supplier/rfq/[id]/proposal/price` | السعر + المدة + الشروط |
| New Proposal — Step 2 | `/dashboard/supplier/rfq/[id]/proposal/details` | Scope of Work + Exclusions |
| New Proposal — Step 3 | `/dashboard/supplier/rfq/[id]/proposal/files` | رفع PDF العرض + ملفات |
| Submitted | `/dashboard/supplier/rfq/[id]/proposal/sent` | "في انتظار العميل" |

#### المرحلة 5️⃣: التفاوض والاتفاق
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Shortlisted Notification | `/dashboard/supplier` (toast) | "العميل اختارك للمفاوضة!" |
| Chat Room | `/dashboard/supplier/chat/[id]` | غرفة شات (real-time) |
| Awarded! | إيميل + push | "تهانينا، اخترت!" |
| Agreement Draft | `/dashboard/supplier/rfq/[id]/agreement` | يكتب فهمه |
| Agreement Approved | `/dashboard/supplier/rfq/[id]/agreement/approved` | "ابدأ العمل بعد تأمين الـ 50%" |

#### المرحلة 6️⃣: التنفيذ والتسليم
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Active Projects | `/dashboard/supplier/projects` | كل المشاريع النشطة |
| Project Workspace | `/dashboard/supplier/project/[id]` | Timeline + ملفات + شات |
| Upload Designs | `/dashboard/supplier/project/[id]/designs` | لمراجعة العميل |
| Submit Delivery | `/dashboard/supplier/project/[id]/delivery` | رفع صور التسليم + طلب Approve |
| Earnings | `/dashboard/supplier/earnings` | الرصيد المعلق + المتاح للسحب |
| Withdraw | `/dashboard/supplier/withdraw` | طلب تحويل بنكي |
| Reviews Received | `/dashboard/supplier/reviews` | تقييمات العملاء + الرد عليها |
| My Profile | `/dashboard/supplier/profile` | تعديل المعلومات + Portfolio |

---

## رحلة 4 — Admin (موظف المنصة)

### الـ 6 مسؤوليات الجوهرية

#### 1️⃣: مراجعة الموردين الجدد
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Suppliers Queue | `/admin/suppliers/pending` | قائمة المنتظرين |
| Supplier Review | `/admin/suppliers/[id]` | التحقق من CR + ZATCA + Portfolio |
| Approve / Reject | actions | مع ملاحظات |

#### 2️⃣: مراقبة الـ RFQs والمعاملات
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| All RFQs | `/admin/rfqs` | فلاتر بالحالة، التاريخ، الحجم |
| RFQ Deep Dive | `/admin/rfqs/[id]` | كل البيانات + الشات |
| Anomaly Detection | `/admin/anomalies` | RFQs معلقة طويلاً، شات بدون رد |

#### 3️⃣: التدخل في الشات (Panic Button)
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Active Chats | `/admin/chats` | جميع الشاتات النشطة |
| Panic Alerts | `/admin/panics` | تنبيهات زر الفزعة |
| Chat Intervention | `/admin/chat/[id]` | يمكن إرسال رسائل + قراءة كل شيء |

#### 4️⃣: اعتماد الاتفاقيات
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Agreements Queue | `/admin/agreements/pending` | في انتظار اعتماد Admin |
| Agreement Review | `/admin/agreements/[id]` | قراءة AI Analysis + اعتماد/تعديل |

#### 5️⃣: الإفراج المالي (Escrow Management)
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Pending Deposits | `/admin/escrow/pending-deposits` | إيصالات تحويل تنتظر تأكيد |
| Confirm Deposit | actions | تأكيد + إشعار المورد بالبدء |
| Pending Releases | `/admin/escrow/pending-releases` | RFQs مكتملة تنتظر تحويل للمورد |
| Release to Supplier | actions | تحويل + توليد فاتورة ZATCA |

#### 6️⃣: حل النزاعات
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Open Disputes | `/admin/disputes` | جميع النزاعات المفتوحة |
| Dispute Details | `/admin/disputes/[id]` | الأدلة + الشات الكامل + قرار |
| Field Visit Schedule | `/admin/field-visits` | جدولة زيارات ميدانية |

#### Bonus: Analytics + Reports
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| Dashboard | `/admin` | KPIs الكلية: GMV, Active RFQs, ... |
| Revenue Report | `/admin/reports/revenue` | شهري/ربعي/سنوي |
| Supplier Analytics | `/admin/reports/suppliers` | أفضل أداءً، الأكثر تأخراً |
| User Growth | `/admin/reports/growth` | تسجيلات جديدة، churn |

#### Bonus: User Management
| الشاشة | الـ Route | الوظيفة |
|--------|-----------|---------|
| All Users | `/admin/users` | بحث + فلتر بالدور |
| User Profile | `/admin/users/[id]` | تفاصيل + سجل الأنشطة |
| Suspend / Reactivate | actions | مع ملاحظات |

---

## مخطط الـ State Machine الكامل لـ RFQ

```
                                ┌─────────┐
                                │  draft  │  (العميل لسه ما أرسل)
                                └────┬────┘
                                     │ submit
                                     ▼
                                ┌─────────┐
                                │  open   │  (24 ساعة، الموردون يقدمون)
                                └────┬────┘
                                     │ client shortlists ≤4
                                     ▼
                              ┌─────────────┐
                              │ negotiating │  (شات مفتوح)
                              └─────┬───────┘
                                    │ client awards winner
                                    ▼
                              ┌─────────────┐
                              │  awarded    │  (في انتظار توثيق الاتفاق)
                              └─────┬───────┘
                                    │ both submit understanding
                                    │ AI analyzes
                                    │ admin approves
                                    ▼
                              ┌─────────────┐
                              │ in_escrow   │  (50% deposit)
                              └─────┬───────┘
                                    │ admin confirms deposit
                                    ▼
                              ┌─────────────┐
                              │ in_progress │  (المورد يعمل)
                              └─────┬───────┘
                                    │ supplier requests delivery confirm
                                    ▼
                              ┌─────────────┐
                              │  delivered  │  (بانتظار client approve)
                              └─────┬───────┘
                                    │ client approves + final 50%
                                    ▼
                              ┌─────────────┐
                              │  completed  │  (Admin يفرج للمورد)
                              └─────────────┘

  أي مرحلة بعد in_escrow يمكن أن تذهب لـ:
                              ┌─────────────┐
                              │   disputed  │  (زر الفزعة)
                              └─────────────┘
                                  │
                                  ▼
                        Admin Resolution:
                        - in favor of client → refund
                        - in favor of supplier → release
                        - both → partial refund
                              ┌─────────────┐
                              │  cancelled  │  (في حالات نادرة)
                              └─────────────┘
```

---

## مخطط حركة الـ User بين الشاشات (Cross-Role)

```
┌──────────┐     RFQ open       ┌──────────┐
│  Client  │ ─────────────────▶ │ Supplier │
│  creates │                    │  receives│
│   RFQ    │                    │   match  │
└────┬─────┘                    └────┬─────┘
     │                               │
     │       Proposal submitted      │
     │ ◀───────────────────────────  │
     │                               │
     │ Shortlists 4 suppliers        │
     │ ────────────────────────────▶ │
     │                               │
     │           Chat (real-time)    │
     │ ◀──────────►  Admin   ◀─────► │
     │                (silent)        │
     │                               │
     │  Awards 1 winner              │
     │ ────────────────────────────▶ │
     │                               │
     │  Both write understanding     │
     │ ──────────► AI ◀────────────  │
     │                               │
     │           Admin reviews       │
     │ ◀──────────  Admin   ────────▶│
     │                               │
     │  50% deposit                  │
     │ ──────► Admin confirms ──────▶│
     │                               │
     │       Work in progress        │
     │ ◀──── messages + files ──────▶│
     │                               │
     │        Delivery                │
     │ ◀──── photos + approve ──────  │
     │                               │
     │    Final 50% + Approve        │
     │ ──────► Admin releases ──────▶│
     │                               │
     │     Review (6 criteria)       │
     │ ────────────────────────────▶ │
     │                               │
     ▼                               ▼
   ROI Report                  Reputation +1
```

---

## Mobile vs Desktop (Responsiveness Priorities)

### يوم المعرض = Mobile First إلزامياً
- Lead Capture (QR scanner)
- Panic Button
- Live Counter
- Quick photos

### لوحة التحكم = Desktop First
- جداول مقارنة (تحتاج عرض)
- Analytics dashboards
- Admin views

### Real-time chat = Both
- يحتاج viewport محسّن للموبايل + الديسكتوب

---

## إشعارات (Notifications) — متى وأين

| الحدث | المستلم | القناة | الـ link |
|------|---------|--------|---------|
| RFQ جديد يطابق تخصصك | Supplier | In-app + Email | `/dashboard/supplier/rfq/[id]` |
| عرض جديد لـ RFQ | Client | In-app + Email | `/dashboard/rfq/[id]/compare` |
| تم اختيارك للمفاوضة | Supplier | In-app + Push | `/dashboard/supplier/chat/[id]` |
| تم اختيارك كفائز | Supplier | In-app + Email + Push | `/dashboard/supplier/rfq/[id]/agreement` |
| اعتماد الاتفاق من Admin | Both | In-app + Email | `/dashboard/rfq/[id]/escrow/deposit` |
| تأكيد استلام الـ 50% | Both | In-app + Push | `/dashboard/rfq/[id]/timeline` |
| طلب موافقة على التسليم | Client | In-app + Email + Push | `/dashboard/rfq/[id]/approve` |
| تم تأكيد التسليم | Supplier | In-app + Email | `/dashboard/supplier/earnings` |
| تم تحويل الأموال | Supplier | In-app + Email + SMS | `/dashboard/supplier/earnings` |
| تم تقييمك | Supplier | In-app | `/dashboard/supplier/reviews` |
| زر الفزعة | Admin | In-app + Email + SMS | `/admin/panics` |
| RFQ معلق > 7 أيام | Admin | In-app | `/admin/anomalies` |

---

## المرجع البصري للحالات (UI States)

كل صفحة تحتاج 4 حالات:
1. **Loading** — Skeleton مطابق للاي اوت النهائي
2. **Empty** — رسالة + CTA لإجراء أول
3. **Error** — رسالة خطأ + إعادة محاولة
4. **Success** — المحتوى الكامل

مثال: صفحة `dashboard/rfqs`:
- Loading: 3 cards skeleton
- Empty: "لم تنشئ أي طلب بعد — ابدأ أول طلب"
- Error: "حدث خطأ — حاول مرة أخرى"
- Success: قائمة الطلبات

---

## Cron Jobs المطلوبة (مرحلة 2 على Vercel)

| المهمة | التكرار | الـ Path |
|-------|---------|---------|
| إغلاق RFQs منتهية | كل ساعة | `/api/cron/close-expired-rfqs` |
| تذكير الموردين بالعروض المتأخرة | يومياً 9 صباحاً | `/api/cron/remind-suppliers` |
| تذكير العميل قبل المعرض | يومياً 9 صباحاً | `/api/cron/exhibition-reminders` |
| تقارير ROI تلقائية | بعد 48 ساعة من completed | `/api/cron/roi-reports` |
| تنظيف ملفات Storage القديمة | أسبوعياً | `/api/cron/cleanup-storage` |

---

## ✅ خلاصة الرحلة

| الدور | عدد الشاشات | عدد الإجراءات الجوهرية |
|------|-------------|------------------------|
| Guest | ~12 | 2 (Sign Up Client / Supplier) |
| Client | ~35 | 9 (المراحل) |
| Supplier | ~20 | 6 (المراحل) |
| Admin | ~25 | 6 (المسؤوليات) |
| **الإجمالي** | **~92 screen** | — |

> **مبدأ تصميمي**: لكل شاشة سؤال واحد فقط: **"ما الإجراء الواحد المتوقع من المستخدم هنا؟"** — لو الإجابة 3+ → اقسم الشاشة.
