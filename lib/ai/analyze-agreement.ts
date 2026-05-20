import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  buildAnalyzeAgreementPrompt,
  buildAnalyzeAgreementSystem,
} from './prompts';
import { buildLegalContext, TEMPLATE_VERSION } from './legal-templates';
import { assertDailyBudget, RateLimitError } from './rate-limit';
import { hashKey, readCache, writeCache } from './cache';
import { recordUsage } from './usage-log';
import { computeCost } from './cost';
import { flags } from '@/lib/feature-flags';
import { log } from '@/lib/utils/logger';

const analysisSchema = z.object({
  agreed: z.array(z.string()).default([]),
  differs: z
    .array(
      z.object({
        topic: z.string(),
        client_says: z.string(),
        supplier_says: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
      })
    )
    .default([]),
  missing: z
    .array(
      z.object({
        topic: z.string(),
        needs_clarification: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
      })
    )
    .default([]),
  overall_risk: z.enum(['low', 'medium', 'high']),
  recommendation: z.string().min(20).max(800),
  // V1.2 — clauses flagged as deviating from Saudi commercial norms.
  risky_clauses: z
    .array(
      z.object({
        clause: z.string(),
        deviation: z.string(),
        severity: z.enum(['high', 'medium', 'low']),
      })
    )
    .default([]),
});

type CachedAnalysisPayload = z.infer<typeof analysisSchema>;

export async function analyzeAgreement(args: {
  agreementId: string;
  rfqTitle: string;
  proposalSummary: string;
  clientUnderstanding: string;
  supplierUnderstanding: string;
  /** V1.1 — who to bill the cost against. Either party works; we bill the
   *  client because they're the one whose understanding is being audited
   *  against the supplier's. */
  userId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();

  // Phase W3 — when FF_AI_REAL=false (or gateway not configured), skip
  // the real API call. The W2 seed pre-populates ai_risky_clauses +
  // ai_recommendation on the demo agreement so the UI panel still
  // renders with content.
  if (!aiGateway || !flags.AI_REAL) {
    await admin
      .from('agreements')
      .update({
        ai_recommendation: !aiGateway
          ? '[تحليل الذكاء الاصطناعي غير متاح في هذه البيئة]'
          : '[mock — عيّن NEXT_PUBLIC_FF_AI_REAL=true لتفعيل تحليل قانوني حقيقي]',
      })
      .eq('id', args.agreementId);
    return;
  }

  const promptInput = {
    rfqTitle: args.rfqTitle,
    proposalSummary: args.proposalSummary,
    clientUnderstanding: args.clientUnderstanding,
    supplierUnderstanding: args.supplierUnderstanding,
  };
  const prompt = buildAnalyzeAgreementPrompt(promptInput);

  // Cache key includes the template version so a templates.ts edit
  // invalidates all prior analyses and forces a re-score against the new
  // baseline. Without that, an old "no risky clauses" cache entry would
  // still serve after we added a new norm.
  const cacheHash = hashKey({
    operation: 'analyze_agreement',
    model: PROPOSAL_SCORING_MODEL,
    input: { ...promptInput, templateVersion: TEMPLATE_VERSION },
  });

  const cached = await readCache<CachedAnalysisPayload>(cacheHash, admin);
  if (cached) {
    await admin
      .from('agreements')
      .update({
        ai_agreed_points: cached.payload.agreed,
        ai_disputed_points: cached.payload.differs,
        ai_missing_points: cached.payload.missing,
        ai_recommendation: cached.payload.recommendation,
        ai_risky_clauses: cached.payload.risky_clauses,
      })
      .eq('id', args.agreementId);
    await recordUsage({
      userId: args.userId ?? null,
      operation: 'analyze_agreement',
      tokensIn: 0,
      tokensOut: 0,
      model: cached.model,
      cacheHit: true,
      admin,
    });
    return;
  }

  try {
    await assertDailyBudget(args.userId ?? null, admin);
  } catch (err) {
    if (err instanceof RateLimitError) {
      log.warn('ai.analyze_agreement.rate_limited');
      await admin
        .from('agreements')
        .update({
          ai_recommendation:
            '[تجاوزت حد الاستخدام اليومي للذكاء الاصطناعي — حاول غداً]',
        })
        .eq('id', args.agreementId);
      return;
    }
    throw err;
  }

  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: analysisSchema }),
      system: buildAnalyzeAgreementSystem(buildLegalContext()),
      prompt,
      temperature: 0.2,
    });
    const out = result.experimental_output;
    if (!out) throw new Error('Empty AI output');

    await admin
      .from('agreements')
      .update({
        ai_agreed_points: out.agreed,
        ai_disputed_points: out.differs,
        ai_missing_points: out.missing,
        ai_recommendation: out.recommendation,
        ai_risky_clauses: out.risky_clauses,
      })
      .eq('id', args.agreementId);

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
      operation: 'analyze_agreement',
      payload: out,
      model: PROPOSAL_SCORING_MODEL,
      admin,
    });
    await recordUsage({
      userId: args.userId ?? null,
      operation: 'analyze_agreement',
      tokensIn,
      tokensOut,
      model: PROPOSAL_SCORING_MODEL,
      costUsd: cost,
      admin,
    });
  } catch (err) {
    log.error('ai.analyze_agreement.failed', err, { agreement_id: args.agreementId });
    await admin
      .from('agreements')
      .update({
        ai_recommendation: `[فشل التحليل: ${
          err instanceof Error ? err.message : 'unknown'
        }]`,
      })
      .eq('id', args.agreementId);
  }
}
