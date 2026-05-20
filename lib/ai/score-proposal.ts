import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SCORE_PROPOSAL_SYSTEM,
  buildScoreProposalPrompt,
  type ScoreProposalPromptInput,
} from './prompts';
import { computeMarketContext, deriveConfidence } from './confidence';
import { assertDailyBudget, RateLimitError } from './rate-limit';
import { hashKey, readCache, writeCache } from './cache';
import { recordUsage } from './usage-log';
import { computeCost } from './cost';
import { flags } from '@/lib/feature-flags';
import { log } from '@/lib/utils/logger';

export const scoreSchema = z.object({
  score: z.number().min(0).max(100).describe('Overall fit score 0-100'),
  breakdown: z.object({
    price: z.number().min(0).max(100),
    delivery: z.number().min(0).max(100),
    completeness: z.number().min(0).max(100),
    professionalism: z.number().min(0).max(100),
    trackRecord: z.number().min(0).max(100),
  }),
  summary: z.string().min(20).max(400).describe('Arabic summary, 1-2 sentences'),
  strengths: z.array(z.string()).min(1).max(5),
  concerns: z.array(z.string()).max(5),
});

// System prompt + input shape moved to lib/ai/prompts.ts for testability.
interface ScoreInput extends ScoreProposalPromptInput {
  proposalId: string;
  /**
   * The user to bill the cost against (Phase V1.1). Typically the supplier
   * who generated the work; null for system batch jobs (skips rate limit).
   */
  userId?: string | null;
}

// Shape stored in the AI cache. Matches what `scoreSchema.parse()` produces.
type CachedScorePayload = z.infer<typeof scoreSchema>;

// 12-month historical window for the market baseline. The committee
// (Plan v2 §5, Debate 01) wanted a "recent enough to be relevant" anchor;
// 12 months matches the supplier-renewal cadence and dampens seasonal noise
// in event-driven categories (Ramadan dips, end-of-year peaks).
const MARKET_LOOKBACK_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Pull comparable past proposals for the given service type. We deliberately
 * scope by service_type only — narrowing further (e.g. city) shrinks the
 * sample too fast in early marketplace life. Returns just the total_price
 * values; descriptive stats come from `computeMarketContext`.
 */
async function fetchComparableProposalPrices(
  admin: ReturnType<typeof createAdminClient>,
  serviceType: string,
  excludeProposalId: string
): Promise<number[]> {
  const since = new Date(Date.now() - MARKET_LOOKBACK_MS).toISOString();

  const { data } = await admin
    .from('proposals')
    .select('total_price, rfqs!inner(service_type)')
    .eq('rfqs.service_type', serviceType)
    .neq('id', excludeProposalId)
    .neq('status', 'withdrawn')
    .gte('created_at', since)
    .limit(500);

  // The join shape is `{ total_price, rfqs: { service_type } }` but the
  // generated Database types collapse it to never[] for the joined table —
  // so the row is fed back as a loose record. We only need `total_price`.
  const rows = (data ?? []) as Array<{ total_price: number | string | null }>;
  const prices: number[] = [];
  for (const r of rows) {
    const n =
      typeof r.total_price === 'string' ? Number(r.total_price) : r.total_price;
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) prices.push(n);
  }
  return prices;
}

/**
 * Score a proposal asynchronously and persist the result to the proposals row.
 * Designed to be called from `after()` so it never blocks the user response.
 * On failure (no gateway key, AI error, schema mismatch) we write a stub
 * summary so the UI has something to show without breaking the comparison view.
 *
 * Sprint 1 S1.1 — also computes and persists market-quality metadata
 * (confidence + sample size + variance + price range) so the comparison UI
 * can render the 4-level confidence badge.
 */
export async function scoreProposal(input: ScoreInput): Promise<void> {
  const admin = createAdminClient();

  // Compute market context first — runs regardless of whether the AI gateway
  // is configured, because the confidence badge is itself useful even with a
  // missing score.
  const prices = await fetchComparableProposalPrices(
    admin,
    input.rfq.serviceType,
    input.proposalId
  );
  const market = computeMarketContext(prices);
  const confidence = deriveConfidence({
    sampleSize: market.sampleSize,
    variancePct: market.variancePct,
  });

  // Common update payload for the market-context columns. Applied in both
  // success and failure paths so the UI gets the same metadata either way.
  const marketUpdate = {
    ai_confidence: confidence,
    ai_sample_size: market.sampleSize,
    ai_variance_pct: market.variancePct,
    ai_price_range_min: market.priceMin,
    ai_price_range_max: market.priceMax,
  };

  // Phase W3 — when FF_AI_REAL=false (or gateway not configured), skip
  // the real API call. The W2 seed pre-populates ai_score_cache + a
  // realistic ai_summary on demo proposals; new (non-seeded) proposals
  // get a clearly-marked [mock] summary so the UI still has content to
  // show without ever billing for AI usage.
  if (!aiGateway || !flags.AI_REAL) {
    await admin
      .from('proposals')
      .update({
        ai_score: null,
        ai_summary: !aiGateway
          ? '[scoring skipped — AI gateway not configured]'
          : '[mock — set NEXT_PUBLIC_FF_AI_REAL=true + AI_GATEWAY_API_KEY to enable real scoring]',
        ...marketUpdate,
      })
      .eq('id', input.proposalId);
    return;
  }

  const { proposalId: _omit, userId, ...promptInput } = input;
  const prompt = buildScoreProposalPrompt(promptInput);

  // Phase V1.1 — cache key is hashed over the prompt input (canonical JSON)
  // plus the model + operation. Identical input → identical hash, regardless
  // of object-key ordering or whitespace.
  const cacheHash = hashKey({
    operation: 'score_proposal',
    model: PROPOSAL_SCORING_MODEL,
    input: promptInput,
  });

  // Cache check — replay a prior gateway response without the round-trip
  // or the cost. We still log the call (with cache_hit=true and $0 cost)
  // so the admin dashboard sees the volume.
  const cached = await readCache<CachedScorePayload>(cacheHash, admin);
  if (cached) {
    await admin
      .from('proposals')
      .update({
        ai_score: cached.payload.score,
        ai_summary: cached.payload.summary,
        ai_strengths: cached.payload.strengths,
        ai_concerns: cached.payload.concerns,
        ...marketUpdate,
      })
      .eq('id', input.proposalId);
    await recordUsage({
      userId: userId ?? null,
      operation: 'score_proposal',
      tokensIn: 0,
      tokensOut: 0,
      model: cached.model,
      cacheHit: true,
      admin,
    });
    return;
  }

  // Rate limit check — throws RateLimitError when the user has spent at
  // or above today's cap. Caught below and surfaced as a distinct summary
  // so AIFallback can render `reason='rate_limited'`.
  try {
    await assertDailyBudget(userId ?? null, admin);
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.warn('ai.score_proposal.rate_limited');
      await admin
        .from('proposals')
        .update({
          ai_score: null,
          ai_summary: '[rate-limited]',
          ...marketUpdate,
        })
        .eq('id', input.proposalId);
      return;
    }
    throw err;
  }

  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: scoreSchema }),
      system: SCORE_PROPOSAL_SYSTEM,
      prompt,
      temperature: 0.2,
    });

    const out = result.experimental_output;
    if (!out) throw new Error('Empty AI output');

    await admin
      .from('proposals')
      .update({
        ai_score: out.score,
        ai_summary: out.summary,
        ai_strengths: out.strengths,
        ai_concerns: out.concerns,
        ...marketUpdate,
      })
      .eq('id', input.proposalId);

    // Persist to the cache and log usage. Both are best-effort — failure
    // here doesn't roll back the proposal update. Read usage off the
    // gateway response; the `ai` package exposes it under `result.usage`.
    const usage = (result as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
    const tokensIn = usage?.inputTokens ?? 0;
    const tokensOut = usage?.outputTokens ?? 0;
    const cost = computeCost({
      tokensIn,
      tokensOut,
      model: PROPOSAL_SCORING_MODEL,
    });

    await writeCache({
      hash: cacheHash,
      operation: 'score_proposal',
      payload: out,
      model: PROPOSAL_SCORING_MODEL,
      admin,
    });
    await recordUsage({
      userId: userId ?? null,
      operation: 'score_proposal',
      tokensIn,
      tokensOut,
      model: PROPOSAL_SCORING_MODEL,
      costUsd: cost,
      admin,
    });
  } catch (err) {
    log.error('ai.score_proposal.failed', err, { proposal_id: input.proposalId });
    await admin
      .from('proposals')
      .update({
        ai_score: null,
        ai_summary: `[scoring failed: ${
          err instanceof Error ? err.message : 'unknown error'
        }]`,
        ...marketUpdate,
      })
      .eq('id', input.proposalId);
  }
}
