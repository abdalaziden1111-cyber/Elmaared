'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';
import type { ActionResult } from './auth';
import type { AiFeedbackReason } from '@/lib/supabase/types';

// UX Plan v2 Decision #01 (S1.4) — capture user pushback on AI scores.
// One row per (proposal_id, user_id), upserted so users can change their
// mind. Authorization: only the buyer who owns the RFQ may submit feedback.

const feedbackSchema = z.object({
  proposalId: z.string().uuid(),
  reason: z.enum(['price_too_high', 'price_too_low', 'illogical']),
  comment: z.string().trim().max(1000).optional(),
});

export async function submitAiFeedbackAction(input: {
  proposalId: string;
  reason: AiFeedbackReason;
  comment?: string;
}): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'بيانات غير صالحة.' };
  }
  const { proposalId, reason, comment } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  // Confirm the caller owns the RFQ that this proposal belongs to. We use
  // the admin client because the recursive RLS pair on rfqs ↔ proposals
  // blocks the join from regular sessions (same workaround used by chat.ts
  // and the compare page).
  const admin = createAdminClient();
  const { data: proposalRowRaw } = await admin
    .from('proposals')
    .select('id, rfq:rfqs(client_id)')
    .eq('id', proposalId)
    .single();
  const proposal = proposalRowRaw as
    | { id: string; rfq: { client_id: string } | null }
    | null;
  if (!proposal) return { ok: false, error: 'لم نجد العرض.' };
  if (proposal.rfq?.client_id !== user.id) {
    return { ok: false, error: 'ليست لديك صلاحية على هذا العرض.' };
  }

  const { error } = await admin
    .from('ai_feedback')
    .upsert(
      {
        proposal_id: proposalId,
        user_id: user.id,
        reason,
        comment: comment ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'proposal_id,user_id' }
    );

  if (error) {
    log.error('ai_feedback.upsert_failed', error, {
      proposal_id: proposalId,
      user_id: user.id,
    });
    return { ok: false, error: 'تعذّر حفظ ملاحظتك. حاول مجدداً.' };
  }

  // Refresh the comparison page so a future "I disagree" tooltip can reflect
  // the persisted state. The button itself optimistically updates, but the
  // server is the source of truth.
  // Note: we don't know the RFQ id without an extra query, so revalidate
  // the parent comparison route by tag would be cleaner; for now leave it
  // to the optimistic client update.
  void revalidatePath; // imported for future targeted revalidation

  return { ok: true };
}
