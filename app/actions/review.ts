'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { reviewSchema } from '@/schemas/review';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
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

  revalidatePath('/admin/disputes');
  return { ok: true };
}
