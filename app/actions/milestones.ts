'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';
import type { MilestoneType } from '@/lib/supabase/types';
import type { ActionResult } from './auth';

// UX Plan v2 Decision #07 + #13 (Sprint 3 S3.4) — idempotent milestone
// claim. Used by the CelebrationModal flow: the page checks whether a
// milestone has fired before rendering the modal, and the modal calls
// this action when the user dismisses it (in case the row didn't already
// exist). The UNIQUE constraint on (user_id, milestone_type) makes the
// insert a no-op if the row already exists.

export async function claimMilestoneAction(
  milestone: MilestoneType,
): Promise<ActionResult<{ alreadyClaimed: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  try {
    // Check first so we can tell the UI whether this was a fresh claim.
    const { data: existing } = await admin
      .from('user_milestones')
      .select('id')
      .eq('user_id', user.id)
      .eq('milestone_type', milestone)
      .maybeSingle();

    if (existing) {
      return { ok: true, data: { alreadyClaimed: true } };
    }

    const { error } = await admin.from('user_milestones').insert({
      user_id: user.id,
      milestone_type: milestone,
    });

    if (error) {
      // The UNIQUE constraint may still fire under a race; treat duplicates
      // as success (idempotency is the whole point).
      if ((error as { code?: string }).code === '23505') {
        return { ok: true, data: { alreadyClaimed: true } };
      }
      log.error('milestone.insert_failed', error, {
        user_id: user.id,
        milestone,
      });
      return { ok: false, error: 'تعذّر تسجيل المعلم.' };
    }

    return { ok: true, data: { alreadyClaimed: false } };
  } catch (err) {
    log.error('milestone.threw', err, { user_id: user.id, milestone });
    return { ok: false, error: 'تعذّر تسجيل المعلم.' };
  }
}

export async function hasClaimedMilestoneAction(
  milestone: MilestoneType,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = createAdminClient();
  const { data } = await admin
    .from('user_milestones')
    .select('id')
    .eq('user_id', user.id)
    .eq('milestone_type', milestone)
    .maybeSingle();
  return Boolean(data);
}
