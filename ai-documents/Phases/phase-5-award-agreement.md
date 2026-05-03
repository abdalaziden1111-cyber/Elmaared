# Phase 5 — Award & Agreement (Weeks 11-12)

> **Goal**: After negotiation, the client awards the contract to one supplier. Both parties write their understanding of the agreement in their own words. AI compares the two and surfaces contradictions/gaps. Admin reviews and approves. Both parties sign. RFQ moves to `in_escrow`.

> **Prerequisite**: Phases 0–4 complete. Real-time chat is live with admin oversight.

---

## What this phase delivers

By end of Week 12:

1. **Award action** — client picks a winning proposal from a chat → that supplier becomes "winner", other chats close.
2. `/[locale]/dashboard/rfqs/[id]/agreement` — client writes their understanding (what they're paying for, deliverables, timeline, payment terms).
3. `/[locale]/supplier/rfqs/[id]/agreement` — supplier writes their understanding.
4. AI analysis: compares the two understandings → JSON output with `agreed`, `differs`, `missing`.
5. `/admin/agreements/[id]` — Admin sees side-by-side + AI analysis, can request edits or approve.
6. After admin approval, both parties electronically sign → RFQ moves to `in_escrow`.
7. Notifications to losing suppliers ("لم يقع الاختيار عليك هذه المرة").
8. ~25 new unit + integration tests.

---

## Step 5.1 — Migrations: agreements + revisions

(Phase 0 created `agreements` and `agreement_revisions`. Add fields needed for AI analysis + signatures.)

### File: `supabase/migrations/20260701000001_agreement_extensions.sql`

```sql
ALTER TABLE agreements
  ADD COLUMN IF NOT EXISTS client_understanding text,
  ADD COLUMN IF NOT EXISTS supplier_understanding text,
  ADD COLUMN IF NOT EXISTS client_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb,
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_status text CHECK (admin_status IN ('pending','approved','needs_edit')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS client_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS supplier_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contract_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS final_signed_at timestamptz;

CREATE INDEX IF NOT EXISTS agreements_rfq_id_idx ON agreements(rfq_id);
CREATE INDEX IF NOT EXISTS agreements_admin_pending_idx ON agreements(admin_status) WHERE admin_status = 'pending';
```

---

## Step 5.2 — Award Server Action

### File: `app/actions/award.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import { sendEmail } from '@/lib/email/resend';
import AwardWinnerEmail from '@/lib/email/templates/award-winner';
import AwardLoserEmail from '@/lib/email/templates/award-loser';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

const awardSchema = z.object({
  rfqId: z.string().uuid(),
  proposalId: z.string().uuid(),
});

export async function awardWinnerAction(input: unknown): Promise<ActionResult<{ agreementId: string }>> {
  const user = await requireRole(['client']);
  const parsed = awardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const supabase = await createClient();
  const admin = createAdminClient();

  // Validate RFQ ownership + state
  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, status, rfq_number, title, client_id, company_id')
    .eq('id', parsed.data.rfqId)
    .eq('client_id', user.id)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };
  if (!['negotiating', 'open'].includes(rfq.status)) {
    return { ok: false, error: `لا يمكن الإسناد من الحالة "${rfq.status}".` };
  }

  // Validate proposal belongs to this RFQ
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, supplier_id, total_price, company_id, status')
    .eq('id', parsed.data.proposalId)
    .eq('rfq_id', parsed.data.rfqId)
    .single();

  if (!proposal) return { ok: false, error: 'العرض غير موجود.' };
  if (proposal.status === 'withdrawn') return { ok: false, error: 'العرض مسحوب.' };

  // Move RFQ → awarded, set winning_proposal_id
  const { error: rfqErr } = await supabase
    .from('rfqs')
    .update({
      status: 'awarded',
      winning_proposal_id: proposal.id,
      awarded_at: new Date().toISOString(),
    })
    .eq('id', rfq.id)
    .in('status', ['negotiating', 'open']);

  if (rfqErr) return { ok: false, error: 'فشل في تحديث حالة الطلب.' };

  // Mark winning proposal accepted, others rejected
  await admin.from('proposals').update({ status: 'accepted' }).eq('id', proposal.id);
  await admin
    .from('proposals')
    .update({ status: 'rejected' })
    .eq('rfq_id', rfq.id)
    .neq('id', proposal.id)
    .neq('status', 'withdrawn');

  // Close all other chats on this RFQ
  await admin
    .from('chats')
    .update({ is_active: false })
    .eq('rfq_id', rfq.id)
    .neq('supplier_id', proposal.supplier_id);

  // Create agreement row (empty understandings for now)
  const { data: agreement, error: agreementErr } = await admin
    .from('agreements')
    .insert({
      rfq_id: rfq.id,
      client_id: user.id,
      supplier_id: proposal.supplier_id,
      proposal_id: proposal.id,
      contract_price: proposal.total_price,
      admin_status: 'pending',
    })
    .select('id')
    .single();

  if (agreementErr || !agreement) {
    return { ok: false, error: 'فشل في إنشاء الاتفاق.' };
  }

  // Audit
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'award_winner',
    resource_type: 'rfq',
    resource_id: rfq.id,
    metadata: { winning_proposal_id: proposal.id, supplier_id: proposal.supplier_id, contract_price: proposal.total_price },
  });

  // Notify winner + losers
  after(async () => {
    try {
      // Winner
      await admin.from('notifications').insert({
        user_id: proposal.supplier_id,
        type: 'award_won',
        title: '🎉 فزت بالعقد!',
        body: `اخترتك شركة كفائز على ${rfq.rfq_number}. ابدأ كتابة فهمك للاتفاق.`,
        link: `/supplier/rfqs/${rfq.id}/agreement`,
      });

      const { data: winnerProfile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', proposal.supplier_id)
        .single();

      if (winnerProfile?.email) {
        await sendEmail({
          to: winnerProfile.email,
          subject: `🎉 فزت بعقد ${rfq.rfq_number}`,
          react: AwardWinnerEmail({
            supplierName: winnerProfile.full_name ?? 'مرحباً',
            rfqNumber: rfq.rfq_number,
            rfqTitle: rfq.title,
            agreementUrl: `${process.env.NEXT_PUBLIC_APP_URL}/ar/supplier/rfqs/${rfq.id}/agreement`,
          }),
        });
      }

      // Losers
      const { data: losers } = await admin
        .from('proposals')
        .select('supplier_id, profiles:supplier_id(email, full_name)')
        .eq('rfq_id', rfq.id)
        .neq('id', proposal.id)
        .neq('status', 'withdrawn');

      if (losers) {
        await admin.from('notifications').insert(
          losers.map((l: any) => ({
            user_id: l.supplier_id,
            type: 'award_lost',
            title: 'لم يقع الاختيار عليك هذه المرة',
            body: `تم اختيار مورد آخر لـ ${rfq.rfq_number}. لا تتوقف — طلبات جديدة تصل يومياً.`,
            link: `/supplier/rfqs`,
          }))
        );

        await Promise.allSettled(
          losers.map((l: any) =>
            l.profiles?.email
              ? sendEmail({
                  to: l.profiles.email,
                  subject: `${rfq.rfq_number} — تم الإسناد لمورد آخر`,
                  react: AwardLoserEmail({
                    supplierName: l.profiles.full_name ?? 'مرحباً',
                    rfqNumber: rfq.rfq_number,
                  }),
                })
              : Promise.resolve()
          )
        );
      }
    } catch (e) {
      console.error('award notifications failed:', e);
    }
  });

  revalidatePath(`/dashboard/rfqs/${rfq.id}`);
  return { ok: true, data: { agreementId: agreement.id } };
}
```

### File: `lib/email/templates/award-winner.tsx`

```tsx
import { Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

export default function AwardWinnerEmail({
  supplierName, rfqNumber, rfqTitle, agreementUrl,
}: { supplierName: string; rfqNumber: string; rfqTitle: string; agreementUrl: string }) {
  return (
    <EmailLayout preview={`فزت بعقد ${rfqNumber}`}>
      <Text style={s.h1}>🎉 فزت بالعقد</Text>
      <Text style={s.text}>{supplierName}, مبارك! تم اختيارك كفائز على <strong>{rfqTitle}</strong> ({rfqNumber}).</Text>
      <Text style={s.text}>
        الخطوة التالية: اكتب فهمك للاتفاق. AI سيقارن فهمك مع فهم العميل ويكشف أي تناقضات قبل التوقيع.
      </Text>
      <div style={s.ctaWrap}>
        <a href={agreementUrl} style={s.cta}>اكتب فهمك للاتفاق ←</a>
      </div>
    </EmailLayout>
  );
}
```

### File: `lib/email/templates/award-loser.tsx`

```tsx
import { Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

export default function AwardLoserEmail({ supplierName, rfqNumber }: { supplierName: string; rfqNumber: string }) {
  return (
    <EmailLayout preview={`${rfqNumber} — تم الإسناد`}>
      <Text style={s.h1}>تم الإسناد لمورد آخر</Text>
      <Text style={s.text}>{supplierName},</Text>
      <Text style={s.text}>
        على {rfqNumber}، اختار العميل عرضاً آخر هذه المرة. لا تتوقف — طلبات جديدة تصل يومياً وتطابق تخصصك.
      </Text>
      <Text style={s.text}>
        نصيحة: راجع تحليل AI لعرضك على المنصة لمعرفة نقاط القوة والملاحظات.
      </Text>
      <div style={s.ctaWrap}>
        <a href={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa'}/ar/supplier/rfqs`} style={s.cta}>تصفّح الطلبات ←</a>
      </div>
    </EmailLayout>
  );
}
```

---

## Step 5.3 — Award button on the chat header

### Update `components/chat/chat-window.tsx` — add an "اختر فائزاً" button visible only to client

Add this near the panic button section (only when `currentUserRole === 'client'`):

```tsx
{currentUserRole === 'client' && chat.rfqs.status !== 'awarded' && (
  <Button
    variant="brand"
    size="sm"
    onClick={() => setShowAwardModal(true)}
  >
    اختر هذا المورد فائزاً
  </Button>
)}
```

And add an `<AwardModal>` component near `<PanicModal>`:

```tsx
function AwardModal({
  rfqId, proposalId, supplierName, onClose,
}: { rfqId: string; proposalId: string; supplierName: string; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onConfirm = () => {
    start(async () => {
      const res = await awardWinnerAction({ rfqId, proposalId });
      if (!res.ok) { alert(res.error); return; }
      router.push(`/dashboard/rfqs/${rfqId}/agreement`);
    });
  };

  return (
    <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-cream rounded-xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-midnight-green">اختيار {supplierName} فائزاً</h2>
        <p className="text-sm text-stone-600">
          اختيار هذا المورد فائزاً يُغلق المفاوضة مع باقي الموردين فوراً. لن تستطيع التراجع.
          الخطوة التالية: كل طرف يكتب فهمه للاتفاق ويقوم AI بمقارنة الفهمين.
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={pending}>إلغاء</Button>
          <Button variant="brand" className="flex-1" onClick={onConfirm} disabled={pending}>
            {pending ? 'جارٍ الإسناد…' : 'نعم، اختاره فائزاً'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

(Imports: `useRouter`, `awardWinnerAction`. Add `import` at top.)

---

## Step 5.4 — Agreement Server Actions

### File: `app/actions/agreement.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireUser } from '@/lib/auth/get-user';
import { agreementUnderstandingSchema } from '@/schemas/agreement';
import { analyzeAgreement } from '@/lib/ai/analyze-agreement';

export type ActionResult<T = unknown> = { ok: true; data?: T } | { ok: false; error: string };

const submitSchema = z.object({
  agreementId: z.string().uuid(),
  text: z.string().min(100, 'اكتب فهمك بتفصيل (100 حرف على الأقل).'),
});

export async function submitUnderstandingAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Invalid input.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: agreement } = await supabase
    .from('agreements')
    .select('id, client_id, supplier_id, client_understanding, supplier_understanding')
    .eq('id', parsed.data.agreementId)
    .single();

  if (!agreement) return { ok: false, error: 'الاتفاق غير موجود.' };
  const isClient = agreement.client_id === user.id;
  const isSupplier = agreement.supplier_id === user.id;
  if (!isClient && !isSupplier) return { ok: false, error: 'لست طرفاً في هذا الاتفاق.' };

  // Save into the relevant column
  const updates = isClient
    ? { client_understanding: parsed.data.text, client_submitted_at: new Date().toISOString() }
    : { supplier_understanding: parsed.data.text, supplier_submitted_at: new Date().toISOString() };

  await supabase.from('agreements').update(updates).eq('id', agreement.id);

  // Log this revision (immutable trail)
  await admin.from('agreement_revisions').insert({
    agreement_id: agreement.id,
    author_id: user.id,
    author_role: isClient ? 'client' : 'supplier',
    text: parsed.data.text,
  });

  // If both have submitted → run AI analysis
  const newClientText = isClient ? parsed.data.text : agreement.client_understanding;
  const newSupplierText = isSupplier ? parsed.data.text : agreement.supplier_understanding;

  if (newClientText && newSupplierText) {
    after(async () => {
      try {
        await analyzeAgreement(agreement.id);
        // Notify Admin queue
        const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
        if (admins) {
          await admin.from('notifications').insert(
            admins.map((a) => ({
              user_id: a.id,
              type: 'agreement_ready_for_review',
              title: 'اتفاق جاهز للمراجعة',
              body: `كلا الطرفين كتبا فهمهما. AI أكمل المقارنة.`,
              link: `/admin/agreements/${agreement.id}`,
            }))
          );
        }
      } catch (e) {
        console.error('analyzeAgreement failed:', e);
      }
    });
  }

  revalidatePath(`/dashboard/rfqs`);
  revalidatePath(`/supplier/rfqs`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ADMIN: approve or request edits
// ───────────────────────────────────────────────────────────
const adminReviewSchema = z.object({
  agreementId: z.string().uuid(),
  decision: z.enum(['approved', 'needs_edit']),
  notes: z.string().max(2000).optional(),
});

export async function adminReviewAgreementAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { ok: false, error: 'Forbidden' };

  const parsed = adminReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const admin = createAdminClient();

  await supabase
    .from('agreements')
    .update({
      admin_status: parsed.data.decision,
      admin_notes: parsed.data.notes ?? null,
      admin_reviewed_at: new Date().toISOString(),
      admin_reviewed_by: user.id,
    })
    .eq('id', parsed.data.agreementId);

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: parsed.data.decision === 'approved' ? 'approve_agreement' : 'request_agreement_edits',
    resource_type: 'agreement',
    resource_id: parsed.data.agreementId,
    metadata: { notes: parsed.data.notes },
  });

  // Notify both parties
  const { data: ag } = await admin
    .from('agreements')
    .select('client_id, supplier_id, rfq_id, rfqs!inner(rfq_number)')
    .eq('id', parsed.data.agreementId)
    .single();

  if (ag) {
    const title = parsed.data.decision === 'approved' ? '✅ Admin اعتمد الاتفاق' : '✏️ Admin طلب تعديلات';
    const body = parsed.data.decision === 'approved'
      ? 'الخطوة التالية: التوقيع الإلكتروني من الطرفين.'
      : (parsed.data.notes ?? 'راجع ملاحظات Admin وأعد كتابة فهمك.');
    await admin.from('notifications').insert([
      { user_id: ag.client_id, type: 'agreement_admin_decision', title, body, link: `/dashboard/rfqs/${ag.rfq_id}/agreement` },
      { user_id: ag.supplier_id, type: 'agreement_admin_decision', title, body, link: `/supplier/rfqs/${ag.rfq_id}/agreement` },
    ]);
  }

  revalidatePath(`/admin/agreements/${parsed.data.agreementId}`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// SIGN
// ───────────────────────────────────────────────────────────
export async function signAgreementAction(agreementId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: ag } = await supabase
    .from('agreements')
    .select('client_id, supplier_id, admin_status, client_signed_at, supplier_signed_at, rfq_id')
    .eq('id', agreementId)
    .single();

  if (!ag) return { ok: false, error: 'الاتفاق غير موجود.' };
  if (ag.admin_status !== 'approved') return { ok: false, error: 'الاتفاق لم يُعتمد من Admin بعد.' };

  const isClient = ag.client_id === user.id;
  const isSupplier = ag.supplier_id === user.id;
  if (!isClient && !isSupplier) return { ok: false, error: 'لست طرفاً في هذا الاتفاق.' };

  const fields = isClient
    ? { client_signed_at: new Date().toISOString() }
    : { supplier_signed_at: new Date().toISOString() };

  await supabase.from('agreements').update(fields).eq('id', agreementId);

  // If both signed → flip RFQ to in_escrow
  const { data: refreshed } = await admin
    .from('agreements')
    .select('client_signed_at, supplier_signed_at')
    .eq('id', agreementId)
    .single();

  if (refreshed?.client_signed_at && refreshed?.supplier_signed_at) {
    await admin.from('agreements').update({ final_signed_at: new Date().toISOString() }).eq('id', agreementId);
    await admin.from('rfqs').update({ status: 'in_escrow' }).eq('id', ag.rfq_id);

    // Notify both
    await admin.from('notifications').insert([
      { user_id: ag.client_id, type: 'agreement_signed', title: 'الاتفاق وُقّع — انقل للضمان المالي', body: 'حوّل 50% المقدمة لبدء التنفيذ.', link: `/dashboard/rfqs/${ag.rfq_id}/escrow` },
      { user_id: ag.supplier_id, type: 'agreement_signed', title: 'الاتفاق وُقّع — انتظر الإيداع', body: 'سنشعرك فور تأكيد الإيداع من العميل.', link: `/supplier/rfqs/${ag.rfq_id}` },
    ]);
  }

  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'sign_agreement',
    resource_type: 'agreement',
    resource_id: agreementId,
    metadata: { role: isClient ? 'client' : 'supplier' },
  });

  revalidatePath(`/dashboard/rfqs/${ag.rfq_id}/agreement`);
  revalidatePath(`/supplier/rfqs/${ag.rfq_id}/agreement`);
  return { ok: true };
}
```

---

## Step 5.5 — AI agreement analysis

### File: `lib/ai/analyze-agreement.ts`

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { gateway, AGREEMENT_ANALYSIS_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';

const analysisSchema = z.object({
  agreed: z.array(z.string()).describe('Points both parties expressed the same way (in Arabic, 5–20 words each).'),
  differs: z.array(z.object({
    topic: z.string().describe('What topic they disagree on, in Arabic (1-5 words).'),
    client_says: z.string().describe('What the client wrote on this topic.'),
    supplier_says: z.string().describe('What the supplier wrote on this topic.'),
    severity: z.enum(['high', 'medium', 'low']).describe('How material this difference is.'),
  })).describe('Points where the two understandings conflict.'),
  missing: z.array(z.object({
    topic: z.string(),
    needs_clarification: z.string().describe('What needs to be clarified, in Arabic.'),
    severity: z.enum(['high', 'medium', 'low']),
  })).describe('Important topics one party covered but the other didn\'t.'),
  overall_risk: z.enum(['low', 'medium', 'high']).describe('Overall risk if signed as-is.'),
  recommendation: z.string().min(20).max(400).describe('1–3 sentence Arabic recommendation for the admin reviewer.'),
});

const SYSTEM = `أنت مراجع اتفاقيات في منصة B2B سعودية. تقرأ فهمَي طرفين لاتفاقية وتحدد ما اتفقا عليه، ما اختلفا فيه، وما أغفله طرف وذكره الآخر.

قواعد:
- اللغة: عربية فصحى خفيفة (MSA-lite). محددة، ليست مزخرفة.
- لا تختلق نقاطاً لم يكتبها أي طرف.
- النقاط المتفق عليها: استخدم صياغتك (لا تنسخ نص أحد الطرفين حرفياً) لكن بنفس المعنى.
- الاختلافات: اذكر ما قال كل طرف بحرفياته الجوهرية. حدد الـ severity:
  - high = اختلاف في السعر، التسليمات الأساسية، أو الجدول الزمني.
  - medium = اختلاف في شروط الدفع، الضمان، أو نطاق ثانوي.
  - low = اختلاف في صياغة لا يؤثر على التنفيذ.
- إذا لم تجد اختلافات أو نقاط ناقصة، أعد مصفوفة فارغة. لا تختلق.
- التوصية: اقترح تعديلاً محدداً (مثلاً: "يجب توضيح هل التنظيف اليومي ضمن العقد أم لا").`;

export async function analyzeAgreement(agreementId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: ag } = await admin
    .from('agreements')
    .select(`
      id, client_understanding, supplier_understanding, contract_price,
      rfqs!inner(title, service_type, deadline, details)
    `)
    .eq('id', agreementId)
    .single();

  if (!ag || !ag.client_understanding || !ag.supplier_understanding) {
    console.warn('analyzeAgreement: missing one of the understandings');
    return;
  }

  const rfq = ag.rfqs as any;
  const prompt = `## السياق (الطلب الأصلي)
- العنوان: ${rfq.title}
- نوع الخدمة: ${rfq.service_type}
- آخر موعد: ${new Date(rfq.deadline).toLocaleDateString('ar-SA')}
- السعر المتفق عليه: ${ag.contract_price?.toLocaleString('en')} ﷼
- تفاصيل الطلب: ${JSON.stringify(rfq.details, null, 2)}

## فهم العميل للاتفاق
${ag.client_understanding}

## فهم المورد للاتفاق
${ag.supplier_understanding}

قارن الفهمين الآن وأنتج التحليل الكامل.`;

  try {
    const result = await generateText({
      model: gateway(AGREEMENT_ANALYSIS_MODEL),
      output: Output.object({ schema: analysisSchema }),
      system: SYSTEM,
      prompt,
      temperature: 0.2,
    });

    await admin
      .from('agreements')
      .update({
        ai_analysis: result.output,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq('id', agreementId);
  } catch (e) {
    console.error('analyzeAgreement error:', e);
    await admin
      .from('agreements')
      .update({ ai_analysis: { error: 'analysis_failed' }, ai_analyzed_at: new Date().toISOString() })
      .eq('id', agreementId);
  }
}
```

---

## Step 5.6 — Agreement page (shared client + supplier component)

### File: `components/agreement/understanding-form.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, Edit3 } from 'lucide-react';
import { submitUnderstandingAction } from '@/app/actions/agreement';
import { Button } from '@/components/ui/button';

interface Props {
  agreementId: string;
  initialText: string | null;
  submittedAt: string | null;
  partnerSubmitted: boolean;
  side: 'client' | 'supplier';
}

const PROMPTS = {
  client: `اكتب بفهمك ما الذي اتفقت مع المورد على تنفيذه.
ركّز على:
- ما الذي تدفع مقابله بالضبط (المخرجات، الكميات، المواصفات)
- متى يبدأ ومتى يسلّم
- ما المتضمن وما غير المتضمن
- شروط الدفع كما اتفقتم عليها
- ما يحدث عند تأخر التسليم أو عيوب الجودة`,
  supplier: `اكتب بفهمك ما الذي اتفقت مع العميل على تنفيذه.
ركّز على:
- ما المخرجات والكميات والمواصفات المطلوبة منك
- متى تبدأ ومتى تسلّم
- ما المتضمن في السعر وما غير المتضمن
- شروط الدفع كما اتفقتم عليها
- التزاماتك في حال التأخر أو إعادة العمل`,
};

export function UnderstandingForm({ agreementId, initialText, submittedAt, partnerSubmitted, side }: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [editing, setEditing] = useState(!submittedAt);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSave = () => {
    setError(null);
    start(async () => {
      const res = await submitUnderstandingAction({ agreementId, text });
      if (!res.ok) { setError(res.error); return; }
      setEditing(false);
    });
  };

  if (!editing && submittedAt) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-success">
          <CheckCircle2 className="size-5" />
          <span className="font-medium text-sm">حفظت فهمك</span>
        </div>
        <p className="text-sm whitespace-pre-line bg-stone-100 rounded-lg p-3">{text}</p>
        {!partnerSubmitted && (
          <p className="text-xs text-stone-600">
            ننتظر الطرف الآخر ليكتب فهمه. AI سيقارن الفهمين فور اكتمالهما.
          </p>
        )}
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Edit3 className="size-4" /> عدّل
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600 whitespace-pre-line">{PROMPTS[side]}</p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={12}
        placeholder="اكتب فهمك هنا… (100 حرف على الأقل)"
        className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-stone-600 num">{text.length} حرف</span>
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <div className="flex gap-2">
        {submittedAt && (
          <Button variant="secondary" size="sm" onClick={() => { setText(initialText ?? ''); setEditing(false); }}>
            إلغاء
          </Button>
        )}
        <Button variant="brand" onClick={onSave} disabled={pending}>
          {pending ? 'جارٍ الحفظ…' : submittedAt ? 'حفظ التعديل' : 'احفظ فهمي'}
        </Button>
      </div>
    </div>
  );
}
```

### File: `components/agreement/sign-card.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { ShieldCheck } from 'lucide-react';
import { signAgreementAction } from '@/app/actions/agreement';
import { Button } from '@/components/ui/button';

interface Props {
  agreementId: string;
  alreadySigned: boolean;
  partnerSigned: boolean;
}

export function SignCard({ agreementId, alreadySigned, partnerSigned }: Props) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const onSign = () => {
    start(async () => {
      const res = await signAgreementAction(agreementId);
      if (!res.ok) { alert(res.error); return; }
      setConfirming(false);
    });
  };

  if (alreadySigned) {
    return (
      <div className="bg-success-100 border border-success/30 rounded-xl p-4 text-sm text-success flex items-center gap-2">
        <ShieldCheck className="size-5" />
        وقّعت الاتفاق. {partnerSigned ? 'كلا الطرفين وقّع — الانتقال للضمان.' : 'في انتظار توقيع الطرف الآخر.'}
      </div>
    );
  }

  return (
    <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
      <h3 className="font-semibold">جاهز للتوقيع؟</h3>
      <p className="text-sm text-stone-600">
        التوقيع الإلكتروني يعتبر التزاماً قانونياً. تأكد من قراءة فهمك وفهم الطرف الآخر وملاحظات Admin.
      </p>
      {!confirming ? (
        <Button variant="brand" onClick={() => setConfirming(true)}>
          ابدأ التوقيع
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium">هل أنت متأكد من التوقيع على الاتفاق؟</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>إلغاء</Button>
            <Button variant="brand" onClick={onSign} disabled={pending}>
              {pending ? 'جارٍ التوقيع…' : 'نعم، وقّع باسمي'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/agreement/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { UnderstandingForm } from '@/components/agreement/understanding-form';
import { SignCard } from '@/components/agreement/sign-card';
import { AgreementAnalysis } from '@/components/agreement/analysis';
import { formatCurrency } from '@/lib/utils/format';

export default async function ClientAgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: ag } = await supabase
    .from('agreements')
    .select(`
      *,
      rfqs!inner(rfq_number, title, status)
    `)
    .eq('rfq_id', id)
    .eq('client_id', user.id)
    .single();

  if (!ag) notFound();

  const adminApproved = ag.admin_status === 'approved';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/rfqs/${id}`}><ArrowRight className="size-4 rotate-180" /> العودة للطلب</Link>
      </Button>

      <div className="space-y-1">
        <p className="text-xs text-stone-600 font-mono num">{ag.rfqs.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">الاتفاق</h1>
        <p className="text-sm text-stone-600">السعر المتفق عليه: <span className="num font-semibold" dir="ltr">{formatCurrency(ag.contract_price)}</span></p>
      </div>

      {/* Step 1: write your understanding */}
      <section className="bg-stone-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-midnight-green">1. فهمك للاتفاق</h2>
        <UnderstandingForm
          agreementId={ag.id}
          initialText={ag.client_understanding}
          submittedAt={ag.client_submitted_at}
          partnerSubmitted={!!ag.supplier_submitted_at}
          side="client"
        />
      </section>

      {/* Step 2: AI analysis (when both parties submitted) */}
      {ag.ai_analysis && (
        <section className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-dune-gold" />
            <h2 className="font-semibold text-action-blue">2. تحليل AI للاتفاق</h2>
          </div>
          <AgreementAnalysis analysis={ag.ai_analysis} />
        </section>
      )}

      {/* Step 3: admin status */}
      {ag.admin_status !== 'pending' && (
        <section className={`rounded-xl p-4 ${adminApproved ? 'bg-success-100 border border-success/30' : 'bg-warning-100 border border-warning/30'}`}>
          <h2 className="font-semibold">{adminApproved ? '✅ Admin اعتمد الاتفاق' : '✏️ Admin طلب تعديلات'}</h2>
          {ag.admin_notes && <p className="text-sm mt-2 whitespace-pre-line">{ag.admin_notes}</p>}
        </section>
      )}

      {/* Step 4: sign (only after admin approval) */}
      {adminApproved && (
        <section className="space-y-3">
          <h2 className="font-semibold text-midnight-green">3. التوقيع</h2>
          <SignCard
            agreementId={ag.id}
            alreadySigned={!!ag.client_signed_at}
            partnerSigned={!!ag.supplier_signed_at}
          />
        </section>
      )}
    </div>
  );
}
```

### File: `app/[locale]/(supplier)/supplier/rfqs/[id]/agreement/page.tsx`

(Mirror of client version — same component, but `requireRole(['supplier'])`, query `eq('supplier_id', user.id)`, pass `side="supplier"` and use supplier-side fields.)

### File: `components/agreement/analysis.tsx`

```tsx
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface Analysis {
  agreed: string[];
  differs: { topic: string; client_says: string; supplier_says: string; severity: 'high' | 'medium' | 'low' }[];
  missing: { topic: string; needs_clarification: string; severity: 'high' | 'medium' | 'low' }[];
  overall_risk: 'low' | 'medium' | 'high';
  recommendation: string;
  error?: string;
}

const SEVERITY = {
  high: { icon: AlertCircle, className: 'text-danger bg-danger-100 border-danger/30' },
  medium: { icon: AlertTriangle, className: 'text-warning bg-warning-100 border-warning/30' },
  low: { icon: AlertCircle, className: 'text-info bg-info-100 border-info/30' },
};

export function AgreementAnalysis({ analysis }: { analysis: Analysis }) {
  if (analysis.error) {
    return <p className="text-sm text-danger">فشل التحليل التلقائي. سيراجع Admin الاتفاق يدوياً.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm">
        <strong>المخاطر العامة:</strong>{' '}
        <span className={`px-2 py-0.5 rounded-full text-xs border ${SEVERITY[analysis.overall_risk].className}`}>
          {analysis.overall_risk === 'high' ? 'مرتفع' : analysis.overall_risk === 'medium' ? 'متوسط' : 'منخفض'}
        </span>
      </div>

      <p className="text-sm bg-cream rounded-md p-3 italic">"{analysis.recommendation}"</p>

      {analysis.agreed.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-success mb-2 flex items-center gap-1">
            <CheckCircle2 className="size-4" /> النقاط المتفق عليها ({analysis.agreed.length})
          </h3>
          <ul className="text-sm space-y-1 list-disc list-inside">
            {analysis.agreed.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
      )}

      {analysis.differs.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-warning mb-2 flex items-center gap-1">
            <AlertTriangle className="size-4" /> اختلافات ({analysis.differs.length})
          </h3>
          <div className="space-y-2">
            {analysis.differs.map((d, i) => {
              const Icon = SEVERITY[d.severity].icon;
              return (
                <div key={i} className={`text-sm border rounded-md p-3 ${SEVERITY[d.severity].className}`}>
                  <div className="flex items-center gap-1 font-semibold"><Icon className="size-3.5" /> {d.topic}</div>
                  <div className="mt-2 grid sm:grid-cols-2 gap-2">
                    <div className="bg-cream/50 rounded p-2">
                      <div className="text-[10px] uppercase opacity-70">العميل</div>
                      <div>{d.client_says}</div>
                    </div>
                    <div className="bg-cream/50 rounded p-2">
                      <div className="text-[10px] uppercase opacity-70">المورد</div>
                      <div>{d.supplier_says}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {analysis.missing.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-info mb-2 flex items-center gap-1">
            <AlertCircle className="size-4" /> ينقص توضيح ({analysis.missing.length})
          </h3>
          <div className="space-y-2">
            {analysis.missing.map((m, i) => (
              <div key={i} className={`text-sm border rounded-md p-3 ${SEVERITY[m.severity].className}`}>
                <div className="font-semibold">{m.topic}</div>
                <div>{m.needs_clarification}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Step 5.7 — Admin agreement review page

### File: `app/admin/agreements/page.tsx`

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils/format';

export default async function AdminAgreementsPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('agreements')
    .select(`
      id, contract_price, ai_analyzed_at, ai_analysis, client_submitted_at, supplier_submitted_at,
      rfqs!inner(rfq_number, title)
    `)
    .eq('admin_status', 'pending')
    .not('client_submitted_at', 'is', null)
    .not('supplier_submitted_at', 'is', null)
    .order('client_submitted_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Pending Agreement Reviews ({pending?.length ?? 0})</h1>
      {!pending || pending.length === 0 ? (
        <p className="text-stone-600 text-sm">No agreements awaiting review.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((a: any) => {
            const risk = a.ai_analysis?.overall_risk ?? 'unknown';
            return (
              <Link
                key={a.id}
                href={`/admin/agreements/${a.id}`}
                className="block bg-stone-100 hover:bg-stone-200 rounded-lg p-3 border border-stone-300"
              >
                <div className="flex justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs font-mono num">{a.rfqs.rfq_number}</div>
                    <div className="font-semibold">{a.rfqs.title}</div>
                    <div className="text-xs text-stone-600 mt-1">
                      Submitted {timeAgo(a.client_submitted_at, 'en')} · Price: {a.contract_price?.toLocaleString('en')} ﷼
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full self-start ${
                    risk === 'high' ? 'bg-danger-100 text-danger' :
                    risk === 'medium' ? 'bg-warning-100 text-warning' :
                    risk === 'low' ? 'bg-success-100 text-success' :
                    'bg-stone-100 text-stone-600'
                  }`}>
                    Risk: {risk}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

### File: `app/admin/agreements/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { AgreementAnalysis } from '@/components/agreement/analysis';
import { ReviewForm } from './review-form';

export default async function AdminAgreementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(['admin']);
  const supabase = await createClient();

  const { data: ag } = await supabase
    .from('agreements')
    .select(`
      *,
      rfqs!inner(rfq_number, title, service_type),
      client:client_id(full_name, email),
      supplier:supplier_id(full_name, email)
    `)
    .eq('id', id)
    .single();

  if (!ag) notFound();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-mono num">{ag.rfqs.rfq_number}</p>
        <h1 className="text-2xl font-bold">{ag.rfqs.title}</h1>
        <p className="text-sm text-stone-600">السعر: <span className="num">{ag.contract_price?.toLocaleString('en')} ﷼</span></p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Side title="فهم العميل" who={(ag.client as any)?.full_name} text={ag.client_understanding} />
        <Side title="فهم المورد" who={(ag.supplier as any)?.full_name} text={ag.supplier_understanding} />
      </div>

      {ag.ai_analysis && (
        <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4">
          <h2 className="font-semibold text-action-blue mb-3">AI Analysis</h2>
          <AgreementAnalysis analysis={ag.ai_analysis} />
        </div>
      )}

      <ReviewForm agreementId={ag.id} currentStatus={ag.admin_status} currentNotes={ag.admin_notes} />
    </div>
  );
}

function Side({ title, who, text }: { title: string; who?: string; text: string | null }) {
  return (
    <div className="bg-stone-100 rounded-xl p-4 space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {who && <p className="text-xs text-stone-600">{who}</p>}
      <p className="text-sm whitespace-pre-line">{text ?? '— لم يُكتب بعد —'}</p>
    </div>
  );
}
```

### File: `app/admin/agreements/[id]/review-form.tsx`

```tsx
'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { adminReviewAgreementAction } from '@/app/actions/agreement';

export function ReviewForm({ agreementId, currentStatus, currentNotes }: { agreementId: string; currentStatus: string; currentNotes: string | null }) {
  const [decision, setDecision] = useState<'approved' | 'needs_edit' | null>(null);
  const [notes, setNotes] = useState(currentNotes ?? '');
  const [pending, start] = useTransition();

  const onSubmit = () => {
    if (!decision) return;
    if (decision === 'needs_edit' && notes.trim().length < 10) {
      alert('Add notes describing what needs to change.');
      return;
    }
    start(async () => {
      const res = await adminReviewAgreementAction({ agreementId, decision, notes: notes.trim() || undefined });
      if (!res.ok) alert(res.error);
    });
  };

  if (currentStatus !== 'pending') {
    return (
      <div className="bg-stone-100 rounded-xl p-4 text-sm">
        <strong>Decision recorded:</strong> {currentStatus}
        {currentNotes && <p className="mt-2 whitespace-pre-line">{currentNotes}</p>}
      </div>
    );
  }

  return (
    <div className="bg-stone-100 rounded-xl p-4 space-y-3">
      <h2 className="font-semibold">Your decision</h2>
      <div className="flex gap-2">
        <Button
          variant={decision === 'approved' ? 'brand' : 'secondary'}
          onClick={() => setDecision('approved')}
        >
          ✅ Approve
        </Button>
        <Button
          variant={decision === 'needs_edit' ? 'brand' : 'secondary'}
          onClick={() => setDecision('needs_edit')}
        >
          ✏️ Request edits
        </Button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={decision === 'needs_edit' ? 'What specifically needs to change? (sent to both parties)' : 'Optional notes…'}
        rows={4}
        className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm"
      />
      <Button variant="brand" onClick={onSubmit} disabled={!decision || pending}>
        {pending ? 'Saving…' : 'Submit decision'}
      </Button>
    </div>
  );
}
```

---

## Step 5.8 — Tests

### File: `tests/unit/agreement/analysis-schema.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const analysisSchema = z.object({
  agreed: z.array(z.string()),
  differs: z.array(z.object({
    topic: z.string(), client_says: z.string(), supplier_says: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
  })),
  missing: z.array(z.object({
    topic: z.string(), needs_clarification: z.string(),
    severity: z.enum(['high', 'medium', 'low']),
  })),
  overall_risk: z.enum(['low', 'medium', 'high']),
  recommendation: z.string().min(20).max(400),
});

describe('agreement analysis schema', () => {
  it('accepts a clean analysis', () => {
    expect(analysisSchema.safeParse({
      agreed: ['السعر 80,000 ﷼'],
      differs: [],
      missing: [],
      overall_risk: 'low',
      recommendation: 'الاتفاق متوازن — يمكن الاعتماد بدون تعديلات.',
    }).success).toBe(true);
  });

  it('rejects unknown severity', () => {
    expect(analysisSchema.safeParse({
      agreed: [],
      differs: [{ topic: 'x', client_says: 'a', supplier_says: 'b', severity: 'urgent' as any }],
      missing: [],
      overall_risk: 'low',
      recommendation: 'a'.repeat(50),
    }).success).toBe(false);
  });
});
```

### File: `tests/unit/agreement/state-transitions.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { canTransition } from '@/lib/utils/rfq-state-machine';

describe('RFQ state transitions for award flow', () => {
  it('client can move negotiating → awarded', () => {
    expect(canTransition('negotiating', 'awarded', 'client')).toBe(true);
  });
  it('supplier cannot award', () => {
    expect(canTransition('negotiating', 'awarded', 'supplier')).toBe(false);
  });
  it('cannot award from completed', () => {
    expect(canTransition('completed', 'awarded', 'client')).toBe(false);
  });
  it('admin can transition awarded → in_escrow (after sign)', () => {
    expect(canTransition('awarded', 'in_escrow', 'admin')).toBe(true);
  });
});
```

### File: `tests/integration/agreement-flow.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe.skipIf(!process.env.RUN_INTEGRATION)('agreement signing', () => {
  it('flips RFQ to in_escrow only when both signed', async () => {
    // Seed minimal data: client + supplier + rfq + agreement
    const ts = Date.now();
    const { data: c } = await admin.auth.admin.createUser({ email: `c-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: s } = await admin.auth.admin.createUser({ email: `s-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: cc } = await admin.from('companies').insert({ name: 'C', cr_number: '1010' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: c.user!.id }).select('id').single();
    const { data: sc } = await admin.from('companies').insert({ name: 'S', cr_number: '2020' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: s.user!.id }).select('id').single();
    await admin.from('profiles').insert([
      { id: c.user!.id, email: c.user!.email!, full_name: 'C', role: 'client', company_id: cc!.id },
      { id: s.user!.id, email: s.user!.email!, full_name: 'S', role: 'supplier', company_id: sc!.id },
    ]);

    const { data: rfq } = await admin.from('rfqs').insert({
      client_id: c.user!.id, company_id: cc!.id,
      service_type: 'booth', title: 'X', city: 'riyadh',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { area: 36, exhibitionName: 'X', floors: '1' },
      status: 'awarded',
    }).select('id').single();

    const { data: ag } = await admin.from('agreements').insert({
      rfq_id: rfq!.id, client_id: c.user!.id, supplier_id: s.user!.id,
      contract_price: 80000,
      client_understanding: 'a'.repeat(100), supplier_understanding: 'b'.repeat(100),
      client_submitted_at: new Date().toISOString(), supplier_submitted_at: new Date().toISOString(),
      admin_status: 'approved', admin_reviewed_at: new Date().toISOString(),
    }).select('id').single();

    // Sign client
    await admin.from('agreements').update({ client_signed_at: new Date().toISOString() }).eq('id', ag!.id);
    let { data: r1 } = await admin.from('rfqs').select('status').eq('id', rfq!.id).single();
    expect(r1?.status).toBe('awarded'); // not yet flipped

    // Sign supplier
    await admin.from('agreements').update({ supplier_signed_at: new Date().toISOString(), final_signed_at: new Date().toISOString() }).eq('id', ag!.id);
    await admin.from('rfqs').update({ status: 'in_escrow' }).eq('id', rfq!.id);
    let { data: r2 } = await admin.from('rfqs').select('status').eq('id', rfq!.id).single();
    expect(r2?.status).toBe('in_escrow');

    // Cleanup
    await admin.from('agreements').delete().eq('id', ag!.id);
    await admin.from('rfqs').delete().eq('id', rfq!.id);
    await admin.from('profiles').delete().in('id', [c.user!.id, s.user!.id]);
    await admin.from('companies').delete().in('id', [cc!.id, sc!.id]);
    await admin.auth.admin.deleteUser(c.user!.id);
    await admin.auth.admin.deleteUser(s.user!.id);
  });
});
```

---

## Step 5.9 — Acceptance checklist

- [ ] Client can press "اختر هذا المورد فائزاً" inside any active chat
- [ ] After award: RFQ status `awarded`, winning proposal `accepted`, others `rejected`, other chats `is_active=false`
- [ ] Winner gets in-app + email "🎉 فزت بالعقد"
- [ ] Losers get "لم يقع الاختيار عليك هذه المرة" notification
- [ ] Both parties open `/agreement` and write their understanding (≥100 chars)
- [ ] After both submit, AI analysis populates within ~30 sec
- [ ] Admin sees pending agreement at `/admin/agreements`
- [ ] Admin reviews side-by-side + AI analysis, can approve or request edits
- [ ] If `needs_edit`: both parties see Admin notes, can rewrite, AI re-analyzes
- [ ] After approval: both parties see "Sign" card, click → `client_signed_at` / `supplier_signed_at` set
- [ ] When both signed: RFQ → `in_escrow`, both parties get notification
- [ ] Each `submit_understanding` appends a row in `agreement_revisions`
- [ ] All previous test suites still pass + new tests added

---

## Files created in Phase 5 (summary)

```
app/actions/award.ts
app/actions/agreement.ts
app/[locale]/(client)/dashboard/rfqs/[id]/agreement/page.tsx
app/[locale]/(supplier)/supplier/rfqs/[id]/agreement/page.tsx
app/admin/agreements/page.tsx
app/admin/agreements/[id]/page.tsx
app/admin/agreements/[id]/review-form.tsx
components/agreement/understanding-form.tsx
components/agreement/sign-card.tsx
components/agreement/analysis.tsx
lib/ai/analyze-agreement.ts
lib/email/templates/award-winner.tsx
lib/email/templates/award-loser.tsx
supabase/migrations/20260701000001_agreement_extensions.sql
tests/unit/agreement/analysis-schema.test.ts
tests/unit/agreement/state-transitions.test.ts
tests/integration/agreement-flow.test.ts
```

**Lines of code (estimate)**: ~1,800 implementation, ~250 tests.

**End of Phase 5.** Award + AI-analyzed agreement + admin gate + electronic signing — the negotiation is now legally closed and the RFQ is ready for the escrow flow in Phase 6.
