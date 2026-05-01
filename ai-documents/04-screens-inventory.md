# Screens Inventory — جرد كامل للشاشات

> **الإجمالي**: ~92 شاشة موزعة على 4 أدوار + Shared
> **المنهج**: لكل شاشة → الـ route، الهدف الواحد، المكونات، الـ data sources، الـ states، الـ actions

---

## فهرس الشاشات بالأرقام

| الدور | عدد الشاشات | الأولوية في MVP |
|------|-------------|------------------|
| Public/Guest | 14 | عالية (10 منها Phase 1) |
| Client | 35 | قصوى (25 في Phase 1, 10 في Phase 2) |
| Supplier | 20 | قصوى (15 في Phase 1, 5 في Phase 2) |
| Admin | 25 | عالية (15 في Phase 1, 10 في Phase 2) |
| Shared (Auth/Errors) | 8 | قصوى (كلها Phase 1) |

---

## A. Guest / Public Screens (14 شاشة)

### A1. الصفحة الرئيسية
- **Route**: `/[locale]`
- **الهدف**: تحويل الزائر للتسجيل
- **المكونات**: Hero + Value props (الـ 9 ميزات) + Logos العملاء + 3 ICPs (tabs) + CTA
- **States**: Static (no API)
- **Actions**: ابدأ كعميل / ابدأ كمورد / تسجيل الدخول

### A2. كيف نعمل
- **Route**: `/[locale]/how-it-works`
- **الهدف**: شرح الـ 7 خطوات (RFQ → Approve)
- **المكونات**: Timeline visual + Video 90s + FAQ
- **States**: Static

### A3. للعملاء
- **Route**: `/[locale]/for-clients`
- **المكونات**: 3 tabs (ICP 1, 2, 3) + Pain → Solution + Pricing card + CTA

### A4. للموردين
- **Route**: `/[locale]/for-suppliers`
- **المكونات**: فوائد التسجيل (8 فوائد) + Stats + Reviews from suppliers + CTA

### A5. الموردون المعتمدون (Public Directory)
- **Route**: `/[locale]/suppliers`
- **المكونات**: Filters (تخصص، مدينة، تقييم) + Grid of supplier cards + Pagination
- **Data**: `suppliers` table where `status='approved'` and `is_public=true`

### A6. صفحة المورد العامة
- **Route**: `/[locale]/supplier/[id]`
- **المكونات**: Cover + Logo + About + Specializations + Portfolio gallery + Reviews + CTA "تواصل عبر RFQ"
- **Data**: `suppliers`, `supplier_portfolio`, `reviews`

### A7. تقويم المعارض
- **Route**: `/[locale]/exhibitions`
- **المكونات**: Calendar view + List view + Filters (city, industry)
- **Data**: ساكن مبدئياً (سوق ثابت)، API لاحقاً

### A8. المدونة
- **Route**: `/[locale]/blog`
- **المكونات**: Grid of articles + Categories + Search
- **محتوى MVP**: 5 مقالات (دليل المعرض الأول، توفير ميزانية، إلخ)

### A9. مقال المدونة
- **Route**: `/[locale]/blog/[slug]`
- **المكونات**: Article + Author + Related + Share buttons

### A10. التسعير
- **Route**: `/[locale]/pricing`
- **المكونات**: Card "5% فقط" + Breakdown (2% + 3%) + Comparison vs Agencies + FAQ

### A11. عن المنصة
- **Route**: `/[locale]/about`
- **المكونات**: Vision + Mission + الفريق + Story

### A12. تواصل معنا
- **Route**: `/[locale]/contact`
- **المكونات**: نموذج بسيط + Map + الإيميل + WhatsApp link

### A13. الشروط والأحكام
- **Route**: `/[locale]/legal/terms`

### A14. سياسة الخصوصية
- **Route**: `/[locale]/legal/privacy`

---

## B. Shared Screens (8 شاشات — تخدم كل الأدوار)

### B1. تسجيل الدخول
- **Route**: `/[locale]/login`
- **الفورم**: Email + Password + "تذكرني" + Forgot password link
- **Actions**: Submit, Forgot password, Sign up
- **Routing بعد النجاح**: حسب الدور (`profile.role`)

### B2. نسيت كلمة المرور
- **Route**: `/[locale]/forgot-password`

### B3. إعادة تعيين كلمة المرور
- **Route**: `/[locale]/reset-password?token=`

### B4. خطأ 404
- **Route**: `app/[locale]/not-found.tsx`

### B5. خطأ 500 / Global Error
- **Route**: `app/global-error.tsx`

### B6. تأكيد الإيميل
- **Route**: `/[locale]/auth/verify-email?token=`

### B7. صفحة الـ Magic Link لـ CEO (read-only)
- **Route**: `/[locale]/ceo-access?token=`

### B8. تسجيل الخروج (page transitional)
- **Route**: `/[locale]/logout` (يعيد توجيه)

---

## C. Client Screens (35 شاشة)

### C1-C7: التسجيل (Sign Up Client)

#### C1. اختيار الدور (Step 0)
- **Route**: `/[locale]/signup`
- **المكونات**: 2 cards (شركة / مورد)

#### C2. تسجيل العميل — Step 1: الحساب
- **Route**: `/[locale]/signup/client/account`
- **Fields**: Email, Password, Phone, Full Name

#### C3. تسجيل العميل — Step 2: الشركة
- **Route**: `/[locale]/signup/client/company`
- **Fields**: Company Name, CR Number, VAT (optional), City, Industry

#### C4. تسجيل العميل — Step 3: التحقق
- **Route**: `/[locale]/signup/client/verify`
- **Fields**: OTP من الإيميل

#### C5. Onboarding — Welcome
- **Route**: `/[locale]/dashboard/onboarding/welcome`
- **المحتوى**: فيديو 30 ثانية + "دعنا نجد أول مورد"

#### C6. Onboarding — معرضك القادم
- **Route**: `/[locale]/dashboard/onboarding/exhibition`
- **Fields**: Exhibition (autocomplete), Date, City

#### C7. Onboarding — التوصيات الفورية ("Wow Moment")
- **Route**: `/[locale]/dashboard/onboarding/recommendations`
- **المحتوى**: 5 موردين مقترحون مع تقييمات + CTA "أنشئ RFQ"

### C8-C12: لوحة التحكم الرئيسية

#### C8. Dashboard
- **Route**: `/[locale]/dashboard`
- **المكونات**:
  - KPIs cards: Active RFQs, Total Spent YTD, Avg ROI, Saved Time
  - Active RFQs widget (last 5)
  - Upcoming Exhibitions
  - Recommendations
  - Recent Notifications
- **Data**: aggregated from rfqs, escrow_transactions, etc.

#### C9. الإشعارات
- **Route**: `/[locale]/dashboard/notifications`
- **المكونات**: List + Filters (unread only, by type) + Mark all read

#### C10. الإعدادات — البروفايل
- **Route**: `/[locale]/dashboard/settings/profile`
- **Fields**: Name, Phone, Avatar, Language, Password change

#### C11. الإعدادات — الشركة
- **Route**: `/[locale]/dashboard/settings/company`
- **Fields**: Logo, Name, CR, VAT, Address, **CEO Email** (opt-in for "عين الـ CEO")

#### C12. الإعدادات — الفريق (مرحلة 2)
- **Route**: `/[locale]/dashboard/settings/team`
- **المحتوى**: دعوة أعضاء فريق إضافيين

### C13-C17: استكشاف وإنشاء RFQ

#### C13. اكتشف الموردين
- **Route**: `/[locale]/dashboard/discover`
- **المكونات**: Filters متقدمة + Grid + "أنشئ RFQ مع هذا المورد" CTA

#### C14. RFQ Wizard — Step 1: نوع الخدمة
- **Route**: `/[locale]/dashboard/rfq/new/service`
- **المكونات**: 4 cards (booth, gifts, event, printing)

#### C15. RFQ Wizard — Step 2: التفاصيل (ديناميكي)
- **Route**: `/[locale]/dashboard/rfq/new/details?type=booth`
- **Forms**: مختلفة حسب النوع (راجع `00-files-observations.md` Section 4.3)

#### C16. RFQ Wizard — Step 3: الملفات
- **Route**: `/[locale]/dashboard/rfq/new/files`
- **Upload**: Logo, Design references, Brand guidelines

#### C17. RFQ Wizard — Step 4: المراجعة والإرسال
- **Route**: `/[locale]/dashboard/rfq/new/review`
- **المحتوى**: Summary + Submit button → "العروض خلال 24 ساعة"

### C18-C24: متابعة الـ RFQs والعروض

#### C18. RFQs List
- **Route**: `/[locale]/dashboard/rfqs`
- **المكونات**: Tabs (All, Open, Negotiating, Active, Completed) + Search

#### C19. RFQ Details
- **Route**: `/[locale]/dashboard/rfq/[id]`
- **المكونات**: Header + Tabs (Details, Proposals, Chats, Timeline, Files, Invoice)

#### C20. Proposals Compare (Top Decision Screen)
- **Route**: `/[locale]/dashboard/rfq/[id]/compare`
- **المكونات**:
  - Comparison Table (السعر، المدة، التقييم، الأعمال السابقة)
  - AI Recommendation Card
  - Per-proposal AI summary
  - "أضف للمفاوضة" (max 4) buttons
  - "اطلب توضيحاً" CTA

#### C21. Single Proposal Detail
- **Route**: `/[locale]/dashboard/rfq/[id]/proposal/[proposalId]`
- **المكونات**: Full proposal + PDF viewer + Supplier sidebar

#### C22. Active Negotiation Chats
- **Route**: `/[locale]/dashboard/rfq/[id]/chats`
- **المكونات**: Tabs (4 max) + Active chat panel

#### C23. Chat Window
- **Route**: `/[locale]/dashboard/rfq/[id]/chat/[supplierId]`
- **المكونات**:
  - Header (supplier name + Panic Button)
  - Messages stream (real-time)
  - Composer (text + file)
  - Typing indicator
  - Admin badge "Admin يستمع للمحادثة"

#### C24. Award Winner
- **Route**: `/[locale]/dashboard/rfq/[id]/award`
- **المحتوى**: Confirmation modal "هل أنت متأكد من اختيار [supplier]؟"

### C25-C30: الاتفاقية والـ Escrow

#### C25. Agreement — Draft
- **Route**: `/[locale]/dashboard/rfq/[id]/agreement/draft`
- **Fields**: Textarea "اكتب فهمك للاتفاق"

#### C26. Agreement — AI Analysis
- **Route**: `/[locale]/dashboard/rfq/[id]/agreement/analysis`
- **المحتوى**: نقاط متفق عليها / متناقضة / مفقودة + "Edit my version" / "Send to Admin"

#### C27. Agreement — Final Approve
- **Route**: `/[locale]/dashboard/rfq/[id]/agreement/final`
- **المحتوى**: النص النهائي من Admin + Approve button

#### C28. Escrow — Deposit Instructions
- **Route**: `/[locale]/dashboard/rfq/[id]/escrow/deposit`
- **المحتوى**: Bank details + Amount (50%) + "حوّل ثم ارفع الإيصال"

#### C29. Escrow — Upload Receipt
- **Route**: `/[locale]/dashboard/rfq/[id]/escrow/upload-receipt`
- **Upload**: PDF/Image of bank transfer

#### C30. Escrow — Awaiting Confirmation
- **Route**: `/[locale]/dashboard/rfq/[id]/escrow/awaiting`
- **المحتوى**: "Admin يراجع التحويل (30 دقيقة - 2 ساعة في وقت العمل)"

### C31-C35: التنفيذ والإغلاق

#### C31. Project Timeline
- **Route**: `/[locale]/dashboard/rfq/[id]/timeline`
- **المكونات**: Vertical timeline + Milestones + Status chips

#### C32. Designs Review
- **Route**: `/[locale]/dashboard/rfq/[id]/designs`
- **المحتوى**: Gallery + Comments per image + Approve/Request changes

#### C33. Approve Delivery
- **Route**: `/[locale]/dashboard/rfq/[id]/approve`
- **المكونات**: Delivery photos + Notes + Approve button + Reject + Panic

#### C34. Final Payment
- **Route**: `/[locale]/dashboard/rfq/[id]/final-payment`
- **المحتوى**: Bank details for remaining 50%

#### C35. Review Supplier
- **Route**: `/[locale]/dashboard/rfq/[id]/review`
- **Fields**: 6 ratings (1-5 stars) + comment + public/private toggle

### Bonus (Phase 2):
- ROI Report (`/dashboard/rfq/[id]/roi`)
- Annual Report (`/dashboard/reports/annual`)
- Invoice Download (`/dashboard/rfq/[id]/invoice`)
- Refer a Colleague (`/dashboard/refer`)
- Recommendations Engine (`/dashboard/recommendations`)
- Lead Capture (`/dashboard/rfq/[id]/leads`) — للموبايل
- Exhibition Day Mode (`/dashboard/rfq/[id]/exhibition-day`)

---

## D. Supplier Screens (20 شاشة)

### D1-D5: التسجيل والمراجعة

#### D1. Sign Up — Account
- **Route**: `/[locale]/signup/supplier/account`

#### D2. Sign Up — Company
- **Route**: `/[locale]/signup/supplier/company`
- **Fields**: Company Name, CR, VAT, Bank Info

#### D3. Sign Up — Specializations
- **Route**: `/[locale]/signup/supplier/specializations`
- **Fields**: Service types[], Cities[], Min order, Years experience

#### D4. Sign Up — Documents
- **Route**: `/[locale]/signup/supplier/documents`
- **Upload**: CR PDF, VAT PDF, Portfolio PDF, Sample images

#### D5. Pending Review
- **Route**: `/[locale]/dashboard/supplier/pending`
- **المحتوى**: Status + Expected timeline

### D6-D10: الـ Dashboard

#### D6. Supplier Dashboard
- **Route**: `/[locale]/dashboard/supplier`
- **المكونات**:
  - KPIs: Available RFQs, Active Projects, Pending Earnings, Withdrawable Balance
  - New RFQs widget
  - Active Projects widget
  - Reviews summary
  - Performance metrics

#### D7. Available RFQs
- **Route**: `/[locale]/dashboard/supplier/rfqs`
- **المكونات**: Filters (service, city, budget) + List + "تقدم بعرض" CTA

#### D8. RFQ Details (Supplier view)
- **Route**: `/[locale]/dashboard/supplier/rfq/[id]`
- **المحتوى**: كل تفاصيل العميل + ملفات + "تقدم بعرض" أو "مش مهتم"

#### D9. My Profile (Edit)
- **Route**: `/[locale]/dashboard/supplier/profile`
- **Tabs**: General, Specializations, Portfolio, Bank Info

#### D10. Portfolio Management
- **Route**: `/[locale]/dashboard/supplier/profile/portfolio`
- **المحتوى**: Add/Edit/Delete portfolio items + Reorder

### D11-D15: تقديم العرض والتفاوض

#### D11. New Proposal — Step 1: Pricing
- **Route**: `/[locale]/dashboard/supplier/rfq/[id]/proposal/price`

#### D12. New Proposal — Step 2: Scope
- **Route**: `/[locale]/dashboard/supplier/rfq/[id]/proposal/details`

#### D13. New Proposal — Step 3: Files
- **Route**: `/[locale]/dashboard/supplier/rfq/[id]/proposal/files`

#### D14. Proposals List (My)
- **Route**: `/[locale]/dashboard/supplier/proposals`
- **المكونات**: Tabs (Submitted, Under Review, Shortlisted, Accepted, Rejected)

#### D15. Chat Window (Supplier side)
- **Route**: `/[locale]/dashboard/supplier/chat/[id]`
- **مماثل لـ C23**

### D16-D20: التنفيذ والمالية

#### D16. Active Projects
- **Route**: `/[locale]/dashboard/supplier/projects`

#### D17. Project Workspace
- **Route**: `/[locale]/dashboard/supplier/project/[id]`
- **Tabs**: Timeline, Designs, Files, Chat, Delivery

#### D18. Submit Delivery
- **Route**: `/[locale]/dashboard/supplier/project/[id]/delivery`
- **Upload**: Photos + Video + Notes

#### D19. Earnings & Withdrawals
- **Route**: `/[locale]/dashboard/supplier/earnings`
- **المكونات**: Pending balance + Available + History + "Withdraw" CTA

#### D20. Reviews Received
- **Route**: `/[locale]/dashboard/supplier/reviews`
- **المكونات**: List + Reply CTA + Filters

---

## E. Admin Screens (25 شاشة)

### E1-E5: Dashboard & Overview

#### E1. Admin Dashboard
- **Route**: `/admin`
- **المكونات**:
  - KPIs: GMV, Active RFQs, Pending Reviews, Open Disputes
  - Activity Feed
  - Alerts (Panic buttons, anomalies)

#### E2. Activity Log
- **Route**: `/admin/activity`
- **Data**: from `audit_logs`

#### E3. Anomaly Detection
- **Route**: `/admin/anomalies`
- **Logic**: RFQs > 7 days no proposals, chats with no response, etc.

#### E4. System Settings
- **Route**: `/admin/settings`
- **المحتوى**: Commission rates, Email templates, Service types

#### E5. Admin Users Management
- **Route**: `/admin/admins`
- **المحتوى**: قائمة الإداريين + الصلاحيات (مرحلة 2)

### E6-E10: User Management

#### E6. All Users
- **Route**: `/admin/users`
- **المكونات**: Tabs (Clients, Suppliers), Search, Filters

#### E7. User Profile
- **Route**: `/admin/users/[id]`
- **المحتوى**: Profile + History + Actions (Suspend/Activate/Reset password)

#### E8. Suppliers Pending Review
- **Route**: `/admin/suppliers/pending`
- **المكونات**: Queue + Quick stats

#### E9. Supplier Review Detail
- **Route**: `/admin/suppliers/[id]`
- **المحتوى**: Documents preview + Notes + Approve/Reject

#### E10. All Suppliers
- **Route**: `/admin/suppliers`
- **المكونات**: Filters by status + Performance metrics

### E11-E15: RFQ & Operations

#### E11. All RFQs
- **Route**: `/admin/rfqs`
- **Filters**: Status, Service Type, City, Date range

#### E12. RFQ Deep Dive
- **Route**: `/admin/rfqs/[id]`
- **المحتوى**: كل التفاصيل + Proposals + Chats + Timeline + Audit

#### E13. All Chats Monitor
- **Route**: `/admin/chats`
- **المكونات**: قائمة الشاتات النشطة + Search

#### E14. Chat Intervention
- **Route**: `/admin/chat/[id]`
- **المحتوى**: Read all + Send messages (with admin badge)

#### E15. Panic Alerts
- **Route**: `/admin/panics`
- **المحتوى**: Active alerts + Quick response actions

### E16-E20: Financial Operations

#### E16. Pending Deposits
- **Route**: `/admin/escrow/pending-deposits`
- **المحتوى**: Receipts to verify + "Confirm" action

#### E17. Verify Deposit
- **Route**: `/admin/escrow/deposit/[id]`
- **المحتوى**: Receipt preview + Confirm/Reject + Notes

#### E18. Pending Releases
- **Route**: `/admin/escrow/pending-releases`
- **المحتوى**: Approved deliveries → release to supplier

#### E19. Process Release
- **Route**: `/admin/escrow/release/[id]`
- **المحتوى**: Amount calculation + Bank transfer + Mark released

#### E20. All Transactions
- **Route**: `/admin/escrow/transactions`
- **المكونات**: Full ledger + Export CSV

### E21-E25: Disputes & Reports

#### E21. Open Disputes
- **Route**: `/admin/disputes`
- **المكونات**: قائمة + Priority + Assignee

#### E22. Dispute Details
- **Route**: `/admin/disputes/[id]`
- **المحتوى**: Evidence + Chat history + Resolution form

#### E23. Field Visits Schedule
- **Route**: `/admin/field-visits`
- **المكونات**: Calendar + Assigned visits

#### E24. Agreements Pending Approval
- **Route**: `/admin/agreements/pending`

#### E25. Reports & Analytics
- **Route**: `/admin/reports`
- **Tabs**: Revenue, Suppliers, Users, RFQs

---

## F. CEO Read-Only Screens (3 شاشات — ميزة "عين الـ CEO")

### F1. CEO Dashboard
- **Route**: `/[locale]/ceo/[token]`
- **المحتوى**: All RFQs of the company + Total spent + Top suppliers

### F2. CEO RFQ View
- **Route**: `/[locale]/ceo/[token]/rfq/[id]`
- **المحتوى**: Read-only لكل تفاصيل الـ RFQ + Comparison + Decision rationale

### F3. CEO Reports
- **Route**: `/[locale]/ceo/[token]/reports`
- **المحتوى**: ROI report + Spending trends

---

## ملخص الشاشات حسب الأولوية

### Phase 1 (MVP — أول 3 أشهر) — ~55 شاشة
**Public**: A1, A2, A3, A4, A5, A6, A10, A11, A13, A14
**Shared**: B1, B2, B3, B4, B5, B6, B8
**Client**: C1-C5, C8, C9, C13, C14-C17, C18, C19, C20, C22, C23, C25-C30, C31, C33, C34, C35
**Supplier**: D1-D6, D7, D8, D11-D15, D16-D19
**Admin**: E1, E6, E8, E9, E11, E12, E15, E16, E17, E18, E19, E21, E22, E24

### Phase 2 (شهور 4-6) — ~25 شاشة
- A7 (Calendar), A8-A9 (Blog), A12 (Contact)
- C6, C7 (Onboarding deep), C10-C12 (Settings), C24 (Award), C32 (Designs), Bonus screens
- D9, D10 (Profile mgmt), D20 (Reviews)
- E2, E3, E4, E10, E13, E14, E20, E23, E25
- F1, F2, F3 (CEO Read-only)

### Phase 3 (شهور 7-12) — ~12 شاشة
- Mobile-specific (Lead Capture, Exhibition Day)
- Advanced Analytics
- Refer a Colleague
- Team management
- Cron-managed screens (auto-reports)

---

## مكونات مشتركة (Shared Components) عبر الشاشات

| المكون | يُستخدم في | الوصف |
|--------|-----------|-------|
| `<RFQStatusBadge />` | كل صفحة فيها RFQ | Pill ملونة بالحالة |
| `<PanicButton />` | كل chat + project page | يستدعي Admin |
| `<AdminPresenceIndicator />` | كل chat | "Admin يستمع للمحادثة" |
| `<ServiceTypeIcon />` | RFQ cards, lists | Icon لكل خدمة |
| `<ProposalCard />` | Compare, Lists | Card للعرض |
| `<SupplierMiniCard />` | Recommendations, Lists | Card مختصر |
| `<RatingStars />` | Reviews everywhere | 5 نجوم |
| `<NotificationBell />` | Header all dashboards | Counter + dropdown |
| `<LanguageSwitcher />` | Header public + dashboard | ar/en |
| `<RoleBasedSidebar />` | كل dashboard layout | حسب الدور |
| `<FileUploader />` | RFQ, Proposal, Delivery | Drag-drop + preview |
| `<EscrowProgressBar />` | RFQ details | الـ 7 خطوات |
| `<ChatWindow />` | Client + Supplier + Admin | Real-time |
| `<DataTable />` | Lists everywhere | Sortable + filterable |
| `<EmptyState />` | كل قائمة فارغة | Illustration + CTA |
| `<LoadingSkeleton />` | كل صفحة | Skeleton الـ layout |

---

## مرجع التصميم — كل شاشة لها

```
┌──────────────────────────────────────────────────────┐
│  Header / Breadcrumbs                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Page Title + Primary Action                         │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Main Content (state-aware)                  │    │
│  │  - Loading: Skeleton                         │    │
│  │  - Empty: Illustration + CTA                 │    │
│  │  - Error: Message + Retry                    │    │
│  │  - Success: Actual data                      │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## ✅ الخلاصة

- **92 شاشة** موزعة على 4 أدوار + Shared
- **55 شاشة في Phase 1** (الأساس الذي يجعل المنصة تعمل end-to-end)
- **25 شاشة في Phase 2** (تحسينات + ميزات تنافسية)
- **12 شاشة في Phase 3** (Polish + Advanced features)

> **القاعدة**: أي شاشة لا تخدم الـ ICP 1 أو ICP 2 (الأولوية الأعلى) → تُؤجل لـ Phase 2+
