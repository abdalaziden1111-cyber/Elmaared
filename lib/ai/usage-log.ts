// Phase V1.1 — Persist a single AI gateway call to `ai_usage_log`.
//
// Always called from a `safeAfter` background context (so it never blocks
// the user request), even on cache hits (cache_hit=true so the rate
// limiter excludes them from today's spend).

import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';
import { computeCost } from './cost';

export interface RecordUsageInput {
  userId: string | null;
  operation: 'score_proposal' | 'analyze_agreement' | 'score_lead';
  tokensIn: number;
  tokensOut: number;
  model: string;
  requestId?: string | null;
  /** Cost in USD. Pass-through wins over computing; recomputed if omitted. */
  costUsd?: number;
  /** True when the call was served from `ai_score_cache` (no real spend). */
  cacheHit?: boolean;
  admin?: AdminSupabase;
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const client = input.admin ?? createAdminClient();
  const computedCost =
    input.cacheHit === true
      ? 0
      : input.costUsd ??
        computeCost({
          tokensIn: input.tokensIn,
          tokensOut: input.tokensOut,
          model: input.model,
        });

  const { error } = await client.from('ai_usage_log').insert({
    user_id: input.userId,
    operation: input.operation,
    tokens_in: input.tokensIn,
    tokens_out: input.tokensOut,
    cost_usd: computedCost,
    model: input.model,
    request_id: input.requestId ?? null,
    cache_hit: Boolean(input.cacheHit),
  });

  if (error) {
    // Log + swallow — usage logging is best-effort. The gateway result has
    // already landed; we don't want a logging failure to cascade.
    log.error('ai.usage_log.insert_failed', error, {
      user_id: input.userId,
      operation: input.operation,
    });
  }
}
