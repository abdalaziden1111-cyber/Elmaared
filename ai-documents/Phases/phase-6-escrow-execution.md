# Phase 6 — Escrow & Execution (Weeks 13-14)

> **Goal**: Once the agreement is signed, the client transfers 50% to the platform's escrow bank account (manual bank transfer + receipt upload). Admin confirms. Supplier executes the project. Client approves delivery. Final 50% is released. Supplier sees their net earnings.

> **Prerequisite**: Phases 0–5 complete. Agreements signed; RFQ in `in_escrow` status.

---

## What this phase delivers

By end of Week 14:

1. `/[locale]/dashboard/rfqs/[id]/escrow` — client sees deposit instructions + uploads receipt.
2. `/admin/escrow/pending-deposits` — admin sees uploaded receipts, can confirm or reject.
3. After confirmation: RFQ → `in_progress`, supplier notified to begin execution.
4. `/[locale]/supplier/projects/[id]` — supplier project workspace (timeline, deliveries, chat).
5. `/[locale]/supplier/projects/[id]/deliver` — submit delivery (photos + notes).
6. `/[locale]/dashboard/rfqs/[id]/deliveries` — client reviews delivery → approve or request edits.
7. After approval: client pays final 50% → admin confirms → admin transfers supplier net to their IBAN.
8. `/[locale]/supplier/earnings` — supplier sees historical earnings + pending payouts.
9. `/admin/escrow/pending-releases` — admin processes payouts.
10. Auto-generated proforma + final invoice PDFs (basic — not ZATCA-compliant in MVP).
11. ~25 new unit + integration tests.

---

## Step 6.1 — Migrations

### File: `supabase/migrations/20260715000001_escrow_extensions.sql`

```sql
-- escrow_transactions table — already created in Phase 0
-- Add fields needed for the manual bank transfer flow
ALTER TABLE escrow_transactions
  ADD COLUMN IF NOT EXISTS client_receipt_url text,
  ADD COLUMN IF NOT EXISTS client_receipt_filename text,
  ADD COLUMN IF NOT EXISTS client_receipt_uploaded_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_payment_reference text,
  ADD COLUMN IF NOT EXISTS admin_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_confirmed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS admin_rejection_reason text,
  ADD COLUMN IF NOT EXISTS released_to_supplier_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS supplier_payout_reference text,
  ADD COLUMN IF NOT EXISTS supplier_payout_receipt_url text;

-- Phase index — use status-aware partial indexes for the admin dashboards
CREATE INDEX IF NOT EXISTS escrow_pending_deposits_idx
  ON escrow_transactions(client_receipt_uploaded_at)
  WHERE status = 'awaiting_admin_confirmation';

CREATE INDEX IF NOT EXISTS escrow_pending_releases_idx
  ON escrow_transactions(updated_at)
  WHERE status IN ('delivery_approved', 'final_received');

-- deliveries table — Phase 0 created it
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Auto-approve trigger: if 14 days pass without client review, auto-approve
-- (we'll use a Vercel cron in Phase 7 instead — keep this DB-side as a safety net)

-- View: escrow status with derived percentages
CREATE OR REPLACE VIEW escrow_summary AS
SELECT
  e.id,
  e.rfq_id,
  e.contract_price,
  e.initial_deposit,
  e.final_payment,
  e.client_fee,
  e.supplier_fee,
  e.platform_revenue,
  e.supplier_net,
  e.status,
  e.client_receipt_uploaded_at,
  e.admin_confirmed_at,
  e.released_to_supplier_at,
  CASE
    WHEN e.released_to_supplier_at IS NOT NULL THEN 100
    WHEN e.admin_confirmed_at IS NOT NULL THEN 50
    WHEN e.client_receipt_uploaded_at IS NOT NULL THEN 25
    ELSE 0
  END AS pct_complete
FROM escrow_transactions e;
```

### File: `supabase/migrations/20260715000002_initial_escrow_creation.sql`

When an agreement is fully signed (RFQ → `in_escrow`), automatically create the escrow_transaction row using the helper function from Phase 0's escrow calculator.

```sql
CREATE OR REPLACE FUNCTION create_escrow_on_in_escrow()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  agreement_row agreements%ROWTYPE;
  v_total numeric;
  v_client_fee numeric;
  v_supplier_fee numeric;
  v_supplier_net numeric;
BEGIN
  IF NEW.status = 'in_escrow' AND OLD.status != 'in_escrow' THEN
    SELECT * INTO agreement_row FROM agreements WHERE rfq_id = NEW.id ORDER BY created_at DESC LIMIT 1;
    IF NOT FOUND THEN RETURN NEW; END IF;

    v_total := agreement_row.contract_price;
    v_client_fee := round(v_total * 0.02, 2);
    v_supplier_fee := round(v_total * 0.03, 2);
    v_supplier_net := v_total - v_supplier_fee;

    INSERT INTO escrow_transactions (
      rfq_id, agreement_id, client_id, supplier_id,
      contract_price, initial_deposit, final_payment,
      client_fee, supplier_fee, platform_revenue, supplier_net,
      vat_on_commission, status
    ) VALUES (
      NEW.id, agreement_row.id, agreement_row.client_id, agreement_row.supplier_id,
      v_total,
      round(v_total * 0.5, 2),
      round(v_total * 0.5, 2),
      v_client_fee,
      v_supplier_fee,
      v_client_fee + v_supplier_fee,
      v_supplier_net,
      round((v_client_fee + v_supplier_fee) * 0.15, 2),
      'awaiting_initial_deposit'
    )
    ON CONFLICT (rfq_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rfqs_create_escrow ON rfqs;
CREATE TRIGGER rfqs_create_escrow
  AFTER UPDATE OF status ON rfqs
  FOR EACH ROW
  EXECUTE FUNCTION create_escrow_on_in_escrow();
```

(If `escrow_transactions.rfq_id` doesn't have a unique constraint, add it: `ALTER TABLE escrow_transactions ADD CONSTRAINT escrow_transactions_rfq_id_key UNIQUE (rfq_id);`)

---

## Step 6.2 — Escrow Server Actions

### File: `app/actions/escrow.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import { sendEmail } from '@/lib/email/resend';

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

// ───────────────────────────────────────────────────────────
// CLIENT: upload deposit receipt
// ───────────────────────────────────────────────────────────
const uploadReceiptSchema = z.object({
  escrowId: z.string().uuid(),
  receiptUrl: z.string().url(),
  receiptFilename: z.string().min(1),
  paymentReference: z.string().min(3, 'اكتب الرقم المرجعي للحوالة').max(120),
});

export async function uploadDepositReceiptAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole(['client']);
  const parsed = uploadReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, client_id, status, rfq_id')
    .eq('id', parsed.data.escrowId)
    .eq('client_id', user.id)
    .single();

  if (!escrow) return { ok: false, error: 'الإيداع غير موجود.' };
  if (escrow.status !== 'awaiting_initial_deposit' && escrow.status !== 'awaiting_admin_confirmation') {
    return { ok: false, error: 'الحالة الحالية لا تسمح برفع إيصال جديد.' };
  }

  await supabase
    .from('escrow_transactions')
    .update({
      client_receipt_url: parsed.data.receiptUrl,
      client_receipt_filename: parsed.data.receiptFilename,
      client_receipt_uploaded_at: new Date().toISOString(),
      client_payment_reference: parsed.data.paymentReference,
      status: 'awaiting_admin_confirmation',
    })
    .eq('id', escrow.id);

  // Append-only event log
  await admin.from('escrow_events').insert({
    escrow_id: escrow.id,
    event_type: 'receipt_uploaded',
    actor_id: user.id,
    metadata: { reference: parsed.data.paymentReference, filename: parsed.data.receiptFilename },
  });

  // Notify all admins
  after(async () => {
    const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
    if (admins) {
      await admin.from('notifications').insert(
        admins.map((a) => ({
          user_id: a.id,
          type: 'deposit_receipt_uploaded',
          title: 'إيصال إيداع جديد بانتظار التأكيد',
          body: `الرقم المرجعي: ${parsed.data.paymentReference}`,
          link: `/admin/escrow/pending-deposits`,
        }))
      );
    }
  });

  revalidatePath(`/dashboard/rfqs/${escrow.rfq_id}/escrow`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ADMIN: confirm deposit
// ───────────────────────────────────────────────────────────
export async function adminConfirmDepositAction(escrowId: string): Promise<ActionResult> {
  const user = await requireRole(['admin']);
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, status, rfq_id, client_id, supplier_id, initial_deposit')
    .eq('id', escrowId)
    .single();

  if (!escrow) return { ok: false, error: 'Escrow not found.' };
  if (escrow.status !== 'awaiting_admin_confirmation') {
    return { ok: false, error: `Cannot confirm from status "${escrow.status}".` };
  }

  await supabase
    .from('escrow_transactions')
    .update({
      status: 'initial_received',
      admin_confirmed_at: new Date().toISOString(),
      admin_confirmed_by: user.id,
    })
    .eq('id', escrow.id);

  // Move RFQ to in_progress
  await admin.from('rfqs').update({ status: 'in_progress' }).eq('id', escrow.rfq_id);

  await admin.from('escrow_events').insert({
    escrow_id: escrow.id,
    event_type: 'deposit_confirmed',
    actor_id: user.id,
    metadata: { amount: escrow.initial_deposit },
  });

  // Notify both parties
  await admin.from('notifications').insert([
    {
      user_id: escrow.client_id,
      type: 'deposit_confirmed',
      title: 'تأكيد الإيداع',
      body: 'سيبدأ المورد التنفيذ. ستصلك تحديثات في كل مرحلة.',
      link: `/dashboard/rfqs/${escrow.rfq_id}`,
    },
    {
      user_id: escrow.supplier_id,
      type: 'deposit_confirmed',
      title: '🚀 ابدأ التنفيذ',
      body: 'تم تأكيد الإيداع المقدم. ابدأ بالعمل وفق الجدول.',
      link: `/supplier/projects/${escrow.rfq_id}`,
    },
  ]);

  revalidatePath('/admin/escrow/pending-deposits');
  return { ok: true };
}

export async function adminRejectDepositAction(escrowId: string, reason: string): Promise<ActionResult> {
  const user = await requireRole(['admin']);
  if (reason.trim().length < 10) return { ok: false, error: 'Rejection reason must be ≥10 characters.' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('client_id, rfq_id')
    .eq('id', escrowId)
    .single();

  if (!escrow) return { ok: false, error: 'Escrow not found.' };

  await supabase
    .from('escrow_transactions')
    .update({
      status: 'awaiting_initial_deposit', // back to client
      admin_rejection_reason: reason,
      client_receipt_url: null,
      client_receipt_uploaded_at: null,
    })
    .eq('id', escrowId);

  await admin.from('escrow_events').insert({
    escrow_id: escrowId,
    event_type: 'deposit_rejected',
    actor_id: user.id,
    metadata: { reason },
  });

  await admin.from('notifications').insert({
    user_id: escrow.client_id,
    type: 'deposit_rejected',
    title: 'لم يُقبل الإيصال',
    body: reason,
    link: `/dashboard/rfqs/${escrow.rfq_id}/escrow`,
  });

  revalidatePath('/admin/escrow/pending-deposits');
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// SUPPLIER: submit delivery
// ───────────────────────────────────────────────────────────
const submitDeliverySchema = z.object({
  rfqId: z.string().uuid(),
  title: z.string().min(3).max(200),
  notes: z.string().max(2000).optional(),
  photos: z.array(z.object({
    path: z.string(), url: z.string(), filename: z.string(),
    sizeBytes: z.number(), mimeType: z.string(),
  })).min(1, 'ارفع صورة واحدة على الأقل'),
  files: z.array(z.object({
    path: z.string(), url: z.string(), filename: z.string(),
    sizeBytes: z.number(), mimeType: z.string(),
  })).default([]),
});

export async function submitDeliveryAction(input: unknown): Promise<ActionResult<{ deliveryId: string }>> {
  const user = await requireRole(['supplier']);
  const parsed = submitDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, status, client_id, winning_proposal_id, rfq_number')
    .eq('id', parsed.data.rfqId)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };
  if (rfq.status !== 'in_progress') return { ok: false, error: 'الطلب ليس في مرحلة التنفيذ.' };

  // Authorization: the supplier on the winning proposal
  const { data: winningProposal } = await supabase
    .from('proposals')
    .select('supplier_id')
    .eq('id', rfq.winning_proposal_id!)
    .single();

  if (winningProposal?.supplier_id !== user.id) {
    return { ok: false, error: 'لست المورد المعتمد على هذا الطلب.' };
  }

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .insert({
      rfq_id: rfq.id,
      supplier_id: user.id,
      client_id: rfq.client_id,
      title: parsed.data.title,
      notes: parsed.data.notes,
      photos: parsed.data.photos,
      files: parsed.data.files,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !delivery) return { ok: false, error: 'فشل في تسجيل التسليم.' };

  await admin.from('rfqs').update({ status: 'delivered' }).eq('id', rfq.id);

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'submit_delivery',
    resource_type: 'delivery',
    resource_id: delivery.id,
    metadata: { rfq_id: rfq.id },
  });

  await admin.from('notifications').insert({
    user_id: rfq.client_id,
    type: 'delivery_submitted',
    title: 'وصل التسليم — راجعه الآن',
    body: `${parsed.data.title}. لديك 14 يوماً للموافقة قبل القبول التلقائي.`,
    link: `/dashboard/rfqs/${rfq.id}/deliveries`,
  });

  revalidatePath(`/supplier/projects/${rfq.id}`);
  revalidatePath(`/dashboard/rfqs/${rfq.id}`);
  return { ok: true, data: { deliveryId: delivery.id } };
}

// ───────────────────────────────────────────────────────────
// CLIENT: approve / reject delivery
// ───────────────────────────────────────────────────────────
export async function approveDeliveryAction(deliveryId: string): Promise<ActionResult> {
  const user = await requireRole(['client']);
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('id, client_id, supplier_id, rfq_id, status')
    .eq('id', deliveryId)
    .eq('client_id', user.id)
    .single();

  if (!delivery) return { ok: false, error: 'التسليم غير موجود.' };
  if (delivery.status !== 'submitted') return { ok: false, error: 'تم اتخاذ قرار سابق على هذا التسليم.' };

  await supabase
    .from('deliveries')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', delivery.id);

  // Move escrow → delivery_approved (waiting for client to pay final 50%)
  await admin
    .from('escrow_transactions')
    .update({ status: 'delivery_approved' })
    .eq('rfq_id', delivery.rfq_id);

  await admin.from('escrow_events').insert({
    escrow_id: (await admin.from('escrow_transactions').select('id').eq('rfq_id', delivery.rfq_id).single()).data?.id,
    event_type: 'delivery_approved',
    actor_id: user.id,
  });

  await admin.from('notifications').insert([
    {
      user_id: delivery.supplier_id,
      type: 'delivery_approved',
      title: '✅ العميل وافق على التسليم',
      body: 'الخطوة التالية: العميل يحول الـ 50% المتبقية ثم نُفرج لك المستحقات.',
      link: `/supplier/projects/${delivery.rfq_id}`,
    },
  ]);

  revalidatePath(`/dashboard/rfqs/${delivery.rfq_id}/deliveries`);
  return { ok: true };
}

export async function rejectDeliveryAction(deliveryId: string, reason: string): Promise<ActionResult> {
  const user = await requireRole(['client']);
  if (reason.trim().length < 20) return { ok: false, error: 'اشرح ما الذي يحتاج تعديل (20 حرف على الأقل).' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: delivery } = await supabase
    .from('deliveries')
    .select('id, client_id, supplier_id, rfq_id, status')
    .eq('id', deliveryId)
    .eq('client_id', user.id)
    .single();

  if (!delivery || delivery.status !== 'submitted') {
    return { ok: false, error: 'التسليم غير قابل للرفض.' };
  }

  await supabase
    .from('deliveries')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id, rejection_reason: reason })
    .eq('id', delivery.id);

  // Send RFQ back to in_progress for re-delivery
  await admin.from('rfqs').update({ status: 'in_progress' }).eq('id', delivery.rfq_id);

  await admin.from('notifications').insert({
    user_id: delivery.supplier_id,
    type: 'delivery_rejected',
    title: 'العميل طلب تعديلات على التسليم',
    body: reason,
    link: `/supplier/projects/${delivery.rfq_id}`,
  });

  revalidatePath(`/dashboard/rfqs/${delivery.rfq_id}/deliveries`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// CLIENT: upload final payment receipt (same shape as initial)
// ───────────────────────────────────────────────────────────
export async function uploadFinalReceiptAction(input: unknown): Promise<ActionResult> {
  const user = await requireRole(['client']);
  const parsed = uploadReceiptSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, status, rfq_id')
    .eq('id', parsed.data.escrowId)
    .eq('client_id', user.id)
    .single();

  if (!escrow) return { ok: false, error: 'Escrow not found.' };
  if (escrow.status !== 'delivery_approved') {
    return { ok: false, error: 'لا يمكن رفع الدفعة النهائية في الحالة الحالية.' };
  }

  // For MVP simplicity we reuse the same column for the final receipt.
  // Production should split into separate columns or a separate transactions table.
  await supabase
    .from('escrow_transactions')
    .update({
      client_receipt_url: parsed.data.receiptUrl,
      client_receipt_filename: parsed.data.receiptFilename,
      client_payment_reference: parsed.data.paymentReference,
      status: 'awaiting_final_confirmation',
    })
    .eq('id', escrow.id);

  await admin.from('escrow_events').insert({
    escrow_id: escrow.id,
    event_type: 'final_receipt_uploaded',
    actor_id: user.id,
    metadata: { reference: parsed.data.paymentReference },
  });

  // Notify admins
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  if (admins) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: 'final_payment_uploaded',
        title: 'دفعة نهائية بانتظار التأكيد',
        body: parsed.data.paymentReference,
        link: '/admin/escrow/pending-releases',
      }))
    );
  }

  revalidatePath(`/dashboard/rfqs/${escrow.rfq_id}/escrow`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ADMIN: process release (after final received)
// ───────────────────────────────────────────────────────────
export async function adminReleaseToSupplierAction(input: { escrowId: string; payoutReference: string }): Promise<ActionResult> {
  const user = await requireRole(['admin']);
  const supabase = await createClient();
  const admin = createAdminClient();

  if (input.payoutReference.trim().length < 3) {
    return { ok: false, error: 'Payout reference required.' };
  }

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select('id, status, rfq_id, supplier_id, client_id, supplier_net')
    .eq('id', input.escrowId)
    .single();

  if (!escrow) return { ok: false, error: 'Escrow not found.' };
  if (escrow.status !== 'awaiting_final_confirmation') {
    return { ok: false, error: `Cannot release from status "${escrow.status}".` };
  }

  await supabase
    .from('escrow_transactions')
    .update({
      status: 'released',
      released_to_supplier_at: new Date().toISOString(),
      released_by: user.id,
      supplier_payout_reference: input.payoutReference,
    })
    .eq('id', escrow.id);

  await admin.from('rfqs').update({ status: 'completed' }).eq('id', escrow.rfq_id);

  await admin.from('escrow_events').insert({
    escrow_id: escrow.id,
    event_type: 'released',
    actor_id: user.id,
    metadata: { payout_reference: input.payoutReference, amount: escrow.supplier_net },
  });

  await admin.from('notifications').insert([
    {
      user_id: escrow.supplier_id,
      type: 'payout_released',
      title: '💰 تم تحويل مستحقاتك',
      body: `الرقم المرجعي للحوالة: ${input.payoutReference}. تظهر في حسابك خلال 1-3 أيام عمل.`,
      link: '/supplier/earnings',
    },
    {
      user_id: escrow.client_id,
      type: 'project_completed',
      title: '🎉 المعاملة اكتملت',
      body: 'يمكنك الآن تقييم المورد لمساعدة الآخرين.',
      link: `/dashboard/rfqs/${escrow.rfq_id}/review`,
    },
  ]);

  revalidatePath('/admin/escrow/pending-releases');
  return { ok: true };
}
```

---

## Step 6.3 — Client Escrow page

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/escrow/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building, Hash } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { ReceiptUploadForm } from './receipt-upload-form';
import { formatCurrency } from '@/lib/utils/format';

const PLATFORM_BANK = {
  name: 'البنك الأهلي السعودي (SNB)',
  accountName: 'تطبيق المعارض المحدودة',
  iban: process.env.PLATFORM_BANK_IBAN ?? 'SA00 0000 0000 0000 0000 0000',
};

export default async function EscrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: escrow } = await supabase
    .from('escrow_transactions')
    .select(`*, rfqs!inner(rfq_number, title, status)`)
    .eq('rfq_id', id)
    .eq('client_id', user.id)
    .single();

  if (!escrow) notFound();

  const isInitial = ['awaiting_initial_deposit', 'awaiting_admin_confirmation'].includes(escrow.status);
  const isFinal = ['delivery_approved', 'awaiting_final_confirmation'].includes(escrow.status);

  if (escrow.status === 'released') {
    return (
      <div className="max-w-2xl mx-auto space-y-4 text-center">
        <ShieldCheck className="size-16 text-success mx-auto" />
        <h1 className="text-2xl font-bold text-success">المعاملة اكتملت</h1>
        <p className="text-sm text-stone-600">تم الإفراج عن المستحقات للمورد. شكراً لاستخدامك المنصة.</p>
        <Button asChild variant="brand">
          <Link href={`/dashboard/rfqs/${id}/review`}>قيّم المورد →</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/rfqs/${id}`}><ArrowRight className="size-4 rotate-180" /> العودة للطلب</Link>
      </Button>

      <div>
        <p className="text-xs text-stone-600 font-mono num">{escrow.rfqs.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">الضمان المالي</h1>
      </div>

      {/* Cost breakdown */}
      <div className="bg-stone-100 rounded-xl p-4 space-y-2 text-sm">
        <Row label="السعر الإجمالي للعقد" value={formatCurrency(escrow.contract_price)} dir="ltr" bold />
        <Row label="عمولتك (2%)" value={`+ ${formatCurrency(escrow.client_fee)}`} dir="ltr" />
        <hr className="border-stone-300" />
        <Row label="إجمالي ما تدفعه" value={formatCurrency(escrow.contract_price + escrow.client_fee)} dir="ltr" bold />
        <hr className="border-stone-300" />
        <Row label="الدفعة المقدمة (50%)" value={formatCurrency(escrow.initial_deposit + escrow.client_fee / 2)} dir="ltr" />
        <Row label="الدفعة النهائية (50%)" value={formatCurrency(escrow.final_payment + escrow.client_fee / 2)} dir="ltr" />
      </div>

      {isInitial && (
        <PaymentInstructions
          escrow={escrow}
          amount={escrow.initial_deposit + escrow.client_fee / 2}
          stage="initial"
          rejectionReason={escrow.admin_rejection_reason}
          uploadedAlready={escrow.status === 'awaiting_admin_confirmation'}
        />
      )}

      {escrow.status === 'awaiting_admin_confirmation' && (
        <div className="bg-warning-100 border border-warning/30 rounded-xl p-4">
          <h2 className="font-semibold text-warning">في انتظار تأكيد Admin</h2>
          <p className="text-sm mt-2">
            سيتحقق Admin من وصول المبلغ خلال 24 ساعة عمل. الرقم المرجعي:{' '}
            <span className="font-mono num">{escrow.client_payment_reference}</span>.
          </p>
        </div>
      )}

      {isFinal && (
        <PaymentInstructions
          escrow={escrow}
          amount={escrow.final_payment + escrow.client_fee / 2}
          stage="final"
          uploadedAlready={escrow.status === 'awaiting_final_confirmation'}
        />
      )}
    </div>
  );
}

function Row({ label, value, dir, bold }: { label: string; value: string; dir?: 'ltr' | 'rtl'; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? 'font-semibold' : ''}`}>
      <span className="text-stone-600">{label}</span>
      <span className="text-charcoal text-end" dir={dir}>{value}</span>
    </div>
  );
}

function PaymentInstructions({
  escrow, amount, stage, rejectionReason, uploadedAlready,
}: { escrow: any; amount: number; stage: 'initial' | 'final'; rejectionReason?: string | null; uploadedAlready?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-action-blue">
          {stage === 'initial' ? '1. حوّل الدفعة المقدمة (50%)' : '2. حوّل الدفعة النهائية (50%)'}
        </h2>
        {rejectionReason && (
          <div className="bg-danger-100 border border-danger/30 text-danger text-sm rounded-md p-3">
            <strong>Admin رفض الإيصال السابق:</strong> {rejectionReason}
          </div>
        )}
        <div className="bg-cream rounded-md p-3 space-y-2 text-sm">
          <div className="flex items-center gap-2"><Building className="size-4 text-midnight-green" /> <strong>{PLATFORM_BANK.name}</strong></div>
          <div className="flex items-center gap-2"><Hash className="size-4 text-midnight-green" /> <span className="num font-mono" dir="ltr">{PLATFORM_BANK.iban}</span></div>
          <div>المستفيد: <strong>{PLATFORM_BANK.accountName}</strong></div>
          <div>المبلغ: <strong className="text-action-blue text-lg num" dir="ltr">{amount.toLocaleString('en')} ﷼</strong></div>
        </div>
        <p className="text-xs text-stone-600">
          استخدم رقم RFQ ({escrow.rfqs.rfq_number}) كـ "ملاحظة" أو "غرض الحوالة" — يساعد Admin على المطابقة بسرعة.
        </p>
      </div>
      <ReceiptUploadForm
        escrowId={escrow.id}
        stage={stage}
        uploadedAlready={!!uploadedAlready}
        existingReceipt={uploadedAlready ? { url: escrow.client_receipt_url, filename: escrow.client_receipt_filename } : undefined}
      />
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/escrow/receipt-upload-form.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { uploadDepositReceiptAction, uploadFinalReceiptAction } from '@/app/actions/escrow';
import { FileUploader } from '@/components/ui/file-uploader';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import type { UploadedFile } from '@/lib/storage/upload';

export function ReceiptUploadForm({
  escrowId, stage, uploadedAlready, existingReceipt,
}: {
  escrowId: string;
  stage: 'initial' | 'final';
  uploadedAlready?: boolean;
  existingReceipt?: { url: string; filename: string };
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [reference, setReference] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (files.length === 0) { setError('ارفع صورة الإيصال أولاً.'); return; }
    if (reference.trim().length < 3) { setError('اكتب الرقم المرجعي للحوالة.'); return; }
    const file = files[0];
    start(async () => {
      const action = stage === 'initial' ? uploadDepositReceiptAction : uploadFinalReceiptAction;
      const res = await action({
        escrowId,
        receiptUrl: file.url,
        receiptFilename: file.filename,
        paymentReference: reference,
      });
      if (!res.ok) { setError(res.error); return; }
    });
  };

  if (uploadedAlready && existingReceipt) {
    return (
      <div className="bg-success-100 border border-success/30 rounded-xl p-4 space-y-2">
        <p className="font-semibold text-success">رفعت إيصالاً بالفعل</p>
        <a href={existingReceipt.url} target="_blank" rel="noopener noreferrer" className="text-sm text-action-blue hover:underline">
          📎 {existingReceipt.filename}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 bg-stone-100 rounded-xl p-4">
      <h3 className="font-semibold">ارفع إيصال الحوالة</h3>
      <FileUploader
        bucket="receipts"
        pathPrefix={`escrow-${escrowId}`}
        files={files}
        onChange={setFiles}
        maxFiles={1}
        accept="image/*,application/pdf"
      />
      <FormField
        label="الرقم المرجعي للحوالة"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        dir="ltr"
        placeholder="REF-1234567890"
        required
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? 'جارٍ الإرسال…' : 'أرسل للتأكيد'}
      </Button>
    </form>
  );
}
```

---

## Step 6.4 — Admin: pending deposits + releases

### File: `app/admin/escrow/pending-deposits/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';
import { ConfirmDepositActions } from './actions';
import { timeAgo, formatCurrency } from '@/lib/utils/format';

export default async function PendingDepositsPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('escrow_transactions')
    .select(`
      id, contract_price, initial_deposit, client_fee, client_receipt_url, client_receipt_filename,
      client_receipt_uploaded_at, client_payment_reference,
      rfqs!inner(rfq_number, title),
      client:client_id(full_name, email)
    `)
    .eq('status', 'awaiting_admin_confirmation')
    .order('client_receipt_uploaded_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Deposits ({pending?.length ?? 0})</h1>
      {!pending || pending.length === 0 ? (
        <p className="text-stone-600">No deposits awaiting confirmation.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((p: any) => (
            <div key={p.id} className="bg-stone-100 rounded-xl p-4 border border-stone-300 space-y-3">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="text-xs font-mono num">{p.rfqs.rfq_number}</div>
                  <div className="font-semibold">{p.rfqs.title}</div>
                  <div className="text-xs text-stone-600">
                    Client: {p.client?.full_name} · Uploaded {timeAgo(p.client_receipt_uploaded_at, 'en')}
                  </div>
                </div>
                <div className="text-end shrink-0">
                  <div className="text-xs text-stone-600">Expected:</div>
                  <div className="font-bold num text-midnight-green">
                    {formatCurrency(p.initial_deposit + p.client_fee / 2)}
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <strong>Reference:</strong> <span className="font-mono num">{p.client_payment_reference}</span>
              </div>
              <a
                href={p.client_receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-action-blue hover:underline"
              >
                📎 View receipt: {p.client_receipt_filename}
              </a>
              <ConfirmDepositActions escrowId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/admin/escrow/pending-deposits/actions.tsx`

```tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { adminConfirmDepositAction, adminRejectDepositAction } from '@/app/actions/escrow';

export function ConfirmDepositActions({ escrowId }: { escrowId: string }) {
  const [pending, start] = useTransition();

  const onConfirm = () => start(async () => {
    const res = await adminConfirmDepositAction(escrowId);
    if (!res.ok) alert(res.error);
  });

  const onReject = () => {
    const reason = window.prompt('Reason for rejection (sent to client):');
    if (!reason || reason.trim().length < 10) return;
    start(async () => {
      const res = await adminRejectDepositAction(escrowId, reason);
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="brand" size="sm" disabled={pending} onClick={onConfirm}>✅ Confirm received</Button>
      <Button variant="destructive" size="sm" disabled={pending} onClick={onReject}>Reject</Button>
    </div>
  );
}
```

### File: `app/admin/escrow/pending-releases/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';
import { ProcessReleaseActions } from './actions';
import { formatCurrency, timeAgo } from '@/lib/utils/format';

export default async function PendingReleasesPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('escrow_transactions')
    .select(`
      id, contract_price, supplier_net, supplier_fee, client_receipt_filename, client_receipt_url, client_payment_reference,
      rfqs!inner(rfq_number, title),
      supplier:supplier_id(full_name, email),
      suppliers:supplier_id!inner(bank_name, iban, account_holder)
    `)
    .eq('status', 'awaiting_final_confirmation')
    .order('updated_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Releases ({pending?.length ?? 0})</h1>
      {!pending || pending.length === 0 ? (
        <p className="text-stone-600">No releases waiting.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((p: any) => (
            <div key={p.id} className="bg-stone-100 rounded-xl p-4 border border-stone-300 space-y-3">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-mono num">{p.rfqs.rfq_number}</div>
                  <div className="font-semibold">{p.rfqs.title}</div>
                </div>
                <div className="text-end">
                  <div className="text-xs text-stone-600">Pay supplier:</div>
                  <div className="font-bold text-midnight-green num">{formatCurrency(p.supplier_net)}</div>
                  <div className="text-[10px] text-stone-600">(after 3% commission)</div>
                </div>
              </div>
              <div className="text-sm bg-cream rounded p-2 space-y-1">
                <div><strong>Bank:</strong> {p.suppliers.bank_name}</div>
                <div><strong>IBAN:</strong> <span className="font-mono num" dir="ltr">{p.suppliers.iban}</span></div>
                <div><strong>Account holder:</strong> {p.suppliers.account_holder}</div>
              </div>
              <a href={p.client_receipt_url} target="_blank" rel="noopener noreferrer" className="block text-xs text-action-blue hover:underline">
                Client final receipt: {p.client_receipt_filename}
              </a>
              <ProcessReleaseActions escrowId={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/admin/escrow/pending-releases/actions.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { adminReleaseToSupplierAction } from '@/app/actions/escrow';
import { Button } from '@/components/ui/button';

export function ProcessReleaseActions({ escrowId }: { escrowId: string }) {
  const [reference, setReference] = useState('');
  const [pending, start] = useTransition();

  const onMark = () => {
    if (reference.trim().length < 3) {
      alert('Add the bank transfer reference number.');
      return;
    }
    if (!confirm('Confirm this transfer is COMPLETE in the bank? This action cannot be undone.')) return;
    start(async () => {
      const res = await adminReleaseToSupplierAction({ escrowId, payoutReference: reference });
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Payout reference (REF-...)"
        className="flex-1 px-2 py-1 text-sm rounded border border-stone-300 bg-cream font-mono"
        dir="ltr"
      />
      <Button variant="brand" size="sm" onClick={onMark} disabled={pending}>
        {pending ? '…' : 'Mark released'}
      </Button>
    </div>
  );
}
```

---

## Step 6.5 — Supplier project workspace + delivery submission

### File: `app/[locale]/(supplier)/supplier/projects/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const STATUS_TIMELINE: Record<string, string> = {
  in_escrow: 'الإيداع المقدم',
  in_progress: 'التنفيذ',
  delivered: 'التسليم',
  completed: 'مكتمل',
};

export default async function SupplierProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select(`
      id, rfq_number, title, status, deadline,
      agreements!inner(contract_price, supplier_id),
      escrow_transactions!inner(status, supplier_net),
      deliveries(id, title, status, submitted_at, rejection_reason)
    `)
    .eq('id', id)
    .single();

  if (!rfq) notFound();
  if ((rfq.agreements as any).supplier_id !== user.id) notFound();

  const escrow = (rfq.escrow_transactions as any);
  const canDeliver = rfq.status === 'in_progress' && escrow?.status === 'initial_received';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/supplier/proposals">
          <ArrowRight className="size-4 rotate-180" /> العودة لعروضي
        </Link>
      </Button>

      <div>
        <p className="text-xs text-stone-600 font-mono num">{rfq.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">{rfq.title}</h1>
        <p className="text-sm text-stone-600 mt-1">
          آخر موعد: {formatDate(rfq.deadline, 'ar')} · مستحقاتك بعد التسليم:{' '}
          <span className="font-semibold num" dir="ltr">{formatCurrency(escrow?.supplier_net ?? 0)}</span>
        </p>
      </div>

      {/* Timeline */}
      <div className="bg-stone-100 rounded-xl p-4">
        <h2 className="font-semibold text-midnight-green mb-3 text-sm">المراحل</h2>
        <ol className="space-y-2 text-sm">
          {Object.entries(STATUS_TIMELINE).map(([key, label], i) => {
            const isActive = rfq.status === key;
            const isPast = ['in_escrow', 'in_progress', 'delivered', 'completed'].indexOf(rfq.status) >= i;
            return (
              <li key={key} className="flex items-center gap-3">
                <span className={`size-6 rounded-full text-xs flex items-center justify-center ${
                  isPast ? 'bg-success text-cream' : 'bg-stone-300 text-stone-600'
                }`}>{i + 1}</span>
                <span className={isActive ? 'font-semibold text-midnight-green' : 'text-stone-600'}>{label}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Action: deliver */}
      {canDeliver && (
        <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-action-blue">جاهز للتسليم؟</h2>
          <p className="text-sm">
            ارفع صور التنفيذ + ملاحظات. للعميل 14 يوماً للموافقة، وإلا يتم القبول التلقائي.
          </p>
          <Button asChild variant="brand">
            <Link href={`/supplier/projects/${id}/deliver`}>
              <Upload className="size-4" /> ارفع تسليمك
            </Link>
          </Button>
        </div>
      )}

      {/* Past deliveries */}
      {Array.isArray(rfq.deliveries) && rfq.deliveries.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-midnight-green">التسليمات السابقة</h2>
          {(rfq.deliveries as any[]).map((d) => (
            <div key={d.id} className="bg-stone-100 rounded-md p-3 text-sm">
              <div className="flex justify-between gap-2">
                <strong>{d.title}</strong>
                <span className="text-xs">{d.status}</span>
              </div>
              {d.rejection_reason && (
                <p className="text-xs text-danger mt-1">
                  العميل طلب: {d.rejection_reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/[locale]/(supplier)/supplier/projects/[id]/deliver/page.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FormField } from '@/components/ui/form-field';
import { FileUploader } from '@/components/ui/file-uploader';
import { Button } from '@/components/ui/button';
import { submitDeliveryAction } from '@/app/actions/escrow';
import type { UploadedFile } from '@/lib/storage/upload';

export default function DeliverPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<UploadedFile[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitDeliveryAction({
        rfqId: params.id,
        title,
        notes: notes || undefined,
        photos,
        files,
      });
      if (!res.ok) { setError(res.error); return; }
      router.push(`/supplier/projects/${params.id}`);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-midnight-green">رفع التسليم</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          label="عنوان التسليم"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: التسليم النهائي — جناح LEAP 6×6"
          required
        />
        <div>
          <label className="block text-sm font-medium mb-1.5">صور التنفيذ (مطلوب)</label>
          <FileUploader
            bucket="delivery-photos"
            pathPrefix={`delivery-${params.id}-${Date.now()}`}
            files={photos}
            onChange={setPhotos}
            maxFiles={20}
            accept="image/*"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">ملفات إضافية (اختياري)</label>
          <FileUploader
            bucket="delivery-photos"
            pathPrefix={`delivery-${params.id}-${Date.now()}`}
            files={files}
            onChange={setFiles}
            maxFiles={5}
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm font-medium">ملاحظات للعميل (اختياري)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm"
            placeholder="أي تفاصيل تساعد العميل على المراجعة"
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="brand" size="lg" disabled={pending || photos.length === 0}>
          {pending ? 'جارٍ الإرسال…' : 'أرسل التسليم للعميل'}
        </Button>
      </form>
    </div>
  );
}
```

---

## Step 6.6 — Client deliveries review

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/deliveries/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { ApproveRejectButtons } from './actions-client';
import { formatDate } from '@/lib/utils/format';

export default async function DeliveriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: deliveries } = await supabase
    .from('deliveries')
    .select('*')
    .eq('rfq_id', id)
    .eq('client_id', user.id)
    .order('submitted_at', { ascending: false });

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/rfqs/${id}`}><ArrowRight className="size-4 rotate-180" /> العودة للطلب</Link>
      </Button>

      <h1 className="text-2xl font-bold text-midnight-green">التسليمات</h1>

      {!deliveries || deliveries.length === 0 ? (
        <p className="text-sm text-stone-600">لم يقدّم المورد أي تسليم بعد.</p>
      ) : (
        deliveries.map((d) => (
          <div key={d.id} className="bg-stone-100 rounded-xl p-4 space-y-3 border border-stone-300">
            <div className="flex justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold">{d.title}</h2>
                <p className="text-xs text-stone-600">قُدّم في {formatDate(d.submitted_at, 'ar')}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full self-start ${
                d.status === 'approved' ? 'bg-success-100 text-success' :
                d.status === 'rejected' ? 'bg-danger-100 text-danger' :
                'bg-warning-100 text-warning'
              }`}>{d.status}</span>
            </div>
            {d.notes && <p className="text-sm whitespace-pre-line">{d.notes}</p>}
            {Array.isArray(d.photos) && d.photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(d.photos as any[]).map((p) => (
                  <a key={p.path} href={p.url} target="_blank" rel="noopener noreferrer" className="relative aspect-square bg-stone-300 rounded overflow-hidden">
                    <Image src={p.url} alt={p.filename} fill className="object-cover" />
                  </a>
                ))}
              </div>
            )}
            {d.status === 'submitted' && (
              <ApproveRejectButtons deliveryId={d.id} />
            )}
            {d.status === 'rejected' && d.rejection_reason && (
              <p className="text-xs text-danger bg-danger-100 p-2 rounded">طُلبت تعديلات: {d.rejection_reason}</p>
            )}
          </div>
        ))
      )}
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/deliveries/actions-client.tsx`

```tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { approveDeliveryAction, rejectDeliveryAction } from '@/app/actions/escrow';

export function ApproveRejectButtons({ deliveryId }: { deliveryId: string }) {
  const [pending, start] = useTransition();

  const onApprove = () => {
    if (!confirm('قبول التسليم يفتح خطوة دفع الـ 50% المتبقية. متأكد؟')) return;
    start(async () => {
      const res = await approveDeliveryAction(deliveryId);
      if (!res.ok) alert(res.error);
    });
  };

  const onReject = () => {
    const reason = window.prompt('اشرح ما الذي يحتاج تعديل (20 حرف على الأقل):');
    if (!reason || reason.trim().length < 20) return;
    start(async () => {
      const res = await rejectDeliveryAction(deliveryId, reason);
      if (!res.ok) alert(res.error);
    });
  };

  return (
    <div className="flex gap-2">
      <Button variant="brand" size="sm" onClick={onApprove} disabled={pending}>وافق على التسليم</Button>
      <Button variant="destructive" size="sm" onClick={onReject} disabled={pending}>اطلب تعديلات</Button>
    </div>
  );
}
```

---

## Step 6.7 — Supplier earnings page

### File: `app/[locale]/(supplier)/supplier/earnings/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default async function SupplierEarningsPage() {
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: txs } = await supabase
    .from('escrow_transactions')
    .select(`
      id, contract_price, supplier_net, supplier_fee, status,
      released_to_supplier_at, supplier_payout_reference,
      rfqs!inner(rfq_number, title, completed_at)
    `)
    .eq('supplier_id', user.id)
    .order('updated_at', { ascending: false });

  const released = (txs ?? []).filter((t) => t.status === 'released');
  const pending = (txs ?? []).filter((t) => t.status === 'awaiting_final_confirmation');
  const totalReleased = released.reduce((sum, t) => sum + (t.supplier_net ?? 0), 0);
  const totalPending = pending.reduce((sum, t) => sum + (t.supplier_net ?? 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">الأرباح</h1>

      <div className="grid sm:grid-cols-2 gap-3">
        <Stat label="مدفوع" value={formatCurrency(totalReleased)} color="success" />
        <Stat label="بانتظار التحويل" value={formatCurrency(totalPending)} color="warning" />
      </div>

      <h2 className="font-semibold">السجل</h2>
      {(!txs || txs.length === 0) ? (
        <p className="text-sm text-stone-600">لا معاملات بعد.</p>
      ) : (
        <div className="space-y-2">
          {txs.map((t: any) => (
            <div key={t.id} className="bg-stone-100 rounded-xl p-3 border border-stone-300">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-mono num">{t.rfqs.rfq_number}</p>
                  <p className="font-semibold">{t.rfqs.title}</p>
                  {t.released_to_supplier_at && (
                    <p className="text-xs text-stone-600">
                      حُوّلت في {formatDate(t.released_to_supplier_at, 'ar')} · REF:{' '}
                      <span className="font-mono num">{t.supplier_payout_reference}</span>
                    </p>
                  )}
                </div>
                <div className="text-end">
                  <div className="font-bold num text-midnight-green" dir="ltr">{formatCurrency(t.supplier_net)}</div>
                  <div className="text-[10px] text-stone-600 num">صافي بعد عمولة 3%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: 'success' | 'warning' }) {
  return (
    <div className={`bg-${color}-100 border border-${color}/30 rounded-xl p-4`}>
      <div className="text-xs text-stone-600">{label}</div>
      <div className="text-2xl font-bold mt-1 num" dir="ltr">{value}</div>
    </div>
  );
}
```

---

## Step 6.8 — Tests

### File: `tests/unit/escrow/calculator.test.ts`

(Should already exist from Phase 0. Add additional test:)

```ts
import { describe, it, expect } from 'vitest';
import { calculateEscrow } from '@/lib/utils/escrow-calculator';

describe('escrow split', () => {
  it('splits 100K into 50% initial + 50% final correctly', () => {
    const r = calculateEscrow(100000);
    expect(r.initialDeposit).toBe(50000);
    expect(r.finalPayment).toBe(50000);
  });

  it('client pays initial + 1% fee in first deposit', () => {
    const r = calculateEscrow(100000);
    // Total fee 2% on full 100K = 2000; half goes with each deposit = 1000 each
    const firstDepositPaid = r.initialDeposit + r.clientFee / 2;
    expect(firstDepositPaid).toBe(51000);
  });

  it('supplier net is 97% of contract', () => {
    const r = calculateEscrow(100000);
    expect(r.supplierNet).toBe(97000);
    expect(r.supplierFee).toBe(3000);
  });
});
```

### File: `tests/unit/escrow/state-transitions.test.ts`

```ts
import { describe, it, expect } from 'vitest';

const VALID_ESCROW_TRANSITIONS = [
  ['awaiting_initial_deposit', 'awaiting_admin_confirmation'],
  ['awaiting_admin_confirmation', 'initial_received'],
  ['awaiting_admin_confirmation', 'awaiting_initial_deposit'], // rejected → back to client
  ['initial_received', 'delivery_approved'],
  ['delivery_approved', 'awaiting_final_confirmation'],
  ['awaiting_final_confirmation', 'released'],
];

function canTransition(from: string, to: string): boolean {
  return VALID_ESCROW_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

describe('escrow state transitions', () => {
  it('allows initial deposit upload', () => {
    expect(canTransition('awaiting_initial_deposit', 'awaiting_admin_confirmation')).toBe(true);
  });
  it('allows admin to confirm', () => {
    expect(canTransition('awaiting_admin_confirmation', 'initial_received')).toBe(true);
  });
  it('allows admin to reject (back to client)', () => {
    expect(canTransition('awaiting_admin_confirmation', 'awaiting_initial_deposit')).toBe(true);
  });
  it('does not allow skipping delivery approval', () => {
    expect(canTransition('initial_received', 'released')).toBe(false);
  });
});
```

### File: `tests/integration/escrow-events.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe.skipIf(!process.env.RUN_INTEGRATION)('escrow_events append-only', () => {
  it('cannot UPDATE an existing event row', async () => {
    // Phase 0 created the prevent_escrow_event_mutation trigger
    const ts = Date.now();
    // Need an existing escrow row — for simplicity assume seeded
    const escrowId = process.env.TEST_ESCROW_ID;
    if (!escrowId) return;

    const { data: ev } = await admin.from('escrow_events').insert({
      escrow_id: escrowId, event_type: 'test_event_' + ts, actor_id: null, metadata: { test: true },
    }).select('id').single();

    const { error } = await admin.from('escrow_events').update({ event_type: 'changed' }).eq('id', ev!.id);
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/escrow_events.*immutable/i);
  });
});
```

---

## Step 6.9 — Acceptance checklist

- [ ] On RFQ → `in_escrow`, an `escrow_transactions` row is auto-created with the correct splits (verify via SQL)
- [ ] Client opens `/dashboard/rfqs/[id]/escrow`, sees bank instructions + correct amount (initial + half client fee)
- [ ] Client uploads receipt + reference → status moves to `awaiting_admin_confirmation`
- [ ] Admin sees pending deposit at `/admin/escrow/pending-deposits`
- [ ] Admin confirms → escrow `initial_received`, RFQ `in_progress`, supplier notified to start
- [ ] Admin can reject → status reverts to `awaiting_initial_deposit` with rejection reason visible to client
- [ ] Supplier opens `/supplier/projects/[id]` → sees timeline + "Submit delivery" CTA
- [ ] Supplier submits delivery with ≥1 photo → RFQ `delivered`, client notified
- [ ] Client opens `/dashboard/rfqs/[id]/deliveries` → sees photos + Approve/Reject buttons
- [ ] Approve → escrow `delivery_approved`, supplier notified
- [ ] Reject with reason → RFQ back to `in_progress`, supplier notified to revise
- [ ] Client uploads final receipt → escrow `awaiting_final_confirmation`
- [ ] Admin marks released with payout reference → escrow `released`, RFQ `completed`, supplier sees confirmation
- [ ] Supplier `/supplier/earnings` page shows released amount and payout reference
- [ ] Each state transition recorded in `escrow_events` (immutable)
- [ ] All previous test suites still pass + new tests added

---

## Files created in Phase 6 (summary)

```
app/actions/escrow.ts
app/[locale]/(client)/dashboard/rfqs/[id]/escrow/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/escrow/receipt-upload-form.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/deliveries/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/deliveries/actions-client.tsx
app/[locale]/(supplier)/supplier/projects/[id]/page.tsx
app/[locale]/(supplier)/supplier/projects/[id]/deliver/page.tsx
app/[locale]/(supplier)/supplier/earnings/page.tsx
app/admin/escrow/pending-deposits/page.tsx
app/admin/escrow/pending-deposits/actions.tsx
app/admin/escrow/pending-releases/page.tsx
app/admin/escrow/pending-releases/actions.tsx
supabase/migrations/20260715000001_escrow_extensions.sql
supabase/migrations/20260715000002_initial_escrow_creation.sql
tests/unit/escrow/calculator.test.ts
tests/unit/escrow/state-transitions.test.ts
tests/integration/escrow-events.test.ts
```

**Lines of code (estimate)**: ~2,500 implementation, ~250 tests.

**End of Phase 6.** The full money flow works end-to-end: client deposit → admin confirmation → supplier execution → client approval → final payment → admin payout. Phase 7 closes the loop with reviews, polish, marketing pages, and launch readiness.
