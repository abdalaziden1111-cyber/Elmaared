import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  ANALYZE_AGREEMENT_SYSTEM,
  buildAnalyzeAgreementPrompt,
} from './prompts';
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
});

// System prompt and prompt-assembly moved to lib/ai/prompts.ts.

export async function analyzeAgreement(args: {
  agreementId: string;
  rfqTitle: string;
  proposalSummary: string;
  clientUnderstanding: string;
  supplierUnderstanding: string;
}): Promise<void> {
  const admin = createAdminClient();

  if (!aiGateway) {
    await admin
      .from('agreements')
      .update({
        ai_recommendation: '[تحليل الذكاء الاصطناعي غير متاح في هذه البيئة]',
      })
      .eq('id', args.agreementId);
    return;
  }

  const prompt = buildAnalyzeAgreementPrompt({
    rfqTitle: args.rfqTitle,
    proposalSummary: args.proposalSummary,
    clientUnderstanding: args.clientUnderstanding,
    supplierUnderstanding: args.supplierUnderstanding,
  });

  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: analysisSchema }),
      system: ANALYZE_AGREEMENT_SYSTEM,
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
      })
      .eq('id', args.agreementId);
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
