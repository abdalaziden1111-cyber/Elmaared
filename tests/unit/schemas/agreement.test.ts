import { describe, it, expect } from 'vitest';
import { agreementUnderstandingSchema } from '@/schemas/agreement';

describe('agreementUnderstandingSchema', () => {
  it('accepts text at 100 chars', () => {
    expect(
      agreementUnderstandingSchema.safeParse({
        understanding: 'a'.repeat(100),
      }).success
    ).toBe(true);
  });

  it('rejects text under 100 chars', () => {
    expect(
      agreementUnderstandingSchema.safeParse({
        understanding: 'a'.repeat(99),
      }).success
    ).toBe(false);
  });

  it('rejects empty string', () => {
    expect(
      agreementUnderstandingSchema.safeParse({ understanding: '' }).success
    ).toBe(false);
  });

  it('rejects missing understanding field', () => {
    expect(agreementUnderstandingSchema.safeParse({}).success).toBe(false);
  });

  it('accepts very long text', () => {
    expect(
      agreementUnderstandingSchema.safeParse({
        understanding: 'a'.repeat(10_000),
      }).success
    ).toBe(true);
  });

  it('accepts Arabic text', () => {
    const arabicText = 'سأنفّذ تصميم وتنفيذ جناح بمساحة 6×6 خلال 21 يوماً مع غرفة اجتماعات وتخزين خلفي. السعر النهائي 87,500 ريال شامل الضريبة.';
    expect(
      agreementUnderstandingSchema.safeParse({ understanding: arabicText }).success
    ).toBe(arabicText.length >= 100);
  });

  it('accepts text with newlines and special chars', () => {
    const text = 'Line 1\nLine 2\nLine 3 with — special « chars »\n' + 'a'.repeat(80);
    expect(
      agreementUnderstandingSchema.safeParse({ understanding: text }).success
    ).toBe(true);
  });
});
