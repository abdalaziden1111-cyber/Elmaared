import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';

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

const SCORING_SYSTEM = `أنت مستشار شراء B2B في السعودية. مهمتك تقييم عرض مورد لطلب RFQ.
ركّز على:
- ملاءمة السعر للميزانية المعلنة
- واقعية مدة التسليم مقارنة بالموعد النهائي
- اكتمال نطاق العمل والشمولية
- جودة الكتابة والاحترافية
- سجل المورد (التقييم وعدد المشاريع)

أعد التقييم بصيغة JSON تطابق المخطط المطلوب فقط — لا نص قبل أو بعد.
الملخص واللوائح يجب أن تكون بالعربية، صريحة، وموضوعية.`;

interface ScoreInput {
  proposalId: string;
  rfq: {
    title: string;
    serviceType: string;
    budgetMin: number | null;
    budgetMax: number | null;
    deadline: string | null;
    details: Record<string, unknown>;
  };
  proposal: {
    totalPrice: number;
    deliveryDays: number;
    description: string | null;
    scopeOfWork: string | null;
    paymentTerms: string | null;
  };
  supplier: {
    companyName: string;
    averageRating: number | null;
    completedOrders: number | null;
    yearsOfExperience: number | null;
  };
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

  const prompt = JSON.stringify(input, null, 2);

  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: scoreSchema }),
      system: SCORING_SYSTEM,
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
    console.error('[ai] Proposal scoring failed:', err);
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
