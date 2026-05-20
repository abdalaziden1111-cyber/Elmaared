// Phase V1.3 — AI Lead Scoring.
//
// Two-layer design:
//   1. Deterministic base score (0-100) — pure function over LeadSignals.
//      Always runs. Drives category (hot/warm/cold).
//   2. Optional AI narrative — fetched ONLY on admin-recompute click. The
//      nightly batch skips it so we don't blow the daily budget across
//      thousands of leads.
//
// Categories:
//   • hot  ≥ 70  — clear buying intent, recent activity, real spend
//   • warm 40–69 — engaged but not yet converting
//   • cold < 40  — dormant or single-session

import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { collectLeadSignals, type LeadSignals } from './lead-signals';
import { assertDailyBudget, RateLimitError } from './rate-limit';
import { recordUsage } from './usage-log';
import { computeCost } from './cost';
import { log } from '@/lib/utils/logger';

export type LeadCategory = 'hot' | 'warm' | 'cold';

export interface ScoreLeadOptions {
  /** When true, also fetches an AI narrative summary. Default false. */
  withNarrative?: boolean;
  /** User to bill the cost against. Required when withNarrative=true. */
  billingUserId?: string | null;
  admin?: AdminSupabase;
  /** For deterministic testing — defaults to Date.now(). */
  nowTs?: number;
}

export interface ScoreLeadResult {
  userId: string;
  score: number;
  category: LeadCategory;
  previousCategory: LeadCategory | null;
  transitionedToHot: boolean;
  signals: LeadSignals;
  narrative: string | null;
}

/**
 * Pure scoring rubric — given the signals, return a 0-100 score. Tweaking
 * the weights only happens here.
 *
 * Weight rationale (Plan v2 §11 + Phase V kickoff):
 * - GMV is the strongest "this person is real" signal (40 pts cap)
 * - Recent activity matters more than lifetime activity (recency 20 pts)
 * - Funnel progress (escrows, signed agreements) gates the warm→hot jump
 * - Pure signup with no activity caps at "cold"
 */
export function scoreLeadDeterministic(signals: LeadSignals): number {
  if (signals.role === 'admin') return 0;

  let score = 0;

  // GMV milestones — 40 pts max. Stretch curve so first deals matter most.
  if (signals.totalGmvSar > 0) score += 10;
  if (signals.totalGmvSar >= 50_000) score += 10;
  if (signals.totalGmvSar >= 200_000) score += 10;
  if (signals.totalGmvSar >= 500_000) score += 10;

  // Funnel depth — 25 pts max.
  if (signals.projectsCompleted >= 1) score += 10;
  if (signals.escrowsFunded >= 1) score += 5;
  if (signals.agreementsSigned >= 1) score += 5;
  if (signals.proposalsAccepted >= 1 || signals.proposalsShortlisted >= 1) score += 5;

  // Volume — 15 pts max. Clients add via RFQs, suppliers via submissions.
  if (signals.rfqCount >= 1 || signals.proposalsSubmitted >= 1) score += 5;
  if (signals.rfqCount >= 5 || signals.proposalsSubmitted >= 5) score += 5;
  if (signals.rfqCount >= 15 || signals.proposalsSubmitted >= 25) score += 5;

  // Recency — 20 pts max. Active within last 7/30/90 days.
  const recency = signals.daysSinceLastActivity;
  if (recency === null || recency > 90) {
    // No recency bonus
  } else if (recency <= 7) {
    score += 20;
  } else if (recency <= 30) {
    score += 12;
  } else if (recency <= 90) {
    score += 5;
  }

  // Engagement penalty — totally dormant after a long signup window.
  if (
    signals.daysSinceSignup >= 60 &&
    signals.rfqCount === 0 &&
    signals.proposalsSubmitted === 0
  ) {
    score = Math.max(0, score - 10);
  }

  return Math.min(100, Math.max(0, score));
}

export function categorize(score: number): LeadCategory {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

const narrativeSchema = z.object({
  narrative: z
    .string()
    .min(20)
    .max(400)
    .describe('Arabic summary of who this lead is and why they scored as they did.'),
});

const SCORE_LEAD_SYSTEM = `أنت محلل CRM في منصة Elmaared B2B السعودية.
ستتلقّى إشارات سلوكية لمستخدم (عميل أو مورد) ودرجة عددية احتُسبت من قاعدة بيانات حتمية.
مهمتك: كتابة ملخص قصير بالعربية (٢٠-٤٠٠ حرف) يشرح الحالة الحالية للقائد، ونيّته الشرائية المتوقعة، وأبرز إشارة تحرّك (إن وُجدت).
أعد JSON يطابق المخطط فقط، بدون نص خارجي.`;

/**
 * Optional AI narrative — only called from the admin recompute path.
 * Wrapped in rate-limit + usage logging like the other AI surfaces.
 * Returns null on any failure path (rate-limited, gateway error, missing
 * key) so the caller can persist score + category even when narrative is
 * unavailable.
 */
async function fetchNarrative(
  signals: LeadSignals,
  score: number,
  category: LeadCategory,
  billingUserId: string | null,
  admin: AdminSupabase
): Promise<string | null> {
  if (!aiGateway) return null;
  try {
    await assertDailyBudget(billingUserId, admin);
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.warn('ai.score_lead.rate_limited');
      return null;
    }
    throw err;
  }
  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: narrativeSchema }),
      system: SCORE_LEAD_SYSTEM,
      prompt: JSON.stringify({ score, category, signals }, null, 2),
      temperature: 0.3,
    });
    const out = result.experimental_output;
    if (!out) return null;
    const usage = (result as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
    const tokensIn = usage?.inputTokens ?? 0;
    const tokensOut = usage?.outputTokens ?? 0;
    await recordUsage({
      userId: billingUserId,
      operation: 'score_lead',
      tokensIn,
      tokensOut,
      model: PROPOSAL_SCORING_MODEL,
      costUsd: computeCost({
        tokensIn,
        tokensOut,
        model: PROPOSAL_SCORING_MODEL,
      }),
      admin,
    });
    return out.narrative;
  } catch (err) {
    log.error('ai.score_lead.narrative_failed', err);
    return null;
  }
}

/**
 * Compute the score + classification for a user and upsert into
 * `lead_scores`. Returns the new + previous category so callers can fire
 * a hot-transition email.
 *
 * Admin-only callers can opt into a fresh AI narrative; the nightly batch
 * leaves narrative untouched so it doesn't get blanked out.
 */
export async function scoreLead(
  userId: string,
  options: ScoreLeadOptions = {}
): Promise<ScoreLeadResult | null> {
  const admin = options.admin ?? createAdminClient();
  const signals = await collectLeadSignals(userId, admin, options.nowTs);
  if (!signals || signals.role === 'admin') return null;

  const score = scoreLeadDeterministic(signals);
  const category = categorize(score);

  // Existing row (for previous_category + narrative preservation).
  const { data: existingRow } = await admin
    .from('lead_scores')
    .select('category, narrative')
    .eq('user_id', userId)
    .maybeSingle();
  const existing = existingRow as
    | { category: LeadCategory; narrative: string | null }
    | null;
  const previousCategory = existing?.category ?? null;

  let narrative: string | null = existing?.narrative ?? null;
  if (options.withNarrative) {
    const fresh = await fetchNarrative(
      signals,
      score,
      category,
      options.billingUserId ?? null,
      admin
    );
    if (fresh) narrative = fresh;
  }

  const { error: upsertErr } = await admin.from('lead_scores').upsert(
    {
      user_id: userId,
      category,
      score,
      signals: signals as unknown as Record<string, unknown>,
      narrative,
      previous_category: previousCategory,
      last_computed_at: new Date(options.nowTs ?? Date.now()).toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (upsertErr) {
    log.error('ai.score_lead.upsert_failed', upsertErr, { user_id: userId });
    return null;
  }

  return {
    userId,
    score,
    category,
    previousCategory,
    transitionedToHot:
      category === 'hot' && previousCategory !== 'hot',
    signals,
    narrative,
  };
}
