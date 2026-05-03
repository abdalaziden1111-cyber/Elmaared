# Phase 3 — Proposals & AI Comparison (Weeks 7-8)

> **Goal**: A supplier can submit a proposal for any open RFQ. AI scores each proposal asynchronously. The client can view proposals side-by-side with an AI recommendation card.

> **Prerequisite**: Phases 0–2 complete. RFQs exist, suppliers can see RFQs matching their specialization.

---

## What this phase delivers

By end of Week 8:

1. `/[locale]/supplier/rfqs/[id]/propose` — 3-step proposal wizard.
2. AI scoring background job (triggered after each proposal insert) — uses Vercel AI Gateway → Claude Sonnet 4.6.
3. `/[locale]/supplier/proposals` — supplier's own list of submitted proposals.
4. `/[locale]/supplier/proposals/[id]` — proposal details + status + AI score (if available).
5. `/[locale]/dashboard/rfqs/[id]/proposals` — client's compare view with AI recommendation.
6. `/[locale]/dashboard/rfqs/[id]/proposals/[proposalId]` — single proposal deep-dive.
7. Email + in-app notification on proposal received.
8. Email to supplier when their proposal is scored.
9. ~30 new unit + integration tests + 1 E2E test.

---

## Step 3.1 — Vercel AI Gateway setup

```bash
pnpm add ai @ai-sdk/gateway
```

### File: `lib/ai/gateway.ts`

```ts
import { createGateway } from '@ai-sdk/gateway';

const gatewayApiKey = process.env.AI_GATEWAY_API_KEY;

if (!gatewayApiKey && process.env.NODE_ENV === 'production') {
  throw new Error('AI_GATEWAY_API_KEY missing in production');
}

export const gateway = createGateway({
  apiKey: gatewayApiKey,
});

// Default model alias for the project — change in one place if we switch models.
export const PROPOSAL_SCORING_MODEL = 'anthropic/claude-sonnet-4.6';
export const AGREEMENT_ANALYSIS_MODEL = 'anthropic/claude-sonnet-4.6';
export const RECOMMENDATION_MODEL = 'anthropic/claude-sonnet-4.6';
```

### Update `.env.example`

```
AI_GATEWAY_API_KEY=...
```

---

## Step 3.2 — Add `proposals.ai_score` columns migration

(Phase 0 already created the proposals table. Add AI fields if not already there.)

### File: `supabase/migrations/20260601000001_proposal_ai_fields.sql`

```sql
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS ai_score numeric(5,2),  -- 0–100
  ADD COLUMN IF NOT EXISTS ai_breakdown jsonb,     -- { price: 25, scope: 30, ... }
  ADD COLUMN IF NOT EXISTS ai_summary text,
  ADD COLUMN IF NOT EXISTS ai_strengths text[],
  ADD COLUMN IF NOT EXISTS ai_concerns text[],
  ADD COLUMN IF NOT EXISTS ai_scored_at timestamptz;

CREATE INDEX IF NOT EXISTS proposals_rfq_id_score_idx ON proposals(rfq_id, ai_score DESC NULLS LAST);
```

---

## Step 3.3 — Submit Proposal Server Action

### File: `app/actions/proposal.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import { proposalSchema } from '@/schemas/proposal';
import { scoreProposal } from '@/lib/ai/score-proposal';
import { sendEmail } from '@/lib/email/resend';
import ProposalReceivedEmail from '@/lib/email/templates/proposal-received';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const submitSchema = proposalSchema.extend({
  rfqId: z.string().uuid(),
  files: z.array(z.object({
    path: z.string(), url: z.string(), filename: z.string(),
    sizeBytes: z.number(), mimeType: z.string(),
  })).default([]),
});

export async function submitProposalAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole(['supplier']);
  const parsed = submitSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Check supplier is approved
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('status, company_id')
    .eq('id', user.id)
    .single();

  if (!supplier || supplier.status !== 'approved') {
    return { ok: false, error: 'حسابك غير مفعّل بعد. لا يمكنك تقديم عروض.' };
  }

  // Check RFQ exists and is still open
  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, client_id, status, rfq_number, title, service_type, city')
    .eq('id', parsed.data.rfqId)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };
  if (rfq.status !== 'open' && rfq.status !== 'negotiating') {
    return { ok: false, error: 'لم يعد هذا الطلب يقبل عروضاً جديدة.' };
  }

  // Check supplier hasn't already submitted (UNIQUE constraint will also catch this)
  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('rfq_id', parsed.data.rfqId)
    .eq('supplier_id', user.id)
    .maybeSingle();

  if (existing) {
    return { ok: false, error: 'قدّمت عرضاً على هذا الطلب بالفعل.' };
  }

  // Insert proposal
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + (parsed.data.validityDays ?? 14));

  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      rfq_id: parsed.data.rfqId,
      supplier_id: user.id,
      company_id: supplier.company_id,
      total_price: parsed.data.totalPrice,
      delivery_days: parsed.data.deliveryDays,
      description: parsed.data.description,
      scope_of_work: parsed.data.scopeOfWork,
      payment_terms: parsed.data.paymentTerms ?? null,
      warranty: parsed.data.warranty ?? null,
      valid_until: validUntil.toISOString(),
      files: parsed.data.files,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !proposal) {
    if (error?.code === '23505') {
      return { ok: false, error: 'قدّمت عرضاً على هذا الطلب بالفعل.' };
    }
    console.error('submitProposal error:', error);
    return { ok: false, error: 'فشل في تقديم العرض. حاول مرة أخرى.' };
  }

  // Audit
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'submit_proposal',
    resource_type: 'proposal',
    resource_id: proposal.id,
    metadata: { rfq_id: rfq.id, total_price: parsed.data.totalPrice },
  });

  // Notify client (in-app + email) — fire and forget
  after(async () => {
    try {
      await admin.from('notifications').insert({
        user_id: rfq.client_id,
        type: 'proposal_received',
        title: 'عرض جديد على طلبك',
        body: `استلمت عرضاً جديداً على ${rfq.rfq_number}.`,
        link: `/dashboard/rfqs/${rfq.id}/proposals`,
      });

      const { data: client } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', rfq.client_id)
        .single();

      if (client?.email) {
        await sendEmail({
          to: client.email,
          subject: `عرض جديد على ${rfq.rfq_number}`,
          react: ProposalReceivedEmail({
            clientName: client.full_name ?? 'مرحباً',
            rfqNumber: rfq.rfq_number,
            rfqTitle: rfq.title,
            proposalUrl: `${process.env.NEXT_PUBLIC_APP_URL}/ar/dashboard/rfqs/${rfq.id}/proposals/${proposal.id}`,
          }),
        });
      }
    } catch (e) {
      console.error('proposal-received notification failed:', e);
    }
  });

  // AI scoring — also async, doesn't block the response
  after(async () => {
    try {
      await scoreProposal(proposal.id);
    } catch (e) {
      console.error('AI scoring failed for proposal', proposal.id, e);
    }
  });

  // Move RFQ to 'negotiating' if it was 'open'
  if (rfq.status === 'open') {
    await supabase
      .from('rfqs')
      .update({ status: 'negotiating', first_proposal_at: new Date().toISOString() })
      .eq('id', rfq.id)
      .eq('status', 'open'); // optimistic concurrency
  }

  revalidatePath('/supplier/proposals');
  return { ok: true, data: { id: proposal.id } };
}
```

### File: `lib/email/templates/proposal-received.tsx`

```tsx
import { Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

interface Props {
  clientName: string;
  rfqNumber: string;
  rfqTitle: string;
  proposalUrl: string;
}

export default function ProposalReceivedEmail({ clientName, rfqNumber, rfqTitle, proposalUrl }: Props) {
  return (
    <EmailLayout preview={`عرض جديد على ${rfqNumber}`}>
      <Text style={s.h1}>عرض جديد على طلبك</Text>
      <Text style={s.text}>مرحباً {clientName},</Text>
      <Text style={s.text}>
        وصلك عرض جديد على طلبك <strong>{rfqTitle}</strong> ({rfqNumber}).
      </Text>
      <Section style={s.ctaWrap}>
        <a href={proposalUrl} style={s.cta}>اعرض العرض ←</a>
      </Section>
      <Text style={s.text}>
        AI يقوم بتحليل العرض الآن. سيظهر التقييم خلال دقائق.
      </Text>
    </EmailLayout>
  );
}
```

---

## Step 3.4 — AI scoring

The scorer takes a proposal + its parent RFQ context, produces:
- A score 0–100
- A breakdown by criterion
- 1–2 sentence summary
- 2–4 strengths
- 2–4 concerns

### File: `lib/ai/score-proposal.ts`

> **AI SDK v6 note**: `generateObject` was removed in v6. Use `generateText` with `output: Output.object({ schema })` for structured outputs. Read the result from `result.output`.

```ts
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { gateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import ProposalScoredEmail from '@/lib/email/templates/proposal-scored';

const scoreSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall score 0–100. Anchor: 50 = average proposal that meets requirements; 80+ = standout.'),
  breakdown: z.object({
    price: z.number().min(0).max(100).describe('How well the price fits the budget and the scope. Lower price ≠ higher score automatically.'),
    scope_completeness: z.number().min(0).max(100).describe('How thoroughly the proposal covers what the RFQ asked for.'),
    delivery_realism: z.number().min(0).max(100).describe('Is the delivery timeline realistic for the scope?'),
    clarity: z.number().min(0).max(100).describe('Is the proposal specific and unambiguous, or vague?'),
    payment_terms: z.number().min(0).max(100).describe('Are payment terms reasonable for the buyer?'),
  }),
  summary: z.string().min(20).max(200).describe('1–2 sentence Arabic summary for the buyer.'),
  strengths: z.array(z.string()).min(1).max(4).describe('Concrete strengths in Arabic, each 5–15 words.'),
  concerns: z.array(z.string()).min(0).max(4).describe('Concrete concerns in Arabic, each 5–15 words. Empty if no real concerns.'),
});

export async function scoreProposal(proposalId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: proposal } = await admin
    .from('proposals')
    .select(`
      id, total_price, delivery_days, description, scope_of_work,
      payment_terms, warranty, valid_until,
      rfqs!inner(id, title, service_type, city, deadline, budget_min, budget_max, details, client_id)
    `)
    .eq('id', proposalId)
    .single();

  if (!proposal) {
    console.error('scoreProposal: proposal not found', proposalId);
    return;
  }

  const rfq = proposal.rfqs as any;

  const prompt = buildScoringPrompt(proposal, rfq);

  try {
    const result = await generateText({
      model: gateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: scoreSchema }),
      system: SCORING_SYSTEM,
      prompt,
      temperature: 0.2,
    });

    const object = result.output;

    await admin
      .from('proposals')
      .update({
        ai_score: object.score,
        ai_breakdown: object.breakdown,
        ai_summary: object.summary,
        ai_strengths: object.strengths,
        ai_concerns: object.concerns,
        ai_scored_at: new Date().toISOString(),
      })
      .eq('id', proposalId);

    // Notify supplier their proposal was scored
    const { data: supplierProfile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('id', proposal.id)
      .single();

    // (Wired more carefully — email supplier with their score; for MVP keep it light.)
  } catch (err) {
    console.error('AI scoring error:', err);
    // Mark scoring failed so we can retry later (Phase 7 cron)
    await admin
      .from('proposals')
      .update({ ai_summary: '[scoring failed — will retry]' })
      .eq('id', proposalId);
  }
}

const SCORING_SYSTEM = `أنت محلل عروض في منصة B2B سعودية للمعارض. تكتب التحليل بالعربية الفصحى الخفيفة (MSA-lite، احترافية وواضحة، ليست رسمية ولا عامية).

مهمتك: تقييم عرض مورد مقابل طلب عميل وإعطاء درجات منطقية للمشتري ليأخذ قراراً واعياً.

قواعد:
- لا تكافئ السعر المنخفض تلقائياً — السعر المنخفض جداً قد يعني نقصاً في النطاق.
- لا تعاقب السعر المرتفع تلقائياً — قد يعكس جودة أعلى أو نطاقاً أكمل.
- النقاط بالأرقام فقط (0–100). 50 = متوسط يلبي الحد الأدنى. 80+ = متميز.
- لا تختلق معلومات. إن كان نطاق العرض غير واضح، قُلها كـ concern.
- استخدم لغة محددة في الـ strengths والـ concerns. تجنّب "جيد" أو "ممتاز" — استخدم رقماً أو تفصيلاً.
- ضع 0 concerns إن لم يكن هناك أي شيء حقيقي. لا تختلق concerns لتظهر متوازناً.`;

function buildScoringPrompt(p: any, rfq: any): string {
  const budgetText = rfq.budget_min && rfq.budget_max
    ? `${rfq.budget_min}–${rfq.budget_max} ﷼`
    : 'غير محدد';

  return `## الطلب (RFQ)
- العنوان: ${rfq.title}
- نوع الخدمة: ${rfq.service_type}
- المدينة: ${rfq.city}
- آخر موعد للتسليم: ${new Date(rfq.deadline).toLocaleDateString('ar-SA')}
- الميزانية: ${budgetText}
- التفاصيل:
${JSON.stringify(rfq.details, null, 2)}

## العرض المقدّم
- السعر الإجمالي: ${p.total_price.toLocaleString('en')} ﷼
- مدة التنفيذ: ${p.delivery_days} يوم
- شروط الدفع: ${p.payment_terms ?? 'غير محدد'}
- الضمان: ${p.warranty ?? 'غير محدد'}
- الوصف:
${p.description}

- نطاق العمل:
${p.scope_of_work}

قيّم هذا العرض الآن.`;
}
```

### File: `lib/email/templates/proposal-scored.tsx`

```tsx
import { Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

export default function ProposalScoredEmail({
  supplierName, rfqNumber, score, summary, proposalUrl,
}: { supplierName: string; rfqNumber: string; score: number; summary: string; proposalUrl: string }) {
  return (
    <EmailLayout preview={`تم تقييم عرضك — درجة ${score}`}>
      <Text style={s.h1}>عرضك على {rfqNumber}</Text>
      <Text style={s.text}>مرحباً {supplierName},</Text>
      <Text style={s.text}>قمنا بتحليل عرضك. النتيجة: <strong>{score}/100</strong>.</Text>
      <Text style={s.text}>{summary}</Text>
      <div style={s.ctaWrap}>
        <a href={proposalUrl} style={s.cta}>اعرض التحليل الكامل ←</a>
      </div>
    </EmailLayout>
  );
}
```

---

## Step 3.5 — Submit Proposal wizard (supplier)

### File: `lib/stores/proposal-wizard-store.ts`

```ts
import { create } from 'zustand';
import type { UploadedFile } from '@/lib/storage/upload';

interface State {
  rfqId: string;
  totalPrice: string;
  deliveryDays: string;
  description: string;
  scopeOfWork: string;
  paymentTerms: string;
  warranty: string;
  validityDays: string;
  files: UploadedFile[];
  setField: <K extends keyof State>(k: K, v: State[K]) => void;
  reset: () => void;
}

const initial = {
  rfqId: '', totalPrice: '', deliveryDays: '', description: '',
  scopeOfWork: '', paymentTerms: '', warranty: '', validityDays: '14',
  files: [] as UploadedFile[],
};

export const useProposalWizardStore = create<State>((set) => ({
  ...initial,
  setField: (k, v) => set({ [k]: v } as never),
  reset: () => set(initial),
}));
```

### File: `app/[locale]/(supplier)/supplier/rfqs/[id]/propose/page.tsx`

```tsx
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ProposeWizard } from './propose-wizard';

export default async function ProposePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, status, deadline, budget_min, budget_max')
    .eq('id', id)
    .single();

  if (!rfq) notFound();
  if (rfq.status !== 'open' && rfq.status !== 'negotiating') {
    return (
      <div className="max-w-md mx-auto mt-12 text-center text-sm text-stone-600">
        هذا الطلب لم يعد يقبل عروضاً.
      </div>
    );
  }

  const { data: existing } = await supabase
    .from('proposals')
    .select('id')
    .eq('rfq_id', id)
    .eq('supplier_id', user.id)
    .maybeSingle();

  if (existing) redirect(`/supplier/proposals/${existing.id}`);

  return <ProposeWizard rfq={rfq} />;
}
```

### File: `app/[locale]/(supplier)/supplier/rfqs/[id]/propose/propose-wizard.tsx`

```tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useProposalWizardStore } from '@/lib/stores/proposal-wizard-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/ui/file-uploader';
import { submitProposalAction } from '@/app/actions/proposal';
import { proposalSchema } from '@/schemas/proposal';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const STEPS = [{ label: 'السعر' }, { label: 'النطاق' }, { label: 'المراجعة' }];

export function ProposeWizard({ rfq }: { rfq: any }) {
  const router = useRouter();
  const store = useProposalWizardStore();
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => { store.setField('rfqId', rfq.id); }, [rfq.id, store]);

  const goNext = () => {
    setErrors({});
    if (step === 1) {
      const r = proposalSchema.pick({ totalPrice: true, deliveryDays: true, validityDays: true })
        .safeParse({
          totalPrice: Number(store.totalPrice),
          deliveryDays: Number(store.deliveryDays),
          validityDays: Number(store.validityDays || 14),
        });
      if (!r.success) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.error.flatten().fieldErrors)) if (v?.[0]) f[k] = v[0];
        setErrors(f);
        return;
      }
    }
    if (step === 2) {
      const r = proposalSchema.pick({ description: true, scopeOfWork: true })
        .safeParse({ description: store.description, scopeOfWork: store.scopeOfWork });
      if (!r.success) {
        const f: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.error.flatten().fieldErrors)) if (v?.[0]) f[k] = v[0];
        setErrors(f);
        return;
      }
    }
    setStep(step + 1);
  };

  const onSubmit = () => {
    start(async () => {
      const res = await submitProposalAction({
        rfqId: rfq.id,
        totalPrice: Number(store.totalPrice),
        deliveryDays: Number(store.deliveryDays),
        description: store.description,
        scopeOfWork: store.scopeOfWork,
        paymentTerms: store.paymentTerms || undefined,
        warranty: store.warranty || undefined,
        validityDays: Number(store.validityDays || 14),
        files: store.files,
      });
      if (!res.ok) { setGlobalError(res.error); return; }
      store.reset();
      router.push(`/supplier/proposals/${res.data!.id}`);
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WizardStepper steps={STEPS} currentStep={step} />

      <div>
        <h1 className="text-xl font-semibold text-midnight-green">عرض على {rfq.rfq_number}</h1>
        <p className="text-sm text-stone-600 mt-1">{rfq.title}</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <FormField
            label="السعر الإجمالي (﷼ شامل ضريبتك إن وُجدت)"
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={store.totalPrice}
            onChange={(e) => store.setField('totalPrice', e.target.value)}
            placeholder="87500"
            hint={
              rfq.budget_min && rfq.budget_max
                ? `ميزانية العميل: ${formatCurrency(rfq.budget_min)}–${formatCurrency(rfq.budget_max)}`
                : 'العميل لم يحدد ميزانية'
            }
            required
            error={errors.totalPrice}
          />
          <FormField
            label="مدة التنفيذ (بالأيام)"
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={store.deliveryDays}
            onChange={(e) => store.setField('deliveryDays', e.target.value)}
            placeholder="14"
            hint={`آخر موعد للعميل: ${formatDate(rfq.deadline, 'ar')}`}
            required
            error={errors.deliveryDays}
          />
          <FormField
            label="صلاحية العرض (بالأيام)"
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={store.validityDays}
            onChange={(e) => store.setField('validityDays', e.target.value)}
            placeholder="14"
            hint="بعد هذه المدة، يحق لك تعديل السعر."
            error={errors.validityDays}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-charcoal">وصف مختصر للعرض</label>
            <textarea
              value={store.description}
              onChange={(e) => store.setField('description', e.target.value)}
              rows={3}
              placeholder="اكتب فقرة قصيرة تشرح فيها ما تقترحه — لماذا أنت الخيار المناسب."
              className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
            />
            {errors.description && <p className="text-xs text-danger">{errors.description}</p>}
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-charcoal">نطاق العمل التفصيلي</label>
            <textarea
              value={store.scopeOfWork}
              onChange={(e) => store.setField('scopeOfWork', e.target.value)}
              rows={8}
              placeholder="عدّد ما يشمله العرض بالتفصيل (المراحل، المواد، التسليمات). كلما كنت محدداً كلما زادت ثقة العميل."
              className="w-full px-3 py-2 rounded-md bg-cream border border-stone-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
            />
            {errors.scopeOfWork && <p className="text-xs text-danger">{errors.scopeOfWork}</p>}
          </div>
          <FormField
            label="شروط الدفع (اختياري)"
            value={store.paymentTerms}
            onChange={(e) => store.setField('paymentTerms', e.target.value)}
            placeholder="مثال: 50% مقدم، 50% بعد التسليم"
          />
          <FormField
            label="الضمان (اختياري)"
            value={store.warranty}
            onChange={(e) => store.setField('warranty', e.target.value)}
            placeholder="مثال: 6 أشهر على الجناح"
          />
          <FileUploader
            bucket="proposal-files"
            pathPrefix={`proposal-${rfq.id}-${Date.now()}`}
            files={store.files}
            onChange={(f) => store.setField('files', f)}
            label="مرفقات (اختياري)"
            maxFiles={5}
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-stone-100 rounded-xl p-4 text-sm space-y-2">
            <Row label="السعر" value={`${formatCurrency(Number(store.totalPrice))}`} dir="ltr" />
            <Row label="مدة التنفيذ" value={`${store.deliveryDays} يوم`} />
            <Row label="صلاحية العرض" value={`${store.validityDays} يوم`} />
            <Row label="المرفقات" value={`${store.files.length} ملف`} />
          </div>
          <details className="bg-stone-100 rounded-xl p-4">
            <summary className="cursor-pointer text-sm font-semibold">عرض الوصف الكامل</summary>
            <div className="mt-3 text-sm whitespace-pre-line">{store.description}</div>
            <div className="mt-3 text-sm whitespace-pre-line text-stone-600 border-t border-stone-300 pt-3">
              <strong>نطاق العمل:</strong>
              <br />
              {store.scopeOfWork}
            </div>
          </details>
          <p className="text-xs text-stone-600 bg-warning-100 p-3 rounded-md border border-warning/30">
            بمجرد التقديم، لا يمكنك تعديل العرض. يمكنك سحبه فقط.
          </p>
        </div>
      )}

      {globalError && <p className="text-sm text-danger" role="alert">{globalError}</p>}

      <div className="flex gap-2">
        {step > 1 && (
          <Button variant="secondary" size="lg" className="flex-1" onClick={() => setStep(step - 1)} disabled={pending}>
            ← السابق
          </Button>
        )}
        {step < 3 ? (
          <Button variant="brand" size="lg" className="flex-1" onClick={goNext}>التالي ←</Button>
        ) : (
          <Button variant="brand" size="lg" className="flex-1" onClick={onSubmit} disabled={pending}>
            {pending ? 'جارٍ الإرسال…' : 'أرسل العرض'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone-600">{label}</span>
      <span className="font-medium text-charcoal text-end" dir={dir}>{value}</span>
    </div>
  );
}
```

### Update Phase 2's `app/[locale]/(supplier)/supplier/rfqs/[id]/page.tsx`

Replace the disabled button with:

```tsx
<Button asChild variant="brand">
  <Link href={`/supplier/rfqs/${rfq.id}/propose`}>قدّم عرضك</Link>
</Button>
```

---

## Step 3.6 — Supplier's proposals list + details

### File: `app/[locale]/(supplier)/supplier/proposals/page.tsx`

```tsx
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { formatCurrency, formatDate } from '@/lib/utils/format';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'قيد المراجعة',
  shortlisted: 'في القائمة المختصرة',
  rejected: 'لم يُختر',
  accepted: 'تم قبوله',
  withdrawn: 'مسحوب',
};

export default async function MyProposalsPage() {
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      id, total_price, delivery_days, status, ai_score, submitted_at,
      rfqs!inner(rfq_number, title, service_type, city, status)
    `)
    .eq('supplier_id', user.id)
    .order('submitted_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">عروضي</h1>
      {!proposals || proposals.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center space-y-3">
          <FileText className="size-10 text-stone-600 mx-auto" />
          <h2 className="font-semibold">لم تقدّم أي عرض بعد</h2>
          <Link href="/supplier/rfqs" className="text-action-blue text-sm hover:underline">
            تصفّح الطلبات المتاحة ←
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p: any) => (
            <Link
              key={p.id}
              href={`/supplier/proposals/${p.id}`}
              className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-4 border border-stone-300"
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="font-mono num">{p.rfqs.rfq_number}</span>
                    <span>·</span>
                    <span>{p.rfqs.service_type}</span>
                  </div>
                  <h3 className="font-semibold text-charcoal">{p.rfqs.title}</h3>
                  <div className="text-xs text-stone-600">
                    قُدّم في {formatDate(p.submitted_at, 'ar')} ·{' '}
                    <span className="num" dir="ltr">{formatCurrency(p.total_price)}</span> · {p.delivery_days} يوم
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs shrink-0">
                  <span className="px-2 py-1 rounded-full bg-cream border border-stone-300 whitespace-nowrap">
                    {STATUS_LABELS[p.status] ?? p.status}
                  </span>
                  {p.ai_score != null && (
                    <span className="px-2 py-1 rounded-full bg-action-blue/10 text-action-blue border border-action-blue/30 whitespace-nowrap">
                      AI: <span className="num">{Math.round(p.ai_score)}/100</span>
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/[locale]/(supplier)/supplier/proposals/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default async function MyProposalDetailsPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: p } = await supabase
    .from('proposals')
    .select(`
      *,
      rfqs!inner(id, rfq_number, title, service_type)
    `)
    .eq('id', id)
    .eq('supplier_id', user.id)
    .single();

  if (!p) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/supplier/proposals">
          <ArrowRight className="size-4 rotate-180" /> العودة لعروضي
        </Link>
      </Button>
      <div>
        <p className="text-xs text-stone-600 font-mono num">{p.rfqs.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">{p.rfqs.title}</h1>
      </div>

      {/* AI score card */}
      {p.ai_score != null && (
        <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-dune-gold" />
            <h2 className="font-semibold text-action-blue">تحليل AI</h2>
            <span className="ms-auto text-2xl font-bold text-action-blue num">{Math.round(p.ai_score)}</span>
          </div>
          <p className="text-sm">{p.ai_summary}</p>
          {p.ai_strengths?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-success mb-1">نقاط القوة</h3>
              <ul className="text-sm list-disc list-inside space-y-1">
                {p.ai_strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {p.ai_concerns?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-warning mb-1">ملاحظات</h3>
              <ul className="text-sm list-disc list-inside space-y-1">
                {p.ai_concerns.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-stone-100 rounded-xl p-4 space-y-2 text-sm">
        <Row label="السعر الإجمالي" value={formatCurrency(p.total_price)} dir="ltr" />
        <Row label="مدة التنفيذ" value={`${p.delivery_days} يوم`} />
        <Row label="صلاحية العرض" value={formatDate(p.valid_until, 'ar')} />
        <Row label="الحالة" value={p.status} />
      </div>

      <div className="bg-stone-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">الوصف</h2>
        <p className="text-sm whitespace-pre-line">{p.description}</p>
        <h3 className="font-semibold pt-2 border-t border-stone-300">نطاق العمل</h3>
        <p className="text-sm whitespace-pre-line">{p.scope_of_work}</p>
      </div>
    </div>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-stone-300/40 last:border-0">
      <span className="text-stone-600">{label}</span>
      <span className="font-medium text-charcoal text-end" dir={dir}>{value}</span>
    </div>
  );
}
```

---

## Step 3.7 — Client compare view

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/proposals/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { generateAiRecommendation } from '@/lib/ai/recommend';
import { formatCurrency } from '@/lib/utils/format';

export default async function CompareProposalsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, status, deadline')
    .eq('id', id)
    .eq('client_id', user.id)
    .single();
  if (!rfq) notFound();

  const { data: proposals } = await supabase
    .from('proposals')
    .select(`
      id, total_price, delivery_days, status, ai_score, ai_summary, submitted_at,
      suppliers!inner(id, rating_avg, total_reviews, total_completed_projects),
      profiles:suppliers!inner(profiles!inner(full_name)),
      companies!inner(name, city, logo_url)
    `)
    .eq('rfq_id', id)
    .neq('status', 'withdrawn')
    .order('ai_score', { ascending: false, nullsFirst: false });

  const recommendation = (proposals && proposals.length >= 2)
    ? await generateAiRecommendation(rfq.id)
    : null;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/rfqs/${rfq.id}`}>
          <ArrowRight className="size-4 rotate-180" /> العودة للطلب
        </Link>
      </Button>

      <div>
        <p className="text-xs text-stone-600 font-mono num">{rfq.rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">العروض المُقدّمة ({proposals?.length ?? 0})</h1>
      </div>

      {recommendation && (
        <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-dune-gold" />
            <h2 className="font-semibold text-action-blue">توصية AI</h2>
          </div>
          <p className="text-sm">{recommendation}</p>
          <p className="text-xs text-stone-600">
            توصية مبنية على تحليل آلي. القرار النهائي قرارك.
          </p>
        </div>
      )}

      {!proposals || proposals.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center text-sm text-stone-600">
          لم تصل عروض بعد. سنشعرك فور وصول أول عرض.
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p: any) => (
            <Link
              key={p.id}
              href={`/dashboard/rfqs/${rfq.id}/proposals/${p.id}`}
              className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-4 border border-stone-300"
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-2 min-w-0 flex-1">
                  <h3 className="font-semibold text-charcoal">{p.companies.name}</h3>
                  <p className="text-xs text-stone-600">
                    ⭐ <span className="num">{(p.suppliers.rating_avg ?? 0).toFixed(1)}</span>{' '}
                    ({p.suppliers.total_reviews}) · {p.suppliers.total_completed_projects} مشروع
                  </p>
                  {p.ai_summary && <p className="text-sm text-stone-600 line-clamp-2">{p.ai_summary}</p>}
                </div>
                <div className="text-end space-y-1 shrink-0">
                  <div className="text-lg font-bold num text-midnight-green" dir="ltr">
                    {formatCurrency(p.total_price)}
                  </div>
                  <div className="text-xs text-stone-600">{p.delivery_days} يوم</div>
                  {p.ai_score != null && (
                    <div className="inline-block px-2 py-0.5 rounded-full bg-action-blue/10 text-action-blue text-xs">
                      AI: <span className="num">{Math.round(p.ai_score)}/100</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `lib/ai/recommend.ts`

```ts
import { generateText } from 'ai';
import { gateway, RECOMMENDATION_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';

export async function generateAiRecommendation(rfqId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: rfq } = await admin
    .from('rfqs')
    .select('title, service_type, budget_min, budget_max, deadline, details')
    .eq('id', rfqId)
    .single();
  if (!rfq) return null;

  const { data: proposals } = await admin
    .from('proposals')
    .select(`
      id, total_price, delivery_days, ai_score, ai_summary, ai_strengths, ai_concerns,
      companies!inner(name)
    `)
    .eq('rfq_id', rfqId)
    .neq('status', 'withdrawn')
    .not('ai_score', 'is', null)
    .order('ai_score', { ascending: false });

  if (!proposals || proposals.length < 2) return null;

  const top = proposals.slice(0, 5).map((p: any) => ({
    name: p.companies.name,
    price: p.total_price,
    days: p.delivery_days,
    score: p.ai_score,
    summary: p.ai_summary,
    strengths: p.ai_strengths,
    concerns: p.ai_concerns,
  }));

  try {
    const { text } = await generateText({
      model: gateway(RECOMMENDATION_MODEL),
      system: `أنت مستشار شراء B2B. تكتب توصية عربية موجزة (3-5 جمل) للمشتري لمساعدته على المقارنة بين العروض.
لا تختار له فائزاً نهائياً — وضّح المفاضلة (السعر مقابل الجودة، السرعة مقابل النطاق).
استخدم أسماء الشركات. لغة مهنية محددة، لا "ممتاز" ولا "رائع".`,
      prompt: `العروض المُقدّمة:\n${JSON.stringify(top, null, 2)}\n\nاكتب توصيتك.`,
      temperature: 0.4,
    });
    return text.trim();
  } catch (e) {
    console.error('recommendation error:', e);
    return null;
  }
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/proposals/[proposalId]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils/format';

export default async function SingleProposalPage({
  params,
}: {
  params: Promise<{ id: string; proposalId: string }>;
}) {
  const { id, proposalId } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: p } = await supabase
    .from('proposals')
    .select(`
      *,
      rfqs!inner(id, rfq_number, title, client_id),
      companies!inner(name, city),
      suppliers!inner(id, rating_avg, total_reviews, total_completed_projects)
    `)
    .eq('id', proposalId)
    .eq('rfq_id', id)
    .single();

  if (!p || (p.rfqs as any).client_id !== user.id) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/dashboard/rfqs/${id}/proposals`}>
          <ArrowRight className="size-4 rotate-180" /> العودة للمقارنة
        </Link>
      </Button>

      <div className="space-y-1">
        <p className="text-xs text-stone-600 font-mono num">{(p.rfqs as any).rfq_number}</p>
        <h1 className="text-2xl font-bold text-midnight-green">{(p.companies as any).name}</h1>
        <p className="text-xs text-stone-600">
          ⭐ <span className="num">{((p.suppliers as any).rating_avg ?? 0).toFixed(1)}</span>{' '}
          ({(p.suppliers as any).total_reviews}) · {(p.suppliers as any).total_completed_projects} مشروع
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat label="السعر" value={formatCurrency(p.total_price)} dir="ltr" />
        <Stat label="مدة التنفيذ" value={`${p.delivery_days} يوم`} />
        <Stat label="صالح حتى" value={formatDate(p.valid_until, 'ar')} />
      </div>

      {p.ai_score != null && (
        <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-dune-gold" />
            <h2 className="font-semibold text-action-blue">تحليل AI — درجة <span className="num">{Math.round(p.ai_score)}</span></h2>
          </div>
          <p className="text-sm">{p.ai_summary}</p>
          {p.ai_breakdown && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(p.ai_breakdown).map(([key, value]) => (
                <div key={key} className="text-xs bg-cream rounded p-2 text-center">
                  <div className="num font-bold text-midnight-green">{Math.round(Number(value))}</div>
                  <div className="text-stone-600 text-[10px] mt-0.5">{key}</div>
                </div>
              ))}
            </div>
          )}
          {p.ai_strengths?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-success mb-1">القوة</h3>
              <ul className="text-sm list-disc list-inside space-y-1">
                {p.ai_strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {p.ai_concerns?.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-warning mb-1">انتبه إلى</h3>
              <ul className="text-sm list-disc list-inside space-y-1">
                {p.ai_concerns.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-stone-100 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold">الوصف</h2>
        <p className="text-sm whitespace-pre-line">{p.description}</p>
        <h3 className="font-semibold pt-2 border-t border-stone-300">نطاق العمل</h3>
        <p className="text-sm whitespace-pre-line">{p.scope_of_work}</p>
        {p.payment_terms && <p className="text-sm"><strong>شروط الدفع:</strong> {p.payment_terms}</p>}
        {p.warranty && <p className="text-sm"><strong>الضمان:</strong> {p.warranty}</p>}
      </div>

      {/* Action buttons — Phase 4 wires shortlist + chat; Phase 5 wires award */}
      <div className="flex gap-2">
        <Button variant="brand" disabled>أضف للقائمة المختصرة (Phase 4)</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="bg-stone-100 rounded-xl p-3">
      <div className="text-xs text-stone-600">{label}</div>
      <div className="text-sm font-semibold mt-1" dir={dir}>{value}</div>
    </div>
  );
}
```

---

## Step 3.8 — Tests

### File: `tests/unit/ai/score-proposal.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// We test the schema shape — actual AI calls are integration tests.
const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    price: z.number().min(0).max(100),
    scope_completeness: z.number().min(0).max(100),
    delivery_realism: z.number().min(0).max(100),
    clarity: z.number().min(0).max(100),
    payment_terms: z.number().min(0).max(100),
  }),
  summary: z.string().min(20).max(200),
  strengths: z.array(z.string()).min(1).max(4),
  concerns: z.array(z.string()).min(0).max(4),
});

describe('AI score schema', () => {
  it('rejects score above 100', () => {
    const r = scoreSchema.safeParse({
      score: 105,
      breakdown: { price: 80, scope_completeness: 80, delivery_realism: 80, clarity: 80, payment_terms: 80 },
      summary: 'a'.repeat(50), strengths: ['x'], concerns: [],
    });
    expect(r.success).toBe(false);
  });
  it('accepts a well-formed scoring object', () => {
    const r = scoreSchema.safeParse({
      score: 85,
      breakdown: { price: 80, scope_completeness: 90, delivery_realism: 85, clarity: 85, payment_terms: 80 },
      summary: 'عرض متوازن بسعر معقول وزمن تسليم مناسب لحجم المشروع.',
      strengths: ['تفاصيل واضحة في نطاق العمل', 'سعر تحت الميزانية بـ 12%'],
      concerns: ['شروط الدفع غير محددة'],
    });
    expect(r.success).toBe(true);
  });
  it('allows empty concerns array', () => {
    const r = scoreSchema.safeParse({
      score: 90,
      breakdown: { price: 90, scope_completeness: 90, delivery_realism: 90, clarity: 90, payment_terms: 90 },
      summary: 'عرض ممتاز يلبي كل المتطلبات بسعر تنافسي ومدة معقولة.',
      strengths: ['جودة مرتفعة'],
      concerns: [],
    });
    expect(r.success).toBe(true);
  });
});
```

### File: `tests/integration/proposal-flow.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe.skipIf(!process.env.RUN_INTEGRATION)('proposal insertion + uniqueness', () => {
  it('a supplier cannot submit two proposals on the same RFQ', async () => {
    // Setup: client + supplier + rfq
    const ts = Date.now();
    const { data: clientUser } = await admin.auth.admin.createUser({
      email: `client-${ts}@test.local`, password: 'longenough1', email_confirm: true,
    });
    const { data: supplierUser } = await admin.auth.admin.createUser({
      email: `supplier-${ts}@test.local`, password: 'longenough1', email_confirm: true,
    });

    const { data: c1 } = await admin.from('companies').insert({
      name: 'Client Co', cr_number: '1010' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: clientUser.user!.id,
    }).select('id').single();

    const { data: c2 } = await admin.from('companies').insert({
      name: 'Supp Co', cr_number: '2020' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: supplierUser.user!.id,
    }).select('id').single();

    await admin.from('profiles').insert([
      { id: clientUser.user!.id, email: clientUser.user!.email!, full_name: 'C', role: 'client', company_id: c1!.id },
      { id: supplierUser.user!.id, email: supplierUser.user!.email!, full_name: 'S', role: 'supplier', company_id: c2!.id },
    ]);

    await admin.from('suppliers').insert({
      id: supplierUser.user!.id, company_id: c2!.id,
      specializations: ['booth'], cities: ['riyadh'],
      bank_name: 'Test', iban: 'SA0380000000608010167519', account_holder: 'S',
      status: 'approved',
    });

    const { data: rfq } = await admin.from('rfqs').insert({
      client_id: clientUser.user!.id, company_id: c1!.id,
      service_type: 'booth', title: 'Test', city: 'riyadh',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { area: 36, exhibitionName: 'X', floors: '1' },
      status: 'open',
    }).select('id').single();

    const proposalPayload = {
      rfq_id: rfq!.id, supplier_id: supplierUser.user!.id, company_id: c2!.id,
      total_price: 80000, delivery_days: 14,
      description: 'desc', scope_of_work: 'scope',
      valid_until: new Date(Date.now() + 14 * 86400000).toISOString(),
      status: 'submitted',
    };

    const { error: e1 } = await admin.from('proposals').insert(proposalPayload);
    expect(e1).toBeNull();

    const { error: e2 } = await admin.from('proposals').insert(proposalPayload);
    expect(e2).not.toBeNull();
    expect(e2?.code).toBe('23505'); // unique violation

    // Cleanup
    await admin.from('proposals').delete().eq('rfq_id', rfq!.id);
    await admin.from('rfqs').delete().eq('id', rfq!.id);
    await admin.from('suppliers').delete().eq('id', supplierUser.user!.id);
    await admin.from('profiles').delete().in('id', [clientUser.user!.id, supplierUser.user!.id]);
    await admin.from('companies').delete().in('id', [c1!.id, c2!.id]);
    await admin.auth.admin.deleteUser(clientUser.user!.id);
    await admin.auth.admin.deleteUser(supplierUser.user!.id);
  });
});
```

### File: `tests/integration/ai-score.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { scoreProposal } from '@/lib/ai/score-proposal';

describe.skipIf(!process.env.RUN_AI_INTEGRATION)('AI scoring (live API call)', () => {
  it('produces a valid score for a seeded proposal', async () => {
    const proposalId = process.env.TEST_PROPOSAL_ID;
    if (!proposalId) throw new Error('Set TEST_PROPOSAL_ID env var');
    await scoreProposal(proposalId);
    // Read back and assert
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const admin = createAdminClient();
    const { data } = await admin.from('proposals').select('ai_score, ai_summary').eq('id', proposalId).single();
    expect(data?.ai_score).toBeGreaterThanOrEqual(0);
    expect(data?.ai_score).toBeLessThanOrEqual(100);
    expect(data?.ai_summary?.length).toBeGreaterThan(20);
  }, 30_000);
});
```

Run with `RUN_AI_INTEGRATION=1 TEST_PROPOSAL_ID=xxx pnpm test:integration`.

---

## Step 3.9 — Acceptance checklist

- [ ] Approved supplier can open `/ar/supplier/rfqs/[id]/propose` and complete the 3-step wizard
- [ ] After submit, proposal row exists with `status='submitted'`
- [ ] Within ~30s, `ai_score`, `ai_breakdown`, `ai_summary`, `ai_strengths`, `ai_concerns` populated
- [ ] Client receives in-app notification + email
- [ ] RFQ status moves from `open` → `negotiating` after first proposal
- [ ] Submitting two proposals on same RFQ as same supplier → friendly error
- [ ] `/ar/supplier/proposals` lists supplier's submissions with AI score badge
- [ ] `/ar/supplier/proposals/[id]` shows full AI analysis card
- [ ] `/ar/dashboard/rfqs/[id]/proposals` shows compare view sorted by AI score
- [ ] When ≥2 scored proposals exist, an AI recommendation paragraph appears
- [ ] `/ar/dashboard/rfqs/[id]/proposals/[proposalId]` shows breakdown bars + strengths/concerns
- [ ] Single proposal AI scoring runs even when `RESEND_API_KEY` is missing (silent skip on email)
- [ ] If AI Gateway returns an error, proposal is still saved with `ai_summary='[scoring failed — will retry]'`
- [ ] `pnpm tsc --noEmit` and `pnpm build` pass
- [ ] All previous test suites still pass + new tests added in this phase

---

## Files created in Phase 3 (summary)

```
app/actions/proposal.ts
app/[locale]/(supplier)/supplier/rfqs/[id]/propose/page.tsx
app/[locale]/(supplier)/supplier/rfqs/[id]/propose/propose-wizard.tsx
app/[locale]/(supplier)/supplier/proposals/page.tsx
app/[locale]/(supplier)/supplier/proposals/[id]/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/proposals/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/proposals/[proposalId]/page.tsx
lib/ai/gateway.ts
lib/ai/score-proposal.ts
lib/ai/recommend.ts
lib/email/templates/proposal-received.tsx
lib/email/templates/proposal-scored.tsx
lib/stores/proposal-wizard-store.ts
supabase/migrations/20260601000001_proposal_ai_fields.sql
tests/unit/ai/score-proposal.test.ts
tests/integration/proposal-flow.test.ts
tests/integration/ai-score.test.ts
```

**Lines of code (estimate)**: ~1,800 implementation, ~250 tests.

**End of Phase 3.** Suppliers submit proposals, AI scores them, clients compare side-by-side with an AI recommendation. Phase 4 adds real-time chat so the client can negotiate directly with the top suppliers.
