// Phase V2.1 — Server-side milestone trigger.
//
// Inserts a `user_milestones` row idempotently. Designed to be called from
// `safeAfter(...)` inside a server action so failures don't break the
// triggering request and successes don't block its response.
//
// The DB UNIQUE constraint on (user_id, milestone_type) is the real
// idempotency guard; the pre-check is a fast-path that avoids INSERT
// noise (audit logs, triggers) when the row already exists.

import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';
import type { MilestoneType } from '@/lib/supabase/types';

export interface FireMilestoneResult {
  fired: boolean;
  reason?: 'already_claimed' | 'insert_failed';
}

/**
 * Insert a milestone row for `userId` if and only if no row for
 * (userId, milestone) exists yet. Safe to call multiple times — duplicates
 * fold into `{ fired: false, reason: 'already_claimed' }`.
 *
 * @param admin Optional admin client (lets tests pass a mock). Falls back
 *   to a fresh admin client.
 */
export async function maybeFireMilestone(
  userId: string,
  milestone: MilestoneType,
  admin?: SupabaseClient
): Promise<FireMilestoneResult> {
  const client = (admin ?? createAdminClient()) as SupabaseClient;

  try {
    const { data: existing } = await client
      .from('user_milestones')
      .select('id')
      .eq('user_id', userId)
      .eq('milestone_type', milestone)
      .maybeSingle();

    if (existing) return { fired: false, reason: 'already_claimed' };

    const { error } = await client.from('user_milestones').insert({
      user_id: userId,
      milestone_type: milestone,
    });

    if (error) {
      // The UNIQUE constraint catches concurrent inserts; treat as success.
      if ((error as { code?: string }).code === '23505') {
        return { fired: false, reason: 'already_claimed' };
      }
      log.error('milestone.fire_failed', error, { user_id: userId, milestone });
      return { fired: false, reason: 'insert_failed' };
    }

    return { fired: true };
  } catch (err) {
    log.error('milestone.fire_threw', err, { user_id: userId, milestone });
    return { fired: false, reason: 'insert_failed' };
  }
}
