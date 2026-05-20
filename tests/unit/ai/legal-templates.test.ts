// Phase V1.2 — Saudi legal templates.

import { describe, it, expect } from 'vitest';
import {
  buildLegalContext,
  TEMPLATE_VERSION,
  _LEGAL_TEMPLATES_FOR_TEST,
} from '@/lib/ai/legal-templates';

describe('Saudi legal templates', () => {
  it('every template is non-empty Arabic text', () => {
    for (const [name, body] of Object.entries(_LEGAL_TEMPLATES_FOR_TEST)) {
      expect(body, `template ${name} is empty`).toBeTruthy();
      expect(body.length, `template ${name} is too short`).toBeGreaterThan(100);
      // Sanity: Arabic-script characters present.
      expect(body, `template ${name} contains no Arabic`).toMatch(/[؀-ۿ]/);
    }
  });

  it('escrow template mentions the 50/50 split and SAR currency', () => {
    expect(_LEGAL_TEMPLATES_FOR_TEST.ESCROW_CLAUSE_STANDARD).toMatch(/٥٠/);
    expect(_LEGAL_TEMPLATES_FOR_TEST.ESCROW_CLAUSE_STANDARD).toMatch(/الريال السعودي|SAR|ريال/);
    expect(_LEGAL_TEMPLATES_FOR_TEST.ESCROW_CLAUSE_STANDARD).toMatch(/الأمانة|أمانة|إسكرو|الإسكرو/);
  });

  it('VAT template names ZATCA and the 15% rate', () => {
    expect(_LEGAL_TEMPLATES_FOR_TEST.VAT_CLAUSE_ZATCA).toMatch(/ZATCA/);
    expect(_LEGAL_TEMPLATES_FOR_TEST.VAT_CLAUSE_ZATCA).toMatch(/١٥|15/);
    expect(_LEGAL_TEMPLATES_FOR_TEST.VAT_CLAUSE_ZATCA).toMatch(/VAT|الضريبة|ضريبة/);
  });

  it('dispute-resolution template references Najiz and Saudi commercial courts', () => {
    const txt = _LEGAL_TEMPLATES_FOR_TEST.DISPUTE_RESOLUTION_SAUDI_COURTS;
    expect(txt).toMatch(/ناجز|najiz/);
    // "المحاكم التجارية" (plural) or "المحكمة التجارية" (singular) — both
    // count as a Saudi commercial-court reference. Use a substring check
    // rather than a regex to dodge RTL-mark normalization gotchas.
    const hasCourt =
      txt.includes('المحاكم التجارية') || txt.includes('المحكمة التجارية');
    expect(hasCourt).toBe(true);
  });

  it('force-majeure template lists weather + government scenarios', () => {
    expect(_LEGAL_TEMPLATES_FOR_TEST.FORCE_MAJEURE_SA).toMatch(/أمطار|جو|عاصفة|عواصف/);
    expect(_LEGAL_TEMPLATES_FOR_TEST.FORCE_MAJEURE_SA).toMatch(/حكوم/);
  });

  it('payment-terms template anchors net-X days', () => {
    expect(_LEGAL_TEMPLATES_FOR_TEST.PAYMENT_TERMS_NORMS_SA).toMatch(/٣٠|٦٠|14|30|60/);
  });
});

describe('buildLegalContext', () => {
  it('includes the template version header', () => {
    const ctx = buildLegalContext();
    expect(ctx).toContain(TEMPLATE_VERSION);
  });

  it('concatenates every individual template', () => {
    const ctx = buildLegalContext();
    for (const [, body] of Object.entries(_LEGAL_TEMPLATES_FOR_TEST)) {
      expect(ctx).toContain(body);
    }
  });

  it('wraps with start + end markers', () => {
    const ctx = buildLegalContext();
    expect(ctx).toMatch(/مرجع البنود/);
    expect(ctx).toMatch(/انتهاء المرجع/);
  });

  it('TEMPLATE_VERSION follows YYYY-MM-vN pattern', () => {
    expect(TEMPLATE_VERSION).toMatch(/^\d{4}-\d{2}-v\d+$/);
  });
});
