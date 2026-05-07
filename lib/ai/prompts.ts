// Pure prompt-builder functions extracted from score-proposal.ts and
// analyze-agreement.ts. Pulling the prompt assembly out lets us:
//   1. Snapshot-test the exact text we send to the model — regressions
//      in prompt wording show up in `git diff` instead of in production
//   2. Reuse the system prompts in evals / prompt-engineering experiments
//   3. Keep the AI service modules thin (just transport + parsing)

export interface ScoreProposalPromptInput {
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

export const SCORE_PROPOSAL_SYSTEM = `أنت مستشار شراء B2B في السعودية. مهمتك تقييم عرض مورد لطلب RFQ.
ركّز على:
- ملاءمة السعر للميزانية المعلنة
- واقعية مدة التسليم مقارنة بالموعد النهائي
- اكتمال نطاق العمل والشمولية
- جودة الكتابة والاحترافية
- سجل المورد (التقييم وعدد المشاريع)

أعد التقييم بصيغة JSON تطابق المخطط المطلوب فقط — لا نص قبل أو بعد.
الملخص واللوائح يجب أن تكون بالعربية، صريحة، وموضوعية.`;

/**
 * Build the user prompt for proposal scoring. We serialize the structured
 * input with stable formatting so the model sees the same shape every time —
 * unstable JSON ordering would hurt cache reuse and complicate evals.
 */
export function buildScoreProposalPrompt(input: ScoreProposalPromptInput): string {
  return JSON.stringify(input, null, 2);
}

export interface AgreementAnalysisPromptInput {
  rfqTitle: string;
  proposalSummary: string;
  clientUnderstanding: string;
  supplierUnderstanding: string;
}

export const ANALYZE_AGREEMENT_SYSTEM = `أنت مدقّق عقود B2B في السعودية. ستحلّل فهم العميل وفهم المورد لنفس المشروع.
استخرج:
- النقاط التي اتفقا عليها
- النقاط التي يختلفان فيها (مع شدة الخلاف)
- النقاط الناقصة (لم يذكرها أيٌّ منهما لكن يجب توضيحها)
- مستوى المخاطرة الإجمالي
- توصية موضوعية بالعربية للأطراف

أعد JSON يطابق المخطط فقط.`;

export function buildAnalyzeAgreementPrompt(
  input: AgreementAnalysisPromptInput
): string {
  return [
    `العنوان: ${input.rfqTitle}`,
    '',
    'ملخص العرض المقبول:',
    input.proposalSummary,
    '',
    'فهم العميل:',
    input.clientUnderstanding,
    '',
    'فهم المورد:',
    input.supplierUnderstanding,
  ].join('\n');
}

/**
 * Build the inline summary line that gets embedded inside the agreement
 * analysis prompt. Extracted so the formatting (currency, units, line
 * breaks) can be tested independently.
 */
export function buildProposalSummaryLine(args: {
  totalPrice: number;
  deliveryDays: number;
  description: string | null;
  scopeOfWork: string | null;
}): string {
  return `السعر ${args.totalPrice.toLocaleString('en')} ﷼ — مدة التسليم ${args.deliveryDays} يوم. ${args.description ?? ''}\n${args.scopeOfWork ?? ''}`;
}
