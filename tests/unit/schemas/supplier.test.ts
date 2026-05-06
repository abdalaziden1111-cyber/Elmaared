import { describe, it, expect } from 'vitest';
import { supplierProfileSchema, portfolioItemSchema } from '@/schemas/supplier';

describe('supplierProfileSchema', () => {
  const valid = {
    companyName: 'شركة ابتكار',
    specializations: ['booth' as const],
    cities: ['Riyadh'],
  };

  it('accepts minimal valid profile', () => {
    expect(supplierProfileSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects single-char company name', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, companyName: 'A' }).success
    ).toBe(false);
  });

  it('rejects empty specializations', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, specializations: [] }).success
    ).toBe(false);
  });

  it('rejects empty cities', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, cities: [] }).success
    ).toBe(false);
  });

  it('accepts all 4 specializations', () => {
    expect(
      supplierProfileSchema.safeParse({
        ...valid,
        specializations: ['booth', 'gifts', 'event', 'printing'],
      }).success
    ).toBe(true);
  });

  it('accepts website URL', () => {
    expect(
      supplierProfileSchema.safeParse({
        ...valid,
        website: 'https://example.sa',
      }).success
    ).toBe(true);
  });

  it('accepts empty website (literal)', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, website: '' }).success
    ).toBe(true);
  });

  it('rejects invalid website URL', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, website: 'not a url' }).success
    ).toBe(false);
  });

  it('rejects negative team size', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, teamSize: -1 }).success
    ).toBe(false);
  });

  it('accepts zero years of experience', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, yearsOfExperience: 0 }).success
    ).toBe(true);
  });

  it('rejects negative years of experience', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, yearsOfExperience: -1 }).success
    ).toBe(false);
  });

  it('rejects negative min order value', () => {
    expect(
      supplierProfileSchema.safeParse({ ...valid, minOrderValue: -100 }).success
    ).toBe(false);
  });

  it('accepts valid SA IBAN', () => {
    expect(
      supplierProfileSchema.safeParse({
        ...valid,
        iban: 'SA0380000000608010167519',
      }).success
    ).toBe(true);
  });

  it('rejects non-SA IBAN', () => {
    expect(
      supplierProfileSchema.safeParse({
        ...valid,
        iban: 'AE0380000000608010167519',
      }).success
    ).toBe(false);
  });
});

describe('portfolioItemSchema', () => {
  it('accepts minimal valid item', () => {
    expect(
      portfolioItemSchema.safeParse({ title: 'مشروع 2025' }).success
    ).toBe(true);
  });

  it('rejects single-char title', () => {
    expect(portfolioItemSchema.safeParse({ title: 'A' }).success).toBe(false);
  });

  it('rejects missing title', () => {
    expect(portfolioItemSchema.safeParse({}).success).toBe(false);
  });

  it('accepts each service type', () => {
    for (const t of ['booth', 'gifts', 'event', 'printing'] as const) {
      expect(
        portfolioItemSchema.safeParse({ title: 'مشروع', serviceType: t }).success
      ).toBe(true);
    }
  });

  it('accepts year within bounds', () => {
    expect(
      portfolioItemSchema.safeParse({ title: 'مشروع', year: 2026 }).success
    ).toBe(true);
  });

  it('rejects year before 2015', () => {
    expect(
      portfolioItemSchema.safeParse({ title: 'مشروع', year: 2014 }).success
    ).toBe(false);
  });

  it('rejects year after 2030', () => {
    expect(
      portfolioItemSchema.safeParse({ title: 'مشروع', year: 2031 }).success
    ).toBe(false);
  });

  it('rejects fractional year', () => {
    expect(
      portfolioItemSchema.safeParse({ title: 'مشروع', year: 2026.5 }).success
    ).toBe(false);
  });
});
