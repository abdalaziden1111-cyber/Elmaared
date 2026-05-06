import { describe, it, expect } from 'vitest';
import { proposalSchema } from '@/schemas/proposal';

const valid = {
  totalPrice: 87500,
  deliveryDays: 21,
  description: 'a'.repeat(50),
  scopeOfWork: 'a'.repeat(100),
  paymentTerms: '50% upfront, 50% on delivery',
};

describe('proposalSchema — happy paths', () => {
  it('accepts valid proposal', () => {
    expect(proposalSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults validity to 14 days when omitted', () => {
    const result = proposalSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.validityDays).toBe(14);
    }
  });

  it('accepts validity at lower bound (7 days)', () => {
    expect(
      proposalSchema.safeParse({ ...valid, validityDays: 7 }).success
    ).toBe(true);
  });

  it('accepts validity at upper bound (30 days)', () => {
    expect(
      proposalSchema.safeParse({ ...valid, validityDays: 30 }).success
    ).toBe(true);
  });

  it('accepts excludedItems when provided', () => {
    expect(
      proposalSchema.safeParse({ ...valid, excludedItems: 'shipping' }).success
    ).toBe(true);
  });

  it('accepts excludedItems omitted (optional)', () => {
    expect(proposalSchema.safeParse(valid).success).toBe(true);
  });
});

describe('proposalSchema — invalid prices', () => {
  it('rejects negative price', () => {
    expect(
      proposalSchema.safeParse({ ...valid, totalPrice: -1000 }).success
    ).toBe(false);
  });

  it('rejects zero price', () => {
    expect(
      proposalSchema.safeParse({ ...valid, totalPrice: 0 }).success
    ).toBe(false);
  });

  it('accepts fractional price (1234.56)', () => {
    expect(
      proposalSchema.safeParse({ ...valid, totalPrice: 1234.56 }).success
    ).toBe(true);
  });

  it('accepts very small positive price (0.01)', () => {
    expect(
      proposalSchema.safeParse({ ...valid, totalPrice: 0.01 }).success
    ).toBe(true);
  });

  it('accepts very large price', () => {
    expect(
      proposalSchema.safeParse({ ...valid, totalPrice: 9_999_999 }).success
    ).toBe(true);
  });
});

describe('proposalSchema — delivery days', () => {
  it('rejects zero delivery days', () => {
    expect(
      proposalSchema.safeParse({ ...valid, deliveryDays: 0 }).success
    ).toBe(false);
  });

  it('rejects negative delivery days', () => {
    expect(
      proposalSchema.safeParse({ ...valid, deliveryDays: -5 }).success
    ).toBe(false);
  });

  it('rejects fractional delivery days', () => {
    expect(
      proposalSchema.safeParse({ ...valid, deliveryDays: 5.5 }).success
    ).toBe(false);
  });

  it('accepts 1 day delivery', () => {
    expect(
      proposalSchema.safeParse({ ...valid, deliveryDays: 1 }).success
    ).toBe(true);
  });
});

describe('proposalSchema — text length boundaries', () => {
  it('rejects description shorter than 50 chars', () => {
    expect(
      proposalSchema.safeParse({ ...valid, description: 'a'.repeat(49) }).success
    ).toBe(false);
  });

  it('accepts description at exactly 50 chars', () => {
    expect(
      proposalSchema.safeParse({ ...valid, description: 'a'.repeat(50) }).success
    ).toBe(true);
  });

  it('rejects scopeOfWork shorter than 100 chars', () => {
    expect(
      proposalSchema.safeParse({ ...valid, scopeOfWork: 'a'.repeat(99) }).success
    ).toBe(false);
  });

  it('accepts scopeOfWork at exactly 100 chars', () => {
    expect(
      proposalSchema.safeParse({ ...valid, scopeOfWork: 'a'.repeat(100) }).success
    ).toBe(true);
  });

  it('rejects paymentTerms shorter than 10 chars', () => {
    expect(
      proposalSchema.safeParse({ ...valid, paymentTerms: '50% only' }).success
    ).toBe(false);
  });
});

describe('proposalSchema — validity bounds', () => {
  it('rejects validity below 7', () => {
    expect(
      proposalSchema.safeParse({ ...valid, validityDays: 6 }).success
    ).toBe(false);
  });

  it('rejects validity above 30', () => {
    expect(
      proposalSchema.safeParse({ ...valid, validityDays: 31 }).success
    ).toBe(false);
  });

  it('rejects fractional validity', () => {
    expect(
      proposalSchema.safeParse({ ...valid, validityDays: 14.5 }).success
    ).toBe(false);
  });
});
