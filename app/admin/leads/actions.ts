'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { scoreLead } from '@/lib/ai/score-lead';
import type { ActionResult } from '@/app/actions/auth';

/**
 * Phase V1.3 — admin-only recompute. Always runs the AI narrative since
 * an admin clicked "Recompute" specifically to get fresh insight.
 * Cost is billed to the admin user.
 */
export async function recomputeLeadAction(
  userId: string
): Promise<ActionResult<{ score: number; category: string }>> {
  if (!userId) return { ok: false, error: 'معرّف المستخدم مطلوب.' };
  const { user: admin } = await requireRole(['admin']);

  const result = await scoreLead(userId, {
    withNarrative: true,
    billingUserId: admin.id,
  });
  if (!result) return { ok: false, error: 'لم نتمكن من إعادة الاحتساب.' };

  revalidatePath('/admin/leads');
  return {
    ok: true,
    data: { score: result.score, category: result.category },
  };
}
