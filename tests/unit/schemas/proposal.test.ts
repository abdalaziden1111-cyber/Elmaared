import { describe, it, expect } from 'vitest';
import { proposalSchema } from '@/schemas/proposal';

describe('proposalSchema', () => {
  const valid = {
    totalPrice: 87500,
    deliveryDays: 21,
    description: 'a'.repeat(50),
    scopeOfWork: 'a'.repeat(100),
    paymentTerms: '50% upfront, 50% on delivery',
  };

  it('accepts valid proposal', () => {
    expect(proposalSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative price', () => {
    expect(proposalSchema.safeParse({ ...valid, totalPrice: -1000 }).success).toBe(false);
  });

  it('rejects zero price', () => {
    expect(proposalSchema.safeParse({ ...valid, totalPrice: 0 }).success).toBe(false);
  });

  it('rejects short description', () => {
    expect(proposalSchema.safeParse({ ...valid, description: 'too short' }).success).toBe(false);
  });

  it('rejects short scope of work', () => {
    expect(proposalSchema.safeParse({ ...valid, scopeOfWork: 'too short' }).success).toBe(false);
  });

  it('defaults validity to 14 days', () => {
    const result = proposalSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.validityDays).toBe(14);
    }
  });
});
