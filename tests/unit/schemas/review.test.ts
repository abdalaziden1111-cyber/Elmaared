import { describe, it, expect } from 'vitest';
import { reviewSchema } from '@/schemas/review';

describe('reviewSchema — happy paths', () => {
  it('accepts minimum: only ratingOverall', () => {
    expect(reviewSchema.safeParse({ ratingOverall: 5 }).success).toBe(true);
  });

  it('accepts all 6 ratings + comment', () => {
    expect(
      reviewSchema.safeParse({
        ratingOverall: 5,
        ratingQuality: 5,
        ratingTimeliness: 4,
        ratingCommunication: 5,
        ratingFlexibility: 4,
        ratingPriceValue: 3,
        comment: 'ممتاز',
      }).success
    ).toBe(true);
  });

  it('accepts each integer rating from 1 to 5', () => {
    for (const r of [1, 2, 3, 4, 5]) {
      expect(reviewSchema.safeParse({ ratingOverall: r }).success).toBe(true);
    }
  });
});

describe('reviewSchema — boundaries', () => {
  it('rejects rating 0', () => {
    expect(reviewSchema.safeParse({ ratingOverall: 0 }).success).toBe(false);
  });

  it('rejects rating 6', () => {
    expect(reviewSchema.safeParse({ ratingOverall: 6 }).success).toBe(false);
  });

  it('rejects negative rating', () => {
    expect(reviewSchema.safeParse({ ratingOverall: -1 }).success).toBe(false);
  });

  it('rejects fractional rating', () => {
    expect(reviewSchema.safeParse({ ratingOverall: 4.5 }).success).toBe(false);
  });

  it('rejects rating as string', () => {
    expect(
      reviewSchema.safeParse({ ratingOverall: '5' as unknown as number }).success
    ).toBe(false);
  });

  it('rejects missing ratingOverall', () => {
    expect(reviewSchema.safeParse({ comment: 'ممتاز' }).success).toBe(false);
  });

  it('rejects optional rating outside 1-5', () => {
    expect(
      reviewSchema.safeParse({ ratingOverall: 5, ratingQuality: 0 }).success
    ).toBe(false);
    expect(
      reviewSchema.safeParse({ ratingOverall: 5, ratingQuality: 6 }).success
    ).toBe(false);
  });
});
