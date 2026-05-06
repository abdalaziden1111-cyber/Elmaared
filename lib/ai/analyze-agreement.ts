import { generateText, Output } from 'ai';
import { z } from 'zod';
import { aiGateway, PROPOSAL_SCORING_MODEL } from './gateway';
import { createAdminClient } from '@/lib/supabase/admin';

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

const SYSTEM = `أنت مدقّق عقود B2B في السعودية. ستحلّل فهم العميل وفهم المورد لنفس المشروع.
استخرج:
- النقاط التي اتفقا عليها
- النقاط التي يختلفان فيها (مع شدة الخلاف)
- النقاط الناقصة (لم يذكرها أيٌّ منهما لكن يجب توضيحها)
- مستوى المخاطرة الإجمالي
- توصية موضوعية بالعربية للأطراف

أعد JSON يطابق المخطط فقط.`;

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

  const prompt = `العنوان: ${args.rfqTitle}\n\nملخص العرض المقبول:\n${args.proposalSummary}\n\nفهم العميل:\n${args.clientUnderstanding}\n\nفهم المورد:\n${args.supplierUnderstanding}`;

  try {
    const result = await generateText({
      model: aiGateway(PROPOSAL_SCORING_MODEL),
      output: Output.object({ schema: analysisSchema }),
      system: SYSTEM,
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
    console.error('[ai] Agreement analysis failed:', err);
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
