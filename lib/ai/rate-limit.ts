// Phase V1.1 — Per-user daily AI spend cap.
//
// On every gateway-bound call we SUM(cost_usd) for today's `ai_usage_log`
// rows belonging to the user; if it's at or above the cap, we throw
// `RateLimitError`. The throwing path is preferred over a boolean so a
// missed `if` check can't quietly bill a runaway loop — the gateway call
// is gated by a thrown control-flow exit.
//
// Cap source: AI_DAILY_BUDGET_USD env var (default $1). UTC day boundaries
// — we don't bother with the user's locale because the cap is about cost
// containment, not user-facing time semantics.

import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';

export class RateLimitError extends Error {
  readonly code = 'AI_RATE_LIMITED' as const;
  readonly spentUsd: number;
  readonly capUsd: number;
  constructor(spentUsd: number, capUsd: number) {
    super(
      `AI daily budget exceeded: $${spentUsd.toFixed(4)} >= $${capUsd.toFixed(2)}`
    );
    this.name = 'RateLimitError';
    this.spentUsd = spentUsd;
    this.capUsd = capUsd;
  }
}

const DEFAULT_BUDGET_USD = 1.0;

function readBudget(): number {
  const raw = process.env.AI_DAILY_BUDGET_USD;
  if (!raw) return DEFAULT_BUDGET_USD;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_BUDGET_USD;
  return parsed;
}

/** Start of the current UTC day, ISO string. */
function startOfTodayUtcIso(): string {
  const now = new Date();
  const day = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  return day.toISOString();
}

/**
 * Sum today's `cost_usd` for the user. Returns 0 when user has no rows.
 * Cache hits (cache_hit = true) cost nothing and are excluded from the
 * sum so a busy user repeatedly viewing cached scores never gets capped.
 */
export async function getTodaysSpend(
  userId: string,
  admin?: AdminSupabase
): Promise<number> {
  const client = admin ?? createAdminClient();
  const { data, error } = await client
    .from('ai_usage_log')
    .select('cost_usd')
    .eq('user_id', userId)
    .eq('cache_hit', false)
    .gte('created_at', startOfTodayUtcIso());
  if (error) {
    // Don't block AI calls if the read fails — log and act as if the user
    // has spent $0. The next successful read will catch up.
    log.error('ai.rate_limit.read_failed', error, { user_id: userId });
    return 0;
  }
  const rows = (data ?? []) as Array<{ cost_usd: number | string | null }>;
  return rows.reduce((acc, r) => {
    const n =
      typeof r.cost_usd === 'string' ? Number(r.cost_usd) : r.cost_usd;
    return acc + (typeof n === 'number' && Number.isFinite(n) ? n : 0);
  }, 0);
}

/**
 * Throw `RateLimitError` if the user has already spent at or above the
 * daily cap. Called immediately before every gateway-bound AI request.
 *
 * `userId === null` is allowed for system-driven calls (nightly batch);
 * the cap is per-user, so anonymous calls skip the check.
 */
export async function assertDailyBudget(
  userId: string | null,
  admin?: AdminSupabase
): Promise<void> {
  if (!userId) return;
  const cap = readBudget();
  if (cap === 0) {
    // 0 cap means "block everything" — useful for tests.
    throw new RateLimitError(0, 0);
  }
  const spent = await getTodaysSpend(userId, admin);
  if (spent >= cap) {
    throw new RateLimitError(spent, cap);
  }
}

export const _DEFAULTS_FOR_TEST = {
  startOfTodayUtcIso,
  readBudget,
  DEFAULT_BUDGET_USD,
};
