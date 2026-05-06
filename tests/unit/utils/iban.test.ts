import { describe, it, expect } from 'vitest';
import { isValidSaudiIban, normalizeIban } from '@/lib/utils/iban';

// These IBANs are real published Saudi-bank example IBANs (test/sample
// publications, not real customer accounts). They pass mod-97.
const VALID_SAUDI_IBAN = 'SA0380000000608010167519'; // SAMA published example
const VALID_SAUDI_IBAN_WITH_SPACES = 'SA03 8000 0000 6080 1016 7519';

describe('normalizeIban', () => {
  it('strips whitespace', () => {
    expect(normalizeIban('SA03 8000 0000')).toBe('SA0380000000');
  });

  it('uppercases', () => {
    expect(normalizeIban('sa0380000000608010167519')).toBe(VALID_SAUDI_IBAN);
  });

  it('returns empty for null/undefined/empty', () => {
    expect(normalizeIban(null)).toBe('');
    expect(normalizeIban(undefined)).toBe('');
    expect(normalizeIban('')).toBe('');
  });
});

describe('isValidSaudiIban — happy paths', () => {
  it('accepts the canonical example', () => {
    expect(isValidSaudiIban(VALID_SAUDI_IBAN)).toBe(true);
  });

  it('accepts spaced format', () => {
    expect(isValidSaudiIban(VALID_SAUDI_IBAN_WITH_SPACES)).toBe(true);
  });

  it('accepts lowercase', () => {
    expect(isValidSaudiIban(VALID_SAUDI_IBAN.toLowerCase())).toBe(true);
  });
});

describe('isValidSaudiIban — denials', () => {
  it('rejects empty/null/undefined', () => {
    expect(isValidSaudiIban('')).toBe(false);
    expect(isValidSaudiIban(null)).toBe(false);
    expect(isValidSaudiIban(undefined)).toBe(false);
  });

  it('rejects non-Saudi country code', () => {
    expect(isValidSaudiIban('AE070331234567890123456')).toBe(false);
  });

  it('rejects too-short', () => {
    expect(isValidSaudiIban('SA1234')).toBe(false);
  });

  it('rejects too-long', () => {
    expect(isValidSaudiIban('SA0380000000608010167519XYZ')).toBe(false);
  });

  it('rejects letters in the BBAN', () => {
    expect(isValidSaudiIban('SA038000000060801016751A')).toBe(false);
  });

  it('rejects mod-97 mismatch (single-digit transposition)', () => {
    // Transpose two digits in the valid IBAN — the checksum should fail.
    // 'SA0380000000608010167519' → swap 19 → 91 at the end
    expect(isValidSaudiIban('SA0380000000608010167591')).toBe(false);
  });

  it('rejects all-zeros body (will fail mod-97)', () => {
    expect(isValidSaudiIban('SA0000000000000000000000')).toBe(false);
  });

  it('rejects garbage with right length', () => {
    expect(isValidSaudiIban('SAxxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
  });

  it('rejects valid format but wrong check digits', () => {
    // Replace the check digits 03 with 04 — should fail mod-97
    expect(isValidSaudiIban('SA0480000000608010167519')).toBe(false);
  });
});
