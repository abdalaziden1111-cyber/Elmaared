// Saudi mobile-number normalizer. Schema validation expects exactly
// `+966\d{9}`, but real users enter numbers in many formats:
//   - 0512345678         (local with leading zero)
//   - 512345678          (local without zero)
//   - 00966512345678     (international with 00)
//   - +966 51 234 5678   (with spaces)
//   - +966-51-234-5678   (with dashes)
//
// `normalizeSaudiPhone` collapses all of those into the canonical form when
// possible, and returns null when the digits clearly don't fit Saudi mobile.

const SAUDI_MOBILE_LENGTH = 9;

export function normalizeSaudiPhone(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;

  // Strip everything except digits and the leading + (for +966 detection)
  const cleaned = input.trim().replace(/[\s\-()]/g, '');
  if (cleaned.length === 0) return null;

  let digits: string;
  if (cleaned.startsWith('+966')) {
    digits = cleaned.slice(4);
  } else if (cleaned.startsWith('00966')) {
    digits = cleaned.slice(5);
  } else if (cleaned.startsWith('966')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    digits = cleaned.slice(1);
  } else {
    digits = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  }

  // After stripping the country/prefix, the remainder must be exactly
  // 9 digits, all numeric. Saudi mobiles start with 5 — we don't enforce
  // that here (some vendors also issue numbers starting with other digits)
  // but the length and digit-only check catches the common typos.
  if (!/^\d+$/.test(digits)) return null;
  if (digits.length !== SAUDI_MOBILE_LENGTH) return null;

  return `+966${digits}`;
}

export function isValidSaudiPhone(input: string | null | undefined): boolean {
  return normalizeSaudiPhone(input) !== null;
}
