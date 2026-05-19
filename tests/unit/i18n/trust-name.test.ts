import { describe, it, expect } from 'vitest';
import {
  trustName,
  inTrustStatusLabel,
  trustLegalTooltip,
} from '@/lib/i18n/trust-name';

// Plan v2 Decision #04 — "أمانة Elmaared™" is the canonical default after
// Sprint 1 S1.0 (the FF_AMANAH flag was retired). These tests assert the
// canonical names only — there is no longer a v1 fallback path.

describe('trustName', () => {
  it('returns "أمانة Elmaared™" in Arabic', () => {
    expect(trustName('ar')).toBe('أمانة Elmaared™');
  });

  it('returns "Elmaared Trust™" in English', () => {
    expect(trustName('en')).toBe('Elmaared Trust™');
  });

  it('defaults to Arabic when no locale is passed', () => {
    expect(trustName()).toBe('أمانة Elmaared™');
  });
});

describe('inTrustStatusLabel', () => {
  it('returns "قيد أمانة Elmaared" in Arabic', () => {
    expect(inTrustStatusLabel('ar')).toBe('قيد أمانة Elmaared');
  });

  it('returns "In Elmaared Trust" in English', () => {
    expect(inTrustStatusLabel('en')).toBe('In Elmaared Trust');
  });
});

describe('trustLegalTooltip', () => {
  it('mentions "Escrow Service" in Arabic for legal disambiguation', () => {
    expect(trustLegalTooltip('ar')).toContain('Escrow Service');
  });

  it('mentions "Escrow Service" in English for legal disambiguation', () => {
    expect(trustLegalTooltip('en')).toContain('Escrow Service');
  });
});
