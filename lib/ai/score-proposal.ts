import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SCORE_PROPOSAL_SYSTEM,
  buildScoreProposalPrompt,
  type ScoreProposalPromptInput,
} from './prompts';
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
}

/**
 * Score a proposal asynchronously and persist the result to the proposals row.
 * Designed to be called from `after()` so it never blocks the user response.
 * On failure (no gateway key, AI error, schema mismatch) we write a stub
 * summary so the UI has something to show without breaking the comparison view.
 */
export async function scoreProposal(input: ScoreInput): Promise<void> {
  const admin = createAdminClient();

  if (!aiGateway) {
    await admin
      .from('proposals')
      .update({
        ai_score: null,
        ai_summary: '[scoring skipped — AI gateway not configured]',
      })
      .eq('id', input.proposalId);
    return;
  }

  const { proposalId: _omit, ...promptInput } = input;
  const prompt = buildScoreProposalPrompt(promptInput);

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
      })
      .eq('id', input.proposalId);
  } catch (err) {
    log.error('ai.score_proposal.failed', err, { proposal_id: input.proposalId });
    await admin
      .from('proposals')
      .update({
        ai_score: null,
        ai_summary: `[scoring failed: ${
          err instanceof Error ? err.message : 'unknown error'
        }]`,
      })
      .eq('id', input.proposalId);
  }
}
