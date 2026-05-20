'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { safeAfter } from '@/lib/utils/safe-after';
import { createAdminClient } from '@/lib/supabase/admin';
import { proposalSchema } from '@/schemas/proposal';
import { scoreProposal } from '@/lib/ai/score-proposal';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { recordAudit } from '@/lib/audit/record';
import { maybeFireMilestone } from '@/lib/milestones/triggers';
import type { ActionResult } from './auth';

export async function submitProposalAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const rfqId = String(formData.get('rfqId') ?? '');
  if (!rfqId) return { ok: false, error: 'لم نحدد الطلب المطلوب.' };

  const parsed = proposalSchema.safeParse({
    totalPrice: Number(formData.get('totalPrice')),
    deliveryDays: Number(formData.get('deliveryDays')),
    description: formData.get('description'),
    scopeOfWork: formData.get('scopeOfWork'),
    excludedItems: formData.get('excludedItems') || undefined,
    paymentTerms: formData.get('paymentTerms'),
    validityDays: formData.get('validityDays')
      ? Number(formData.get('validityDays'))
      : 14,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'تأكد من تعبئة جميع حقول العرض.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Look up the supplier id (RLS-friendly)
  const { data: supplierRowRaw } = await supabase
    .from('suppliers')
    .select('id, status, company_name, average_rating, total_completed_orders, years_of_experience')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRowRaw as
    | {
        id: string;
        status: string;
        company_name: string;
        average_rating: number | null;
        total_completed_orders: number | null;
        years_of_experience: number | null;
      }
    | null;
  if (!supplier) return { ok: false, error: 'الحساب غير مفعّل كمورد.' };
  if (supplier.status !== 'approved') {
    return { ok: false, error: 'حسابك قيد المراجعة. لا يمكنك تقديم العروض الآن.' };
  }

  const admin = createAdminClient();

  const { data: proposalRaw, error: proposalError } = await admin
    .from('proposals')
    .insert({
      rfq_id: rfqId,
      supplier_id: supplier.id,
      total_price: parsed.data.totalPrice,
      delivery_days: parsed.data.deliveryDays,
      description: parsed.data.description,
      scope_of_work: parsed.data.scopeOfWork,
      excluded_items: parsed.data.excludedItems ?? null,
      payment_terms: parsed.data.paymentTerms,
      validity_days: parsed.data.validityDays,
      status: 'submitted',
    })
    .select('id')
    .single();
  const proposal = proposalRaw as { id: string } | null;

  if (proposalError || !proposal) {
    const friendly = mapPostgresError(proposalError, 'حفظ العرض');
    return { ok: false, error: friendly.messageAr };
  }

  // Pull RFQ context for scoring + milestone fanout. Admin client bypasses
  // RLS — supplier wouldn't see client_id normally, but it's needed here so
  // the milestone trigger can credit the RFQ owner with their first received
  // proposal.
  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('client_id, title, service_type, budget_min, budget_max, proposals_deadline, details')
    .eq('id', rfqId)
    .single();
  const rfq = rfqRaw as
    | {
        client_id: string;
        title: string;
        service_type: string;
        budget_min: number | null;
        budget_max: number | null;
        proposals_deadline: string | null;
        details: Record<string, unknown>;
      }
    | null;

  if (rfq) {
    safeAfter('ai_score_proposal', () =>
      scoreProposal({
        proposalId: proposal.id,
        // V1.1 — bill the supplier whose submission triggered the call.
        userId: user.id,
        rfq: {
          title: rfq.title,
          serviceType: rfq.service_type,
          budgetMin: rfq.budget_min,
          budgetMax: rfq.budget_max,
          deadline: rfq.proposals_deadline,
          details: rfq.details,
        },
        proposal: {
          totalPrice: parsed.data.totalPrice,
          deliveryDays: parsed.data.deliveryDays,
          description: parsed.data.description,
          scopeOfWork: parsed.data.scopeOfWork,
          paymentTerms: parsed.data.paymentTerms,
        },
        supplier: {
          companyName: supplier.company_name,
          averageRating: supplier.average_rating,
          completedOrders: supplier.total_completed_orders,
          yearsOfExperience: supplier.years_of_experience,
        },
      })
    , { proposal_id: proposal.id, rfq_id: rfqId });

    // V2.1 — celebrate the RFQ owner's first received proposal. Idempotent
    // via UNIQUE(user_id, milestone_type); silent on subsequent proposals.
    safeAfter(
      'milestone_first_proposal_received',
      () => maybeFireMilestone(rfq.client_id, 'first_proposal_received'),
      { user_id: rfq.client_id, rfq_id: rfqId }
    );
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'supplier',
    action: 'proposal_submitted',
    resourceType: 'proposal',
    resourceId: proposal.id,
    metadata: { rfq_id: rfqId },
  });

  revalidatePath(`/dashboard/rfqs/${rfqId}/compare`);
  revalidatePath('/supplier/proposals');
  return { ok: true, data: { proposalId: proposal.id, rfqId } };
}
