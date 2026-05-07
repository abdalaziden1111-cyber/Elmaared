'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reviewSchema } from '@/schemas/review';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { recordAudit } from '@/lib/audit/record';
import { requireRole } from '@/lib/auth/require-role';
import type { ActionResult } from './auth';

export async function submitReviewAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const rfqId = String(formData.get('rfqId') ?? '');
  const parsed = reviewSchema.safeParse({
    ratingOverall: Number(formData.get('ratingOverall')),
    ratingQuality: formData.get('ratingQuality') ? Number(formData.get('ratingQuality')) : undefined,
    ratingTimeliness: formData.get('ratingTimeliness') ? Number(formData.get('ratingTimeliness')) : undefined,
    ratingCommunication: formData.get('ratingCommunication') ? Number(formData.get('ratingCommunication')) : undefined,
    ratingFlexibility: formData.get('ratingFlexibility') ? Number(formData.get('ratingFlexibility')) : undefined,
    ratingPriceValue: formData.get('ratingPriceValue') ? Number(formData.get('ratingPriceValue')) : undefined,
    comment: formData.get('comment') || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'تأكد من اختيار التقييمات.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, client_id, status, winning_proposal_id')
    .eq('id', rfqId)
    .single();
  const rfq = rfqRowRaw as
    | { id: string; client_id: string; status: string; winning_proposal_id: string | null }
    | null;
  if (!rfq || rfq.client_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الطلب.' };
  }
  if (rfq.status !== 'completed') {
    return { ok: false, error: 'لا يمكن التقييم قبل اكتمال المشروع.' };
  }

  const { data: propRowRaw } = await admin
    .from('proposals')
    .select('id, supplier_id')
    .eq('id', rfq.winning_proposal_id ?? '')
    .single();
  const prop = propRowRaw as { id: string; supplier_id: string } | null;
  if (!prop) return { ok: false, error: 'لم نجد العرض الفائز.' };

  const { error } = await admin.from('reviews').insert({
    rfq_id: rfqId,
    client_id: user.id,
    supplier_id: prop.supplier_id,
    rating_overall: parsed.data.ratingOverall,
    rating_quality: parsed.data.ratingQuality,
    rating_timeliness: parsed.data.ratingTimeliness,
    rating_communication: parsed.data.ratingCommunication,
    rating_flexibility: parsed.data.ratingFlexibility,
    rating_price_value: parsed.data.ratingPriceValue,
    comment: parsed.data.comment ?? null,
  });

  if (error) {
    const friendly = mapPostgresError(error, 'حفظ التقييم');
    return { ok: false, error: friendly.messageAr };
  }

  revalidatePath(`/dashboard/rfqs/${rfqId}`);
  revalidatePath(`/discover/${prop.supplier_id}`);
  return { ok: true };
}

export async function openDisputeAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const rfqId = String(formData.get('rfqId') ?? '');
  const category = String(formData.get('category') ?? '');
  const description = String(formData.get('description') ?? '').trim();

  if (!category || description.length < 30) {
    return { ok: false, error: 'الفئة وصف بمدى 30 حرف على الأقل مطلوبان.' };
  }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: 'client' | 'supplier' | 'admin' } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي.' };

  const admin = createAdminClient();
  await admin.from('disputes').insert({
    rfq_id: rfqId,
    raised_by: user.id,
    raised_by_role: profile.role,
    category,
    description,
    status: 'open',
  });

  await admin.from('rfqs').update({ status: 'disputed' }).eq('id', rfqId);

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: profile.role,
    action: 'dispute_opened',
    resourceType: 'rfq',
    resourceId: rfqId,
    metadata: { category },
  });

  revalidatePath('/admin/disputes');
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ADMIN: RESOLVE DISPUTE
// ───────────────────────────────────────────────────────────
export interface ResolveDisputeInput {
  disputeId: string;
  resolution: string;
  inFavorOf: 'client' | 'supplier' | 'shared';
  refundDecision?: number | null;
  resumeRfqStatus: 'in_progress' | 'completed' | 'cancelled';
}

export async function adminResolveDisputeAction(
  args: ResolveDisputeInput
): Promise<ActionResult> {
  const { user } = await requireRole(['admin']);

  if (!args.disputeId) {
    return { ok: false, error: 'معرّف النزاع مطلوب.' };
  }
  if (!args.resolution || args.resolution.trim().length < 20) {
    return {
      ok: false,
      error: 'القرار يجب أن يكون 20 حرفاً على الأقل.',
    };
  }
  if (
    args.refundDecision != null &&
    (!Number.isFinite(args.refundDecision) || args.refundDecision < 0)
  ) {
    return { ok: false, error: 'مبلغ الاسترداد غير صالح.' };
  }

  const admin = createAdminClient();

  const { data: disputeRowRaw } = await admin
    .from('disputes')
    .select('id, rfq_id, status')
    .eq('id', args.disputeId)
    .single();
  const dispute = disputeRowRaw as
    | { id: string; rfq_id: string; status: string }
    | null;
  if (!dispute) return { ok: false, error: 'لم نجد النزاع.' };
  if (dispute.status !== 'open') {
    return { ok: false, error: 'النزاع تم إغلاقه بالفعل.' };
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from('disputes')
    .update({
      status: 'resolved',
      resolution: args.resolution.trim(),
      resolution_in_favor_of: args.inFavorOf,
      refund_decision: args.refundDecision ?? null,
      resolved_at: now,
      resolved_by: user.id,
    })
    .eq('id', args.disputeId);
  if (updateErr) {
    const friendly = mapPostgresError(updateErr, 'حفظ قرار النزاع');
    return { ok: false, error: friendly.messageAr };
  }

  // Restore the RFQ to a workable status. The state machine validates
  // the target — invalid combos (e.g. dispute → open) are rejected.
  await admin
    .from('rfqs')
    .update({ status: args.resumeRfqStatus })
    .eq('id', dispute.rfq_id);

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'dispute_resolved',
    resourceType: 'dispute',
    resourceId: args.disputeId,
    metadata: {
      in_favor_of: args.inFavorOf,
      refund: args.refundDecision ?? 0,
      rfq_status: args.resumeRfqStatus,
    },
  });

  revalidatePath('/admin/disputes');
  revalidatePath(`/admin/disputes/${args.disputeId}`);
  return { ok: true };
}
