# Database Schema — Supabase Postgres

> **القاعدة**: PostgreSQL via Supabase. كل الجداول لها `id uuid`، `created_at`، `updated_at`. الجداول الحساسة لها `deleted_at` (soft delete) — لا حذف فعلي إطلاقاً.

> **مراجعة v1.1 (2026-05-01)**: مراجعة نقدية أُجريت → 5 إصلاحات مطبقة (escrow ledger، agreement versions، VAT fields، circular FK، supplier `inactive`)، 5 نقاط مؤجلة لـ Phase 2 (راجع `## 11. ما تم تأجيله صراحة لـ Phase 2` في آخر هذا المستند).

> **افتراضات MVP الصارمة**:
> - مستخدم واحد لكل شركة (لا multi-tenant داخل company)
> - دور واحد لكل user (`client` XOR `supplier` — دمجهما = Phase 2)
> - تحويل بنكي يدوي + تأكيد Admin (لا PSP integration)
> - فاتورة ZATCA = PDF منسّق فقط (لا e-invoice XML integration)

---

## 1. ENUMs

```sql
-- الأدوار
CREATE TYPE user_role AS ENUM ('admin', 'client', 'supplier');

-- نوع الخدمة
CREATE TYPE service_type AS ENUM (
  'booth',          -- تصميم وتنفيذ أجنحة المعارض
  'gifts',          -- هدايا ترويجية
  'event',          -- تنظيم معارض وحفلات
  'printing'        -- مطبوعات
  -- قادمة: 'media', 'outdoor', 'catering'
);

-- حالة المورد
CREATE TYPE supplier_status AS ENUM (
  'pending_review', -- بعد التسجيل، قبل موافقة Admin
  'approved',       -- معتمد ويستقبل RFQs
  'inactive',       -- المورد أوقف نشاطه طوعاً (يحجب RFQs الجديدة)
  'suspended',      -- موقف مؤقت من Admin (لمخالفة)
  'rejected'        -- مرفوض نهائياً
  -- Phase 2: 'expired_documents' لتتبع انتهاء السجل التجاري
);

-- حالة الـ RFQ
CREATE TYPE rfq_status AS ENUM (
  'draft',          -- العميل لسه ما أرسله
  'open',           -- مفتوح، الموردون يقدمون عروض
  'negotiating',    -- العميل يفاوض موردين محددين
  'awarded',        -- اختار مورداً، الاتفاق قيد التوثيق
  'in_escrow',      -- المبلغ محجوز، المورد بدأ
  'in_progress',    -- التنفيذ جارٍ
  'delivered',      -- المورد طلب تأكيد التسليم
  'completed',      -- العميل وافق + تم الدفع
  'disputed',       -- نزاع مفتوح
  'cancelled'       -- ملغى
);

-- حالة العرض
CREATE TYPE proposal_status AS ENUM (
  'submitted',      -- مقدم
  'under_review',   -- العميل يراجع
  'shortlisted',    -- العميل أضافه للمفاوضة
  'accepted',       -- العميل اختاره
  'rejected',       -- العميل رفضه
  'withdrawn'       -- المورد سحبه
);

-- حالة المعاملة المالية
CREATE TYPE escrow_status AS ENUM (
  'awaiting_deposit',   -- ننتظر تحويل العميل
  'deposit_received',   -- 50% وصل، Admin أكد
  'work_in_progress',   -- المورد يعمل
  'delivered',          -- التسليم تم
  'final_payment',      -- ننتظر 50% الباقية
  'released',           -- المنصة فرّجت للمورد
  'refunded',           -- النزاع لصالح العميل
  'partial_refund'      -- جزئي حسب قرار Admin
);

-- نوع الإشعار
CREATE TYPE notification_type AS ENUM (
  'rfq_new', 'rfq_match', 'proposal_received', 'proposal_shortlisted',
  'proposal_accepted', 'proposal_rejected', 'agreement_pending',
  'escrow_deposit_required', 'escrow_received', 'work_started',
  'delivery_pending', 'delivery_approved', 'panic_button',
  'message', 'system'
);

-- نوع حدث Escrow (للسجل الأبدي escrow_events)
CREATE TYPE escrow_event_type AS ENUM (
  'deposit_initiated',          -- العميل استلم تعليمات التحويل
  'deposit_receipt_uploaded',   -- العميل رفع الإيصال
  'deposit_confirmed',          -- Admin أكد استلام 50%
  'work_started',               -- إشعار للمورد بالبدء
  'delivery_submitted',         -- المورد طلب تأكيد التسليم
  'delivery_approved',          -- العميل وافق
  'final_payment_initiated',    -- العميل استلم تعليمات 50% الباقية
  'final_payment_confirmed',    -- Admin أكد الـ 50% الباقية
  'released_to_supplier',       -- المنصة حولت للمورد
  'invoice_issued',             -- تم إصدار الفاتورة
  'dispute_opened',
  'partial_refund_issued',
  'full_refund_issued'
);
```

---

## 2. الجداول الـ 14 الأساسية

### 2.1 `profiles` — ملف المستخدم الأساسي
```sql
-- ربط 1:1 مع auth.users
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
```

### 2.2 `companies` — الشركات (للعملاء)
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  legal_name TEXT,                          -- الاسم في السجل التجاري
  cr_number TEXT UNIQUE,                    -- رقم السجل التجاري
  vat_number TEXT,                          -- الرقم الضريبي
  size TEXT,                                -- 'enterprise', 'mid', 'startup'
  industry TEXT,
  city TEXT,                                -- 'Riyadh', 'Jeddah', 'Dammam'
  address TEXT,
  logo_url TEXT,
  ceo_email TEXT,                           -- لميزة "عين الـ CEO" (opt-in)
  ceo_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_cr ON companies(cr_number);
```

### 2.3 `suppliers` — الموردون (مميز عن companies)
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  cr_number TEXT UNIQUE NOT NULL,
  vat_number TEXT,
  status supplier_status NOT NULL DEFAULT 'pending_review',

  -- التخصصات (multiselect)
  specializations service_type[] NOT NULL DEFAULT '{}',

  -- التغطية الجغرافية
  cities TEXT[] NOT NULL DEFAULT '{}',     -- ['Riyadh', 'Jeddah']

  -- معلومات إضافية
  bio TEXT,
  website TEXT,
  team_size INT,
  years_of_experience INT,
  min_order_value NUMERIC(12,2),            -- لتصفية الطلبات الصغيرة

  -- مستندات (URLs لـ Supabase Storage)
  cr_document_url TEXT,
  vat_document_url TEXT,
  portfolio_pdf_url TEXT,

  -- إحصائيات (تُحدث بـ trigger)
  total_completed_orders INT DEFAULT 0,
  average_rating NUMERIC(3,2),
  on_time_delivery_rate NUMERIC(5,2),

  -- بيانات بنكية للتحويل
  bank_name TEXT,
  iban TEXT,
  account_holder_name TEXT,

  -- المراجعة
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
```

### 2.4 `supplier_portfolio` — أعمال سابقة للمورد
```sql
CREATE TABLE supplier_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_type service_type,
  client_name TEXT,                         -- اختياري
  exhibition_name TEXT,                     -- اختياري
  year INT,
  cover_image_url TEXT,
  images TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_supplier ON supplier_portfolio(supplier_id);
```

### 2.5 `rfqs` — طلبات عروض الأسعار
```sql
CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL,          -- مثل: RFQ-2026-0001
  client_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  service_type service_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- المدخلات الديناميكية حسب نوع الخدمة (JSONB)
  -- ⚠️ Validation الحقيقي يتم بـ Zod schemas في server/actions/rfq.ts قبل الـ INSERT
  -- للـ MVP CHECK بسيط فقط: ليس null وعنصر object
  details JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT details_is_object CHECK (jsonb_typeof(details) = 'object'),
  -- مثال للأجنحة: {"area": "6x6", "exhibition_name": "LEAP", "date": "2026-03-15", "floors": 1, ...}
  -- مثال للهدايا: {"recipient_type": "VIP", "quantity": 500, "category": "tech", ...}
  -- Phase 2: per-service-type validation tables (rfq_booth_details, rfq_gifts_details, ...)

  -- ملفات مرفقة عامة للطلب
  attachments TEXT[] DEFAULT '{}',          -- URLs لـ Supabase Storage
  logo_url TEXT,                            -- شعار الشركة المرفوع

  -- المعرض المرتبط (إن وجد)
  exhibition_name TEXT,
  exhibition_city TEXT,
  exhibition_date DATE,
  delivery_location TEXT,

  -- الميزانية (اختياري)
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),

  -- الموعد النهائي للعروض
  proposals_deadline TIMESTAMPTZ,           -- افتراضياً: created_at + 24h

  status rfq_status NOT NULL DEFAULT 'draft',

  -- الفائز (soft reference بدون FK لتجنب الـ circular dependency مع proposals)
  -- المصدر الموثوق لحالة "fائز" = proposals.status = 'accepted'
  winning_proposal_id UUID,                 -- يُسجّل بعد الاختيار، لا FK constraint
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
```

### 2.6 `proposals` — عروض الأسعار من الموردين
```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- بنود العرض
  total_price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  delivery_days INT NOT NULL,
  delivery_date DATE,                       -- محسوب من delivery_days

  -- وصف العرض
  description TEXT,
  scope_of_work TEXT,
  excluded_items TEXT,
  payment_terms TEXT,
  validity_days INT DEFAULT 14,

  -- ملفات
  proposal_pdf_url TEXT,                    -- العرض الرسمي
  attachments TEXT[] DEFAULT '{}',          -- صور، تصاميم، عينات

  -- AI Analysis (يُحسب عند تقديم العرض)
  ai_score NUMERIC(5,2),                    -- 0-100
  ai_summary TEXT,
  ai_strengths TEXT[],
  ai_concerns TEXT[],

  status proposal_status NOT NULL DEFAULT 'submitted',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(rfq_id, supplier_id)               -- عرض واحد لكل مورد لكل RFQ
);

CREATE INDEX idx_proposals_rfq ON proposals(rfq_id);
CREATE INDEX idx_proposals_supplier ON proposals(supplier_id);
CREATE INDEX idx_proposals_status ON proposals(status);
```

### 2.7 `chats` — غرف الشات
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- آخر رسالة (للقائمة)
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_sender_id UUID,

  -- counters
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
```

### 2.8 `messages` — رسائل الشات (لا حذف!)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_role user_role NOT NULL,           -- لمعرفة هل هو admin/client/supplier

  content TEXT,
  attachment_url TEXT,
  attachment_type TEXT,                     -- 'image', 'pdf', 'doc'
  attachment_name TEXT,
  attachment_size_bytes BIGINT,

  -- خاص بـ admin (طرف صامت)
  is_admin_intervention BOOLEAN DEFAULT FALSE,

  -- زر الفزعة (event خاص)
  is_panic_alert BOOLEAN DEFAULT FALSE,
  panic_reason TEXT,

  -- مقروء؟
  read_by_client_at TIMESTAMPTZ,
  read_by_supplier_at TIMESTAMPTZ,
  read_by_admin_at TIMESTAMPTZ,

  -- ⚠️ لا deleted_at — لا حذف نهائياً (audit trail قانوني)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_chat ON messages(chat_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_panic ON messages(chat_id) WHERE is_panic_alert = TRUE;
```

### 2.9 `agreements` — الاتفاقيات الموثقة بـ AI
```sql
CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  proposal_id UUID NOT NULL REFERENCES proposals(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- فهم كل طرف للاتفاق
  client_understanding TEXT NOT NULL,
  supplier_understanding TEXT NOT NULL,
  client_submitted_at TIMESTAMPTZ,
  supplier_submitted_at TIMESTAMPTZ,

  -- AI Analysis
  ai_agreed_points JSONB,                   -- نقاط متفق عليها
  ai_disputed_points JSONB,                 -- نقاط متناقضة
  ai_missing_points JSONB,                  -- نقاط مفقودة جوهرية
  ai_recommendation TEXT,

  -- الإصدار النهائي (الذي يعتمده Admin)
  final_text TEXT,
  final_terms JSONB,                        -- {amount, deadline, deliverables, ...}

  -- الموافقات
  client_approved_at TIMESTAMPTZ,
  supplier_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMPTZ,

  -- توقيع رقمي (hash)
  client_signature_hash TEXT,
  supplier_signature_hash TEXT,

  status TEXT NOT NULL DEFAULT 'pending',   -- pending/active/cancelled
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreements_rfq ON agreements(rfq_id);
CREATE INDEX idx_agreements_status ON agreements(status);
```

### 2.9b `agreement_revisions` — تاريخ تعديلات الاتفاقية (حماية قانونية)
```sql
-- كل تعديل أو إعادة كتابة لنص الاتفاقية يُسجّل هنا.
-- يحمي من النزاعات: "ما الذي وافق عليه كل طرف ومتى؟"
-- جدول صغير، أثر كبير.
CREATE TABLE agreement_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,             -- 1, 2, 3, ...

  source TEXT NOT NULL,
  -- 'client_understanding' | 'supplier_understanding'
  -- | 'ai_recommendation' | 'admin_edit' | 'final_approved'

  content TEXT NOT NULL,                    -- snapshot من النص في هذه اللحظة
  metadata JSONB DEFAULT '{}',              -- مثلاً تفاصيل تحليل الـ AI

  authored_by UUID REFERENCES profiles(id),
  authored_role user_role,

  created_at TIMESTAMPTZ DEFAULT NOW(),     -- ⚠️ لا updated_at — immutable

  UNIQUE(agreement_id, revision_number)
);

CREATE INDEX idx_agreement_revisions_agreement ON agreement_revisions(agreement_id, revision_number);

-- منع التعديل
CREATE OR REPLACE FUNCTION prevent_revision_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agreement_revisions is immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_agreement_revisions
  BEFORE UPDATE OR DELETE ON agreement_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_revision_mutation();
```

### 2.10 `escrow_transactions` — المعاملات المالية
```sql
CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) UNIQUE,
  rfq_id UUID NOT NULL REFERENCES rfqs(id),

  -- المبالغ الأساسية
  total_amount NUMERIC(12,2) NOT NULL,      -- إجمالي العقد (قبل VAT على العمولة)
  initial_deposit NUMERIC(12,2) NOT NULL,   -- 50% الأولى
  final_payment NUMERIC(12,2) NOT NULL,     -- 50% المتبقية
  client_fee NUMERIC(12,2) NOT NULL,        -- 2% من العميل (قبل VAT)
  supplier_fee NUMERIC(12,2) NOT NULL,      -- 3% من المورد (قبل VAT)
  platform_revenue NUMERIC(12,2) NOT NULL,  -- 5% الإجمالي (قبل VAT)
  supplier_net NUMERIC(12,2) NOT NULL,      -- ما يصل للمورد فعلياً

  -- VAT (ZATCA — العمولة فقط خاضعة لـ 15%)
  vat_rate_applied NUMERIC(5,4) NOT NULL DEFAULT 0.15,  -- 15% افتراضياً
  client_fee_vat NUMERIC(12,2) NOT NULL,    -- 15% × client_fee
  supplier_fee_vat NUMERIC(12,2) NOT NULL,  -- 15% × supplier_fee
  total_vat NUMERIC(12,2) NOT NULL,         -- مجموع الـ VAT المحصّل
  -- ملاحظة: المبلغ الأصلي بين العميل والمورد لا VAT منه عبر المنصة
  --        (الـ supplier يصدر فاتورته بنفسه إذا كان VAT-registered)

  -- الحالة
  status escrow_status NOT NULL DEFAULT 'awaiting_deposit',

  -- إيصالات التحويل (في MVP: تحويل بنكي يدوي)
  initial_deposit_receipt_url TEXT,
  initial_deposit_received_at TIMESTAMPTZ,
  initial_deposit_confirmed_by UUID REFERENCES profiles(id),

  final_payment_receipt_url TEXT,
  final_payment_received_at TIMESTAMPTZ,
  final_payment_confirmed_by UUID REFERENCES profiles(id),

  -- الإفراج للمورد
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES profiles(id),
  release_transaction_ref TEXT,             -- مرجع التحويل البنكي

  -- استرداد (إذا حدث نزاع)
  refund_amount NUMERIC(12,2),
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_rfq ON escrow_transactions(rfq_id);
```

### 2.10b `escrow_events` — سجل أحداث مالية append-only (تنظيمي)
```sql
-- ⚠️ Append-only ledger. لا UPDATE ولا DELETE نهائياً.
-- كل تغيير حالة على escrow_transactions يكتب row هنا.
-- Source of truth للـ audit المالي وتطبيق ساما المستقبلي.
CREATE TABLE escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),

  event_type escrow_event_type NOT NULL,    -- ENUM (راجع القسم 1)

  amount NUMERIC(12,2),                     -- المبلغ المتعلق بالحدث (إن وُجد)
  balance_after NUMERIC(12,2),              -- رصيد المنصة من هذا العقد بعد الحدث

  -- المرجع البنكي (للتحويلات)
  bank_reference TEXT,
  receipt_url TEXT,

  -- من قام بالحدث
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,

  -- تفاصيل إضافية
  metadata JSONB DEFAULT '{}',
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()      -- ⚠️ لا updated_at — append only
);

CREATE INDEX idx_escrow_events_escrow ON escrow_events(escrow_id, created_at);
CREATE INDEX idx_escrow_events_type ON escrow_events(event_type);

-- منع التعديل والحذف على مستوى DB
CREATE OR REPLACE FUNCTION prevent_escrow_event_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'escrow_events is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_escrow_events
  BEFORE UPDATE OR DELETE ON escrow_events
  FOR EACH ROW EXECUTE FUNCTION prevent_escrow_event_mutation();
```

### 2.10c `invoices` — الفواتير (ZATCA-friendly، مبسط للـ MVP)
```sql
-- فاتورة المنصة للعميل (تشمل المبلغ + 2% عمولة + VAT 15% على العمولة).
-- في MVP: PDF منسّق فقط. Phase 2: e-invoice XML + ZATCA Phase-2 integration.
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,      -- مثال: INV-2026-00001
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- بنود الفاتورة
  service_amount NUMERIC(12,2) NOT NULL,    -- ما يدفعه العميل للمنصة (= total_amount)
  platform_commission NUMERIC(12,2) NOT NULL,  -- 2%
  vat_amount NUMERIC(12,2) NOT NULL,        -- 15% على العمولة
  total_invoiced NUMERIC(12,2) NOT NULL,    -- service_amount + commission + vat

  -- بيانات العميل وقت الإصدار (snapshot — لا تتغير لو الشركة عدلت بياناتها لاحقاً)
  buyer_name TEXT NOT NULL,
  buyer_vat_number TEXT,
  buyer_cr_number TEXT,
  buyer_address TEXT,

  -- ZATCA (Phase 2)
  zatca_uuid TEXT,                          -- يُملأ في Phase 2
  zatca_invoice_hash TEXT,                  -- يُملأ في Phase 2
  zatca_qr_code TEXT,                       -- Base64 — Phase 2

  -- الملف الصادر (PDF في MVP)
  pdf_url TEXT,

  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE invoice_number_seq START 1;

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_rfq ON invoices(rfq_id);
```

### 2.11 `deliveries` — التسليم
```sql
CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  agreement_id UUID NOT NULL REFERENCES agreements(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- إثبات التسليم من المورد
  delivery_notes TEXT,
  delivery_photos TEXT[] DEFAULT '{}',
  delivery_video_url TEXT,
  delivered_at TIMESTAMPTZ,

  -- موافقة العميل
  client_approved BOOLEAN,
  client_approved_at TIMESTAMPTZ,
  client_approval_notes TEXT,

  -- إذا لم يوافق
  client_rejected_at TIMESTAMPTZ,
  client_rejection_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_rfq ON deliveries(rfq_id);
```

### 2.12 `disputes` — النزاعات (زر الفزعة)
```sql
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  raised_by UUID NOT NULL REFERENCES profiles(id),
  raised_by_role user_role NOT NULL,        -- client أو supplier

  category TEXT NOT NULL,                   -- 'quality', 'delay', 'payment', 'communication', 'other'
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',

  -- المعالجة
  assigned_admin_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'open',      -- open/investigating/resolved/escalated
  resolution TEXT,
  resolution_in_favor_of TEXT,              -- 'client' أو 'supplier' أو 'both'
  refund_decision NUMERIC(12,2),

  -- الزيارة الميدانية (إن لزم)
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
```

### 2.13 `reviews` — التقييمات
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) UNIQUE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),

  -- 6 معايير من Journey Map
  rating_overall INT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality INT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_timeliness INT CHECK (rating_timeliness BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_flexibility INT CHECK (rating_flexibility BETWEEN 1 AND 5),
  rating_price_value INT CHECK (rating_price_value BETWEEN 1 AND 5),

  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,

  -- رد المورد (اختياري)
  supplier_response TEXT,
  supplier_response_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_supplier ON reviews(supplier_id) WHERE is_public = TRUE;
```

### 2.14 `notifications` — الإشعارات
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,

  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                                -- المسار داخل التطبيق

  -- ربط بالموارد ذات الصلة
  rfq_id UUID REFERENCES rfqs(id),
  proposal_id UUID REFERENCES proposals(id),
  chat_id UUID REFERENCES chats(id),

  -- قنوات الإرسال
  sent_email BOOLEAN DEFAULT FALSE,
  sent_push BOOLEAN DEFAULT FALSE,

  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

---

## 3. جداول مساعدة

### 3.1 `audit_logs` — سجل تدقيقي شامل
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,
  action TEXT NOT NULL,                     -- 'rfq.created', 'escrow.released', etc.
  resource_type TEXT NOT NULL,              -- 'rfq', 'proposal', etc.
  resource_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
```

### 3.2 `ceo_access` — وصول CEO القراءة-فقط (ميزة "عين الـ CEO")
```sql
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

-- ملاحظة: CEO يدخل بـ magic link بدون حساب كامل، يرى فقط dashboard للقراءة
```

---

## 4. Row-Level Security (RLS) — الجوهري

### 4.1 المبدأ
- كل جدول له RLS مفعّل
- `auth.uid()` تحدد المستخدم
- دالة helper `is_admin()`، `is_supplier()`، `owns_rfq()` ...

```sql
-- Helper functions
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL STABLE;
```

### 4.2 RLS أمثلة

#### `rfqs`
```sql
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

-- العميل يرى RFQs الخاصة به
CREATE POLICY "client_view_own_rfqs" ON rfqs FOR SELECT
  USING (client_id = auth.uid() OR auth.is_admin());

-- المورد يرى RFQs المفتوحة في تخصصه فقط
CREATE POLICY "supplier_view_open_matching_rfqs" ON rfqs FOR SELECT
  USING (
    status = 'open'
    AND service_type = ANY(
      SELECT unnest(specializations) FROM suppliers WHERE owner_id = auth.uid()
    )
  );

-- المورد المختار للمفاوضة يرى الـ RFQ
CREATE POLICY "selected_supplier_view_rfq" ON rfqs FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM proposals
      WHERE proposals.rfq_id = rfqs.id
        AND proposals.supplier_id IN (SELECT id FROM suppliers WHERE owner_id = auth.uid())
        AND proposals.status IN ('shortlisted', 'accepted')
    )
  );

-- العميل ينشئ
CREATE POLICY "client_create_rfq" ON rfqs FOR INSERT
  WITH CHECK (client_id = auth.uid() AND auth.user_role() = 'client');

-- العميل أو Admin يحدّث
CREATE POLICY "client_update_own_rfq" ON rfqs FOR UPDATE
  USING (client_id = auth.uid() OR auth.is_admin());
```

#### `messages`
```sql
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- جميع الأطراف الثلاثة (client + supplier + admin) يقرؤون
CREATE POLICY "chat_participants_read" ON messages FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.client_id = auth.uid()
          OR c.supplier_id IN (SELECT id FROM suppliers WHERE owner_id = auth.uid())
        )
    )
  );

-- إرسال فقط لـ client/supplier المرتبطين
CREATE POLICY "chat_participants_send" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      auth.is_admin()
      OR EXISTS(
        SELECT 1 FROM chats c
        WHERE c.id = messages.chat_id
          AND (
            c.client_id = auth.uid()
            OR c.supplier_id IN (SELECT id FROM suppliers WHERE owner_id = auth.uid())
          )
      )
    )
  );

-- ❌ لا UPDATE (لا تعديل بعد الإرسال)
-- ❌ لا DELETE
```

#### `escrow_transactions`
```sql
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

-- أطراف الصفقة + Admin
CREATE POLICY "escrow_parties_read" ON escrow_transactions FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM rfqs r
      WHERE r.id = escrow_transactions.rfq_id
        AND r.client_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM agreements a
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE a.id = escrow_transactions.agreement_id
        AND s.owner_id = auth.uid()
    )
  );

-- ❌ INSERT / UPDATE / DELETE — Admin فقط (عبر service role)
```

---

## 5. Triggers و Functions الجوهرية

### 5.1 توليد رقم RFQ
```sql
CREATE SEQUENCE rfq_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_rfq_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.rfq_number := 'RFQ-' || EXTRACT(YEAR FROM NOW()) || '-' ||
                    LPAD(nextval('rfq_number_seq')::text, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rfq_number BEFORE INSERT ON rfqs
  FOR EACH ROW WHEN (NEW.rfq_number IS NULL)
  EXECUTE FUNCTION generate_rfq_number();
```

### 5.2 تحديث `updated_at` تلقائياً
```sql
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- يُطبق على كل الجداول التي لها updated_at
```

### 5.3 تحديث إحصائيات المورد بعد كل تقييم
```sql
CREATE OR REPLACE FUNCTION update_supplier_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers
  SET
    average_rating = (
      SELECT AVG(rating_overall) FROM reviews WHERE supplier_id = NEW.supplier_id
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
```

### 5.4 إشعار عند RFQ جديد للموردين المؤهلين
```sql
CREATE OR REPLACE FUNCTION notify_matching_suppliers() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status != 'open') THEN
    INSERT INTO notifications (user_id, type, title, body, rfq_id)
    SELECT
      s.owner_id,
      'rfq_match',
      'طلب عرض جديد يطابق تخصصك',
      NEW.title,
      NEW.id
    FROM suppliers s
    WHERE NEW.service_type = ANY(s.specializations)
      AND s.status = 'approved'
      AND (NEW.exhibition_city IS NULL OR NEW.exhibition_city = ANY(s.cities));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Storage Buckets

| Bucket | Public | المحتوى | RLS |
|--------|--------|---------|-----|
| `avatars` | ✅ | صور البروفايل | كل user يكتب على ملفه فقط |
| `company-logos` | ✅ | شعارات الشركات | صاحب الشركة فقط |
| `rfq-attachments` | ❌ | مرفقات الطلبات | client + suppliers shortlisted + admin |
| `proposals` | ❌ | ملفات العروض | client للـ RFQ + supplier المالك + admin |
| `chat-attachments` | ❌ | ملفات الشات | أطراف الشات + admin |
| `delivery-proofs` | ❌ | صور التسليم | client + supplier + admin |
| `supplier-docs` | ❌ | السجل التجاري + ZATCA | المورد المالك + admin فقط |
| `portfolios` | ✅ | معرض الأعمال | المورد يكتب — الجميع يقرأ |
| `escrow-receipts` | ❌ | إيصالات التحويل البنكي | admin فقط (sensitive) |

---

## 7. Indexes الرئيسية للأداء

```sql
-- البحث في الطلبات المفتوحة
CREATE INDEX idx_rfqs_open_search ON rfqs(service_type, status, created_at DESC)
  WHERE status = 'open';

-- آخر شات للمستخدم
CREATE INDEX idx_chats_user_latest ON chats(client_id, last_message_at DESC NULLS LAST);

-- إشعارات غير مقروءة
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC)
  WHERE read_at IS NULL;

-- بحث الموردين بالـ GIN
CREATE INDEX idx_suppliers_search ON suppliers USING GIN(specializations, cities)
  WHERE status = 'approved';
```

---

## 8. Soft Delete Pattern

الجداول التي تستخدم soft delete: `profiles`, `companies`, `suppliers`, `rfqs`.
الجداول التي **لا** تستخدم soft delete (أبداً): `messages`, `audit_logs`, `escrow_transactions`, `agreements`.

```sql
-- View نظيف افتراضياً
CREATE VIEW active_rfqs AS
  SELECT * FROM rfqs WHERE deleted_at IS NULL;
```

---

## 9. ملاحظات نهائية

- **Migrations**: استخدام Supabase migrations (`supabase/migrations/`)
- **Seeds**: ملف `supabase/seed.sql` للبيانات التجريبية (admin user + sample suppliers)
- **Backups**: Supabase يأخذ backups يومية (الخطة Pro+)
- **Connection pooling**: Supabase Pooler عبر port 6543 للـ serverless functions
- **Real-time channels**: شغّل Replication فقط على `messages`, `notifications`, `proposals`, `rfqs`

```sql
-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE proposals;
ALTER PUBLICATION supabase_realtime ADD TABLE rfqs;
```

---

## 10. ERD مبسط (محدّث v1.1)

```
auth.users (Supabase)
    └── profiles (1:1)
            ├── companies (1:N)  ← clients (Phase 2: organizations مع type[])
            │     └── rfqs (1:N)
            │           ├── proposals (1:N) ← suppliers
            │           ├── chats (1:N)
            │           │     └── messages (1:N)
            │           ├── agreements (1:1)
            │           │     ├── agreement_revisions (1:N)  ⭐ جديد
            │           │     └── escrow_transactions (1:1)
            │           │           ├── escrow_events (1:N)  ⭐ جديد
            │           │           └── invoices (1:N)        ⭐ جديد
            │           ├── deliveries (1:1)
            │           ├── reviews (1:1)
            │           └── disputes (1:N)
            │
            └── suppliers (1:1)  ← suppliers
                  ├── supplier_portfolio (1:N)
                  └── proposals (1:N)
```

⭐ = أُضيفت في v1.1 من المراجعة النقدية.

---

## 11. ما تم تأجيله صراحةً لـ Phase 2

كل قرار هنا تم اتخاذه عمداً للحفاظ على بساطة الـ MVP. كل واحد منها له trigger واضح يستدعي إعادة تقييمه.

| الإصلاح المؤجل | المبرر الحالي | متى يُعاد التقييم |
|----------------|---------------|---------------------|
| **`organizations` بديلاً عن `companies` + `suppliers`** | لا dual-role في MVP. التطبيق على مستوى `auth.users` يكفي | عند طلب 3 عملاء بأن يكونوا موردين أيضاً |
| **`company_members` (multi-user)** | ICP 2 (سارة) solo. ICP 1 يستخدم نفس الحساب لكل الفريق | أول عميل يطلب فريق + ICP 1 يصبح أكثر من 30% من العملاء |
| **`rfq_invitations` (تتبع supplier visibility)** | analytics nice-to-have. RLS الحالي يكفي للوصول | عند الحاجة لتقارير "كم مورد رأى الـ RFQ ولم يقدم؟" |
| **Per-service-type detail tables** (`rfq_booth_details` ...) | Zod في server validation كافٍ. JSONB CHECK يحمي من null | عند ظهور حاجة لتقارير معقدة على حقول محددة |
| **`chat_read_cursors` table** | لا lock contention عند < 100 user متزامن | عند ظهور slow queries على `chats` UPDATE |
| **`expired_documents` supplier status + auto-detection** | الموردون قلة في MVP، Admin يراجع يدوياً | عند تجاوز 50 مورد معتمد |
| **PSP integration (HyperPay/Tap/Moyasar)** | ساما compliance + manual transfer + admin confirm كافي | بعد إثبات النموذج + الحصول على رخصة |
| **ZATCA Phase-2 e-invoicing (XML + QR + ZATCA UUID)** | حقول الـ DB موجودة في `invoices`، PDF كافٍ في MVP | عند تجاوز عتبة ZATCA الإلزامية أو طلب الشركات الكبرى |
| **`wallet_transactions` للـ Corporate Wallet** | Corporate Wallet نفسها Phase 2 | متى أُطلقت ميزة المحفظة المؤسسية |
| **`supplier_documents` (separated)** | MVP: URLs مدمجة في `suppliers`. لا تتبع تاريخ الانتهاء | عند الموافقة على أول CR منتهي |

### Migration path للـ Phase 2 (للمرجعية فقط — لا تنفذها الآن)

```
-- مرحلة 2 ستحتاج:
-- 1. إنشاء organizations جديد + نقل الـ owner_id
-- 2. تحويل companies → organizations حيث type='client'
-- 3. تحويل suppliers → organizations حيث type='supplier' (مع الحقول الإضافية)
-- 4. إنشاء organization_memberships (ربط profile بـ organization مع role داخلي)
-- 5. تحديث FKs في rfqs, proposals, etc.
```

> **القاعدة**: لا تكتب أي migration script لـ Phase 2 الآن. اكتبه عند الحاجة الفعلية. تخيل سيناريوهات الترقية = هدر وقت.

---

## 12. القرارات التي **رفضنا** تطبيقها (مع التبرير)

ليست كل ملاحظة من المراجعة تستحق التطبيق. هذه نقاط رفضناها عمداً:

### رفض 1: تقسيم unread counters لجدول منفصل
**السبب**: Lock contention على `chats` غير مشكلة عند < 100 user متزامن. الإصلاح يضيف JOIN لكل query للقائمة.
**Trigger للإعادة**: `pg_stat_statements` يُظهر slow queries على UPDATE chats.

### رفض 2: إضافة CR expiry detection auto
**السبب**: cron + state machine + إشعارات = 3 أنظمة جديدة. للـ MVP، Admin يراجع عند الـ Approval فقط.
**Trigger للإعادة**: أول حادثة مورد بسجل تجاري منتهٍ يُسبب نزاع.

### رفض 3: per-service-type details tables
**السبب**: 4 جداول إضافية + 4 RLS policies + 4 migrations لكل service جديد. Zod في server-side يُمسك كل invalid data قبل INSERT.
**Trigger للإعادة**: حاجة استعلامات تجميعية على حقل محدد (مثل: متوسط مساحة البوث في الرياض).

---

## 13. معايير المراجعة الذاتية للـ Schema

قبل أي migration جديد، اسأل:
- [ ] هل هذا التغيير **يخدم MVP** أم يخدم سيناريو متخيل؟
- [ ] هل هناك **مخاطرة قانونية/تنظيمية** بدون هذا التغيير؟
- [ ] هل يمكن حله بـ **validation في server** بدلاً من DB؟
- [ ] هل **عدد الـ users < 100** يجعل هذا غير ضروري؟

إذا 3 من 4 أجوبة "لا" → التغيير over-engineering. سجّله في القسم 11 وامضِ.
