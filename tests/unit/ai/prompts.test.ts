import { describe, it, expect } from 'vitest';
import {
  SCORE_PROPOSAL_SYSTEM,
  ANALYZE_AGREEMENT_SYSTEM,
  buildScoreProposalPrompt,
  buildAnalyzeAgreementPrompt,
  buildAnalyzeAgreementSystem,
  buildProposalSummaryLine,
  type ScoreProposalPromptInput,
} from '@/lib/ai/prompts';
import { buildLegalContext } from '@/lib/ai/legal-templates';

const sampleScoreInput: ScoreProposalPromptInput = {
  rfq: {
    title: 'Booth for LEAP 2026',
    serviceType: 'booth',
    budgetMin: 50000,
    budgetMax: 100000,
    deadline: '2026-09-15',
    details: { area: '6x6', floors: '1' },
  },
  proposal: {
    totalPrice: 87500,
    deliveryDays: 21,
    description: 'Premium booth design',
    scopeOfWork: 'Full design + build + dismantle',
    paymentTerms: '50% upfront, 50% on delivery',
  },
  supplier: {
    companyName: 'مؤسسة المعارض',
    averageRating: 4.5,
    completedOrders: 15,
    yearsOfExperience: 8,
  },
};

describe('SCORE_PROPOSAL_SYSTEM', () => {
  it('contains the 5 evaluation dimensions', () => {
    expect(SCORE_PROPOSAL_SYSTEM).toContain('السعر');
    expect(SCORE_PROPOSAL_SYSTEM).toContain('التسليم');
    expect(SCORE_PROPOSAL_SYSTEM).toContain('نطاق العمل');
    expect(SCORE_PROPOSAL_SYSTEM).toContain('الاحترافية');
    expect(SCORE_PROPOSAL_SYSTEM).toContain('سجل المورد');
  });

  it('demands JSON-only output', () => {
    expect(SCORE_PROPOSAL_SYSTEM).toContain('JSON');
    expect(SCORE_PROPOSAL_SYSTEM).toContain('لا نص قبل أو بعد');
  });

  it('demands Arabic responses', () => {
    expect(SCORE_PROPOSAL_SYSTEM).toContain('بالعربية');
  });
});

describe('buildScoreProposalPrompt', () => {
  it('returns a JSON string', () => {
    const out = buildScoreProposalPrompt(sampleScoreInput);
    expect(() => JSON.parse(out)).not.toThrow();
  });

  it('includes all top-level sections', () => {
    const out = buildScoreProposalPrompt(sampleScoreInput);
    const parsed = JSON.parse(out);
    expect(parsed.rfq).toBeDefined();
    expect(parsed.proposal).toBeDefined();
    expect(parsed.supplier).toBeDefined();
  });

  it('preserves key fields', () => {
    const out = buildScoreProposalPrompt(sampleScoreInput);
    expect(out).toContain('LEAP 2026');
    expect(out).toContain('87500');
    expect(out).toContain('مؤسسة المعارض');
  });

  it('is stable: same input → same output (cache-friendly)', () => {
    const a = buildScoreProposalPrompt(sampleScoreInput);
    const b = buildScoreProposalPrompt(sampleScoreInput);
    expect(a).toBe(b);
  });

  it('handles null fields without "null" garbage in output', () => {
    const input: ScoreProposalPromptInput = {
      ...sampleScoreInput,
      rfq: { ...sampleScoreInput.rfq, budgetMin: null, budgetMax: null, deadline: null },
      supplier: {
        ...sampleScoreInput.supplier,
        averageRating: null,
        completedOrders: null,
        yearsOfExperience: null,
      },
    };
    const out = buildScoreProposalPrompt(input);
    expect(() => JSON.parse(out)).not.toThrow();
  });
});

describe('ANALYZE_AGREEMENT_SYSTEM', () => {
  it('lists the 5 expected outputs', () => {
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('اتفقا');
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('يختلفان');
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('ناقصة');
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('المخاطرة');
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('توصية');
  });

  it('demands JSON output', () => {
    expect(ANALYZE_AGREEMENT_SYSTEM).toContain('JSON');
  });
});

describe('buildAnalyzeAgreementPrompt', () => {
  it('embeds all four sections in order', () => {
    const out = buildAnalyzeAgreementPrompt({
      rfqTitle: 'Booth project',
      proposalSummary: 'Summary X',
      clientUnderstanding: 'Client says A',
      supplierUnderstanding: 'Supplier says B',
    });
    const titleIdx = out.indexOf('العنوان');
    const summaryIdx = out.indexOf('ملخص العرض المقبول');
    const clientIdx = out.indexOf('فهم العميل');
    const supplierIdx = out.indexOf('فهم المورد');
    expect(titleIdx).toBeGreaterThanOrEqual(0);
    expect(summaryIdx).toBeGreaterThan(titleIdx);
    expect(clientIdx).toBeGreaterThan(summaryIdx);
    expect(supplierIdx).toBeGreaterThan(clientIdx);
  });

  it('includes the actual text from each section', () => {
    const out = buildAnalyzeAgreementPrompt({
      rfqTitle: 'TitleXYZ',
      proposalSummary: 'SummaryXYZ',
      clientUnderstanding: 'ClientXYZ',
      supplierUnderstanding: 'SupplierXYZ',
    });
    expect(out).toContain('TitleXYZ');
    expect(out).toContain('SummaryXYZ');
    expect(out).toContain('ClientXYZ');
    expect(out).toContain('SupplierXYZ');
  });

  it('is stable for cache reuse', () => {
    const args = {
      rfqTitle: 'a',
      proposalSummary: 'b',
      clientUnderstanding: 'c',
      supplierUnderstanding: 'd',
    };
    expect(buildAnalyzeAgreementPrompt(args)).toBe(
      buildAnalyzeAgreementPrompt(args)
    );
  });
});

describe('buildAnalyzeAgreementSystem (V1.2 — with legal context)', () => {
  it('starts with the base system prompt', () => {
    const out = buildAnalyzeAgreementSystem(buildLegalContext());
    expect(out.indexOf(ANALYZE_AGREEMENT_SYSTEM)).toBe(0);
  });

  it('asks the model to emit risky_clauses', () => {
    const out = buildAnalyzeAgreementSystem(buildLegalContext());
    expect(out).toContain('risky_clauses');
    expect(out).toContain('clause');
    expect(out).toContain('deviation');
    expect(out).toContain('severity');
  });

  it('embeds the full legal context', () => {
    const legal = buildLegalContext();
    const out = buildAnalyzeAgreementSystem(legal);
    expect(out).toContain(legal);
  });

  it('is deterministic for cache reuse', () => {
    const legal = 'CONST_CONTEXT';
    expect(buildAnalyzeAgreementSystem(legal)).toBe(
      buildAnalyzeAgreementSystem(legal)
    );
  });
});

describe('buildProposalSummaryLine', () => {
  it('formats price with thousand grouping', () => {
    const out = buildProposalSummaryLine({
      totalPrice: 87500,
      deliveryDays: 21,
      description: 'desc',
      scopeOfWork: 'scope',
    });
    expect(out).toContain('87,500');
    expect(out).toContain('21 يوم');
  });

  it('handles null description and scope without "null" string', () => {
    const out = buildProposalSummaryLine({
      totalPrice: 1000,
      deliveryDays: 5,
      description: null,
      scopeOfWork: null,
    });
    expect(out).not.toContain('null');
  });
});
