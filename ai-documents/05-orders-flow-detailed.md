# Orders Flow — تفاصيل دورة الطلب الكاملة

> **هذا المستند المرجع المعتمد لمنطق الـ orders.** كل تطبيق لـ business logic يجب أن يطابق هذا التدفق.

---

## نظرة شاملة — الـ 7 خطوات الجوهرية

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  1. RFQ      │→│ 2. Proposals │→│ 3. Compare   │→│ 4. Negotiate │
│  Creation    │ │  Reception   │ │  (AI)        │ │  & Award     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
                                                          ↓
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 7. Review &  │←│ 6. Delivery  │←│ 5. Execution │←│   Agreement  │
│  Settlement  │ │  & Approve   │ │  & Tracking  │ │   & Escrow   │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## الخطوة 1️⃣: إنشاء الـ RFQ (Request for Quotation)

### من الذي يبدأ؟
**العميل** (Client) من خلال 4 خطوات في wizard.

### الإجراءات التقنية بالترتيب

#### 1.1 العميل يختار نوع الخدمة
- **UI**: 4 cards على `/dashboard/rfq/new/service`
- **State**: محلي في الـ form (Zustand)
- **Validation**: Zod schema:
```ts
const stepOneSchema = z.object({
  serviceType: z.enum(['booth', 'gifts', 'event', 'printing'])
});
```

#### 1.2 العميل يملأ التفاصيل (Form ديناميكي)
- **UI**: نموذج مختلف حسب الـ `serviceType`
- **Validation**: مجموعة Zod schemas (واحد لكل نوع)
```ts
// schemas/rfq/booth.ts
export const boothSchema = z.object({
  area: z.string(),
  exhibitionName: z.string(),
  exhibitionDate: z.coerce.date(),
  floors: z.enum(['1', '2']),
  // ...
});
```

#### 1.3 رفع الملفات
- **Bucket**: `rfq-attachments`
- **مسار**: `{userId}/{rfqId}/{filename}`
- **حد الحجم**: 50MB لكل ملف
- **الأنواع المسموحة**: PDF, JPG, PNG, AI (Adobe Illustrator), 3DM, OBJ

#### 1.4 المراجعة والإرسال
- **Server Action**: `createRFQ(formData)`
- **DB Operations**:
  ```sql
  INSERT INTO rfqs (
    client_id, company_id, service_type, title, details,
    attachments, exhibition_name, exhibition_city, exhibition_date,
    delivery_location, budget_min, budget_max,
    proposals_deadline, status
  ) VALUES (..., 'open');

  -- الـ trigger يولد rfq_number تلقائياً
  -- الـ trigger يرسل إشعارات للموردين المؤهلين
  ```
- **Side effects**:
  - إشعار in-app + email لكل supplier متطابق
  - Audit log
  - تأكيد للعميل + redirect لصفحة الـ RFQ

### القواعد الجوهرية
- ✅ كل RFQ له `proposals_deadline` (افتراضي: created_at + 24h)
- ✅ العميل يمكنه تعديل الـ RFQ **قبل** أول عرض فقط
- ✅ بعد أول عرض، أي تعديل يحتاج إلغاء + إنشاء جديد
- ❌ لا يمكن إرسال RFQ بدون title وservice_type وعلى الأقل حقل واحد في details

---

## الخطوة 2️⃣: استقبال العروض (Proposals Reception)

### من الذي يبدأ؟
**الموردون المؤهلون** الذين تخصصاتهم تطابق نوع الخدمة + مدنهم تطابق مدينة المعرض.

### الإجراءات التقنية

#### 2.1 الإشعار للموردين
- **Trigger** (DB): عند `rfq.status = 'open'` → INSERT في `notifications`
- **Channels**:
  - In-app (Realtime via Supabase channel)
  - Email عبر Resend (template: `rfq-match.tsx`)
- **Filter**:
  ```sql
  SELECT s.* FROM suppliers s
  WHERE s.status = 'approved'
    AND rfq.service_type = ANY(s.specializations)
    AND (rfq.exhibition_city IS NULL OR rfq.exhibition_city = ANY(s.cities))
    AND (rfq.budget_min IS NULL OR s.min_order_value <= rfq.budget_min);
  ```

#### 2.2 المورد يفتح RFQ
- **Route**: `/dashboard/supplier/rfq/[id]`
- **RLS**: المورد يرى فقط RFQs تطابق تخصصه
- **Component**: زر "تقدم بعرض" أو "غير مهتم"

#### 2.3 المورد يقدم عرضه (3 خطوات)
- **Wizard**: Pricing → Scope → Files
- **Validation**:
```ts
const proposalSchema = z.object({
  totalPrice: z.number().positive(),
  deliveryDays: z.number().int().positive(),
  description: z.string().min(50),
  scopeOfWork: z.string().min(100),
  excludedItems: z.string().optional(),
  paymentTerms: z.string(),
  validityDays: z.number().int().min(7).max(30).default(14),
});
```

#### 2.4 AI Scoring تلقائي عند الإرسال
- **Background Job** (via Server Action + waitUntil):
  - يستدعي Vercel AI Gateway
  - Claude Sonnet يحلل العرض في سياق الـ RFQ
  - يولد `ai_score` من 0 إلى 100، `ai_summary`، `ai_strengths[]`، `ai_concerns[]`
  - يحفظها في `proposals` row

```ts
// app/api/_internal/score-proposal.ts (server-only)
// AI SDK v6: استخدم generateText + Output.object({ schema })
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { experimental_output } = await generateText({
  model: 'anthropic/claude-sonnet-4.6',
  output: Output.object({
    schema: z.object({
      score: z.number().min(0).max(100),
      summary: z.string(),
      strengths: z.array(z.string()),
      concerns: z.array(z.string())
    })
  }),
  prompt: `
    حلّل العرض التالي في سياق الـ RFQ.
    RFQ: ${JSON.stringify(rfq)}
    Proposal: ${JSON.stringify(proposal)}
    Supplier history: ${supplierStats}
  `
});

const { score, summary, strengths, concerns } = experimental_output;
```

### القواعد الجوهرية
- ✅ مورد واحد = عرض واحد لكل RFQ (UNIQUE constraint)
- ✅ بعد `proposals_deadline` لا يمكن تقديم عرض جديد
- ✅ المورد يمكنه سحب عرضه (`status = 'withdrawn'`) قبل اختياره
- ❌ المورد لا يرى عروض الموردين الآخرين
- ❌ المورد لا يرى تقييم AI لعرضه (يخدم العميل فقط)

---

## الخطوة 3️⃣: المقارنة (AI Compare)

### من الذي يبدأ؟
**العميل** بعد استلام 3+ عروض (أو انتهاء المهلة).

### الإجراءات التقنية

#### 3.1 العميل يفتح صفحة المقارنة
- **Route**: `/dashboard/rfq/[id]/compare`
- **Server Component** (للأمان):
  ```ts
  const proposals = await db
    .from('proposals')
    .select('*, supplier:suppliers(*, portfolio:supplier_portfolio(*))')
    .eq('rfq_id', rfqId)
    .in('status', ['submitted', 'under_review']);
  ```

#### 3.2 جدول مقارنة موحد
| المعيار | العرض A | العرض B | العرض C |
|--------|---------|---------|---------|
| السعر | 95K | 105K | 88K |
| المدة | 21 يوم | 18 يوم | 28 يوم |
| تقييم المورد | 4.7 ⭐ | 4.5 ⭐ | 4.2 ⭐ |
| AI Score | 87/100 | 92/100 | 78/100 |
| الأعمال السابقة | 12 | 8 | 5 |
| التزام التسليم | 95% | 92% | 88% |

#### 3.3 AI Recommendation Card
- **يُحسب server-side** عبر AI Gateway:
```ts
const recommendation = await generateText({
  model: 'anthropic/claude-sonnet-4.6',
  prompt: `قارن هذه العروض الـ ${count} وأوصِ بالأفضل مع التبرير...`
});
```

### القواعد الجوهرية
- ✅ الـ AI Recommendation **اقتراحية فقط** — العميل هو من يقرر
- ✅ يعرض السعر الأرخص والأغلى مع outliers detection
- ❌ AI لا يكشف هوية المورد بطريقة تحيز ("شركة شهيرة" مرفوض)

---

## الخطوة 4️⃣: التفاوض والاختيار (Negotiation & Award)

### من الذي يبدأ؟
**العميل** يضيف موردين للقائمة المختصرة (max 4) → يفاوضهم → يختار 1.

### الإجراءات التقنية

#### 4.1 Shortlist
- **Action**: `shortlistProposal(proposalId)`
- **DB**:
  ```sql
  UPDATE proposals SET status = 'shortlisted' WHERE id = ?;
  -- إنشاء chat
  INSERT INTO chats (rfq_id, client_id, supplier_id) VALUES (...);
  ```
- **القيد**: max 4 active shortlists لكل RFQ
- **Notification للمورد**: "تم اختيارك للمفاوضة!"

#### 4.2 الشات (Real-time)
- **Architecture**:
  - Supabase Realtime channels per chat: `chat:{chatId}`
  - INSERT في `messages` → trigger broadcasts
  - 3 أطراف يستقبلون: client, supplier, admin
- **Client side**:
```tsx
'use client';
import { createClient } from '@/lib/supabase/client';

useEffect(() => {
  const channel = supabase
    .channel(`chat:${chatId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `chat_id=eq.${chatId}`
    }, (payload) => {
      // append message to UI
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [chatId]);
```

#### 4.3 زر الفزعة
- **Action**: `triggerPanic(chatId, reason)`
- **DB**:
  ```sql
  INSERT INTO messages (chat_id, sender_id, sender_role, content, is_panic_alert, panic_reason)
  VALUES (?, ?, ?, '🚨 طلب تدخل Admin', TRUE, ?);

  INSERT INTO notifications (user_id, type, title, ...)
  SELECT id, 'panic_button', 'زر فزعة جديد!', ...
  FROM profiles WHERE role = 'admin';
  ```

#### 4.4 اختيار الفائز (Award)
- **Action**: `awardProposal(rfqId, proposalId)`
- **Confirmation modal**: "هل أنت متأكد؟ هذا القرار نهائي"
- **DB Transaction**:
  ```sql
  BEGIN;

  UPDATE proposals SET status = 'accepted' WHERE id = ?;
  UPDATE proposals SET status = 'rejected'
    WHERE rfq_id = ? AND id != ? AND status IN ('submitted', 'shortlisted');

  UPDATE rfqs
    SET status = 'awarded',
        winning_proposal_id = ?,
        awarded_at = NOW()
    WHERE id = ?;

  -- إنشاء agreement record (initial)
  INSERT INTO agreements (rfq_id, proposal_id, client_id, supplier_id, status)
  VALUES (..., 'pending');

  -- إغلاق الشاتات الأخرى
  UPDATE chats SET is_archived = TRUE
    WHERE rfq_id = ? AND supplier_id != (SELECT supplier_id FROM proposals WHERE id = ?);

  COMMIT;
  ```

### القواعد الجوهرية
- ✅ حد أقصى 4 shortlists نشطة في نفس الوقت
- ✅ بعد Award، الشاتات الأخرى تُؤرشف (لا تُحذف)
- ✅ الموردون الآخرون يصلهم إشعار "شكراً، اختار العميل عرضاً آخر"
- ❌ لا rollback بعد Award — لو فُسخ، يصير dispute

---

## الخطوة 5️⃣: الاتفاقية + Escrow

### من الذي يبدأ؟
الطرفان يكتبان فهم الاتفاق + AI يحلل + Admin يعتمد + العميل يحول.

### الإجراءات التقنية

#### 5.1 كل طرف يكتب فهمه
- **Client**: `/dashboard/rfq/[id]/agreement/draft`
- **Supplier**: `/dashboard/supplier/rfq/[id]/agreement`
- **Validation**: نص حر، حد أدنى 100 حرف
- **DB**:
  ```sql
  UPDATE agreements
  SET client_understanding = ?,
      client_submitted_at = NOW()
  WHERE rfq_id = ?;
  ```

#### 5.2 AI Analysis
- **Trigger**: عندما `client_submitted_at IS NOT NULL AND supplier_submitted_at IS NOT NULL`
- **AI Call**:
```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';

const { experimental_output: analysis } = await generateText({
  model: 'anthropic/claude-sonnet-4.6',
  output: Output.object({
    schema: z.object({
      agreedPoints: z.array(z.string()),
      disputedPoints: z.array(z.object({
        topic: z.string(),
        clientSays: z.string(),
        supplierSays: z.string(),
        severity: z.enum(['low', 'medium', 'high'])
      })),
      missingPoints: z.array(z.string()),
      recommendation: z.string(),
      finalDraft: z.string()
    })
  }),
  prompt: `قارن فهم العميل وفهم المورد...`
});
```

#### 5.3 Admin يراجع
- **Route**: `/admin/agreements/[id]`
- **Actions**:
  - "اعتماد كما هو" → يحفظ `final_text`
  - "تعديل" → Admin يكتب نسخته → يحفظها

#### 5.4 الموافقة الثنائية
- **Client approve**: `/dashboard/rfq/[id]/agreement/final` → button
- **Supplier approve**: similar
- **DB**:
  ```sql
  UPDATE agreements
  SET client_approved_at = NOW(),
      client_signature_hash = ?
  WHERE id = ?;

  -- بعد توقيع كلا الطرفين
  UPDATE agreements SET status = 'active' WHERE
    client_approved_at IS NOT NULL AND
    supplier_approved_at IS NOT NULL;

  UPDATE rfqs SET status = 'in_escrow' WHERE id = ?;

  -- إنشاء escrow record
  INSERT INTO escrow_transactions (
    agreement_id, rfq_id,
    total_amount, initial_deposit, final_payment,
    client_fee, supplier_fee, platform_revenue, supplier_net,
    status
  ) VALUES (..., 'awaiting_deposit');
  ```

### حساب المبالغ
```ts
function calculateEscrow(totalPrice: number) {
  const clientFee = totalPrice * 0.02;       // 2%
  const supplierFee = totalPrice * 0.03;     // 3%
  const platformRevenue = clientFee + supplierFee; // 5%
  const supplierNet = totalPrice - supplierFee;
  const initialDeposit = totalPrice * 0.5;
  const finalPayment = totalPrice * 0.5;

  return {
    totalAmount: totalPrice + clientFee,     // العميل يدفع: السعر + 2%
    initialDeposit: initialDeposit + clientFee, // يدفعها الآن
    finalPayment,
    clientFee,
    supplierFee,
    platformRevenue,
    supplierNet
  };
}
```

#### 5.5 العميل يحول 50% (في MVP: تحويل بنكي يدوي)
- **Route**: `/dashboard/rfq/[id]/escrow/deposit`
- **يعرض**:
  - بيانات حساب المنصة (IBAN)
  - المبلغ المطلوب
  - مرجع التحويل (RFQ Number)
- **بعد التحويل**: العميل يرفع إيصال على `/escrow/upload-receipt`
- **DB**:
  ```sql
  UPDATE escrow_transactions
  SET initial_deposit_receipt_url = ?
  WHERE id = ?;
  ```

#### 5.6 Admin يؤكد الاستلام
- **Route**: `/admin/escrow/pending-deposits`
- **Action**: "Confirm Deposit"
- **DB**:
  ```sql
  UPDATE escrow_transactions
  SET status = 'deposit_received',
      initial_deposit_received_at = NOW(),
      initial_deposit_confirmed_by = auth.uid()
  WHERE id = ?;

  UPDATE rfqs SET status = 'in_progress' WHERE id = ?;
  ```
- **Notifications**: للمورد "ابدأ العمل!" + للعميل "تم تأكيد التحويل"

### القواعد الجوهرية
- ✅ المورد لا يبدأ العمل إلا بعد `deposit_received`
- ✅ كل حركة مالية تُسجل في `audit_logs`
- ❌ لا تحويل مباشر بين العميل والمورد — كل شيء عبر حساب المنصة
- ⚠️ في MVP: تحويل بنكي يدوي + Admin يؤكد. في Phase 2: PSP integration (HyperPay/Tap)

---

## الخطوة 6️⃣: التنفيذ والتسليم

### الإجراءات التقنية

#### 6.1 المورد يعمل ويحدّث
- **Project Workspace**: `/dashboard/supplier/project/[id]`
- **Activities**:
  - رفع تصاميم → موافقة العميل
  - شات للأسئلة
  - رفع صور التقدم
  - تحديث Timeline (مرحلة 2)

#### 6.2 المورد يطلب تأكيد التسليم
- **Route**: `/dashboard/supplier/project/[id]/delivery`
- **Form**: Notes + Upload photos + Optional video
- **Action**:
  ```sql
  INSERT INTO deliveries (rfq_id, agreement_id, supplier_id, delivery_notes, delivery_photos, delivered_at)
  VALUES (..., NOW());

  UPDATE escrow_transactions SET status = 'delivered' WHERE rfq_id = ?;
  UPDATE rfqs SET status = 'delivered' WHERE id = ?;
  ```
- **Notification للعميل**: "المورد أعلن التسليم — راجع الصور"

#### 6.3 العميل يراجع ويوافق
- **Route**: `/dashboard/rfq/[id]/approve`
- **3 خيارات**:
  1. **Approve** ✅ → يدخل في final payment
  2. **Reject** ❌ → يصير dispute
  3. **Panic** 🚨 → يستدعي Admin
- **عند Approve**:
  ```sql
  UPDATE deliveries
  SET client_approved = TRUE,
      client_approved_at = NOW(),
      client_approval_notes = ?
  WHERE id = ?;

  UPDATE escrow_transactions SET status = 'final_payment' WHERE rfq_id = ?;
  ```

#### 6.4 العميل يدفع الـ 50% المتبقية
- مثل خطوة 5.5 + 5.6
- بعد تأكيد Admin:
  ```sql
  UPDATE escrow_transactions
  SET status = 'released',
      final_payment_received_at = NOW(),
      released_at = NOW(),
      released_by = auth.uid()
  WHERE id = ?;

  UPDATE rfqs SET status = 'completed' WHERE id = ?;
  ```

### القواعد الجوهرية
- ✅ Admin يقوم بالـ release **يدوياً** بعد التأكد من حسابه البنكي
- ✅ التحويل للمورد يستخدم `bank_name + iban + account_holder_name` من supplier
- ✅ يتم توليد فاتورة ZATCA في نفس اللحظة (PDF)

---

## الخطوة 7️⃣: التقييم والتسوية

### الإجراءات التقنية

#### 7.1 العميل يقيّم
- **Route**: `/dashboard/rfq/[id]/review`
- **Fields**: 6 ratings + comment
- **DB**:
  ```sql
  INSERT INTO reviews (rfq_id, client_id, supplier_id, rating_overall, rating_quality, ...);

  -- Trigger يحدث supplier stats
  ```

#### 7.2 المورد يستلم الأموال
- **Route**: `/dashboard/supplier/earnings`
- **يعرض**:
  - الرصيد المتاح للسحب (`supplier_net` لكل completed)
  - الرصيد المعلق (للـ in_progress)
  - History
- **Action**: "Withdraw" → يولد طلب سحب → Admin يحوّل

#### 7.3 توليد تقرير ROI (مرحلة 2)
- **Cron**: 48 ساعة بعد completed
- **AI**:
```ts
const roiReport = await generateText({
  model: 'anthropic/claude-sonnet-4.6',
  prompt: `ولّد تقرير ROI من البيانات: التكلفة، الـ leads، التحويل...`
});
```

---

## مصفوفة الحالات الكاملة (RFQ State × Roles)

| الحالة | الـ Client يرى | الـ Supplier يرى | الـ Admin يرى |
|--------|----------------|------------------|----------------|
| draft | ✅ تعديل/حذف | ❌ | ✅ readonly |
| open | ✅ ينتظر العروض | ✅ يقدم عرض (إذا match) | ✅ |
| negotiating | ✅ يفاوض ≤4 | ✅ shortlisted فقط | ✅ يستمع |
| awarded | ✅ يكتب فهمه | ✅ يكتب فهمه | ✅ يراجع AI |
| in_escrow | ✅ يحول 50% | ✅ ينتظر تأكيد | ✅ يؤكد |
| in_progress | ✅ يتابع | ✅ يعمل ويحدث | ✅ يراقب |
| delivered | ✅ يراجع | ✅ ينتظر approve | ✅ |
| completed | ✅ يقيّم | ✅ يستلم أموال | ✅ يفرج |
| disputed | ✅ النزاع | ✅ النزاع | ✅ يحل |
| cancelled | ✅ | ✅ | ✅ |

---

## مخطط الإشعارات حسب التدفق

```
RFQ created (open)
    ↓ Notify all matching suppliers (1.1)
        ↓ Email + In-app + Push

Proposal received
    ↓ Notify client (2.1)
        ↓ In-app

Shortlisted
    ↓ Notify supplier (4.1)
        ↓ Email + In-app + Push

Awarded
    ↓ Notify supplier ✅
    ↓ Notify other suppliers ❌
        ↓ Email + In-app

Both submit understanding
    ↓ Notify admin
        ↓ In-app

Admin approves
    ↓ Notify both
        ↓ Email + In-app

Client uploads receipt
    ↓ Notify admin
        ↓ In-app + SMS (high priority)

Admin confirms deposit
    ↓ Notify supplier (start work!)
    ↓ Notify client (deposit received)
        ↓ Email + In-app

Supplier requests delivery confirm
    ↓ Notify client
        ↓ Email + In-app + Push

Client approves
    ↓ Notify supplier (final payment incoming)
    ↓ Notify admin (process release)
        ↓ Email + In-app

Admin releases
    ↓ Notify supplier (paid!)
        ↓ Email + In-app + SMS

Review submitted
    ↓ Notify supplier
        ↓ In-app
```

---

## Edge Cases و Error Handling

### حالة 1: لم يصل أي عرض خلال 24 ساعة
- **Detection**: cron يوميّ يبحث عن `rfqs WHERE status='open' AND proposals_deadline < NOW() AND no proposals`
- **Action**:
  - إشعار للعميل: "للأسف لم يصل أي عرض. هل تريد تمديد المدة 48 ساعة أو تعديل المتطلبات؟"
  - حالة جديدة: `extended` أو `cancelled`

### حالة 2: المورد المفائز انسحب قبل الاتفاق
- **Action**:
  - إعادة الـ RFQ لحالة `negotiating`
  - تحرير الموردين الآخرين shortlisted
  - أو السماح للعميل باختيار المرشح الثاني

### حالة 3: العميل لم يحول الـ 50% خلال 7 أيام
- **Action**:
  - تذكير يومي
  - بعد 7 أيام: تنبيه Admin
  - يمكن إلغاء الـ RFQ + تحرير المورد

### حالة 4: زر الفزعة في منتصف التنفيذ
- **State**: `disputed`
- **Workflow**:
  1. Admin يفتح ticket dispute
  2. يقرأ الشات الكامل
  3. يقرر: زيارة ميدانية؟ نقاش رقمي فقط؟
  4. حلول ممكنة:
     - استكمال + إعادة بعض المال للعميل (`partial_refund`)
     - إلغاء + استرداد كامل (`refunded`)
     - استكمال + ملاحظة على المورد (`released` مع تقييم سلبي)

### حالة 5: المورد لم يسلم في الموعد
- **Auto-detect**: cron يفحص `agreements WHERE delivery_deadline < NOW() AND status='active'`
- **Actions**:
  - إشعار العميل
  - إشعار Admin
  - العميل يقرر: تمديد؟ إلغاء؟ panic?

### حالة 6: العميل لم يوافق على التسليم خلال 14 يوم
- **Auto-approve**: بعد 14 يوم بدون رد، النظام يفترض الموافقة (مع تنبيه)
- **هذا حماية للمورد من العميل غير المتجاوب**

---

## القواعد الذهبية للـ Orders

1. **لا تواصل خارج المنصة**: WhatsApp/Phone خارج الشات = خرق للعقد
2. **كل ملف للأبد**: لا حذف من Storage، Soft-delete فقط على metadata
3. **Admin طرف ثالث صامت دائماً**: يقرأ ويتدخل بعلامة "⚠️ Admin"
4. **Approve داخل المنصة فقط**: لا DocuSign، لا توقيع خارجي
5. **الفلوس تمر بحساب المنصة**: لا تحويل مباشر تحت أي ظرف
6. **Audit Log لكل state transition**: من → إلى → بواسطة → متى
7. **Idempotency للـ webhook handlers**: تكرار الـ webhook لا يكرر الإفراج

---

## ✅ الخلاصة

كل order يمر بـ **22 step technical** على الأقل (من RFQ Submit إلى Final Review):
- 3 أطراف (Client, Supplier, Admin)
- 4-7 شاشات لكل طرف
- ~12 إشعار
- 3 AI calls (proposal scoring, agreement analysis, ROI report)
- 2 تحويل مالي (50% + 50%)
- 1 إفراج للمورد

> **هذا التدفق هو العمود الفقري للمنتج. كل شاشة، كل API، كل rule يجب أن يخدم هذا التدفق.**
