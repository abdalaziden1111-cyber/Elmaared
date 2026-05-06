// Real Saudi IBAN validator using the ISO-7064 mod-97 checksum, not just a
// prefix-and-length regex. This catches transposition typos (the most common
// IBAN data-entry mistake) before we ever try to push a payout.
//
// Saudi IBAN format:
//   SA + 2 check digits + 22 BBAN digits = 24 chars total
//
// mod-97 algorithm:
//   1. Move the first 4 chars (country + check) to the end.
//   2. Replace each letter with its A=10..Z=35 numeric value.
//   3. The resulting big integer must be ≡ 1 (mod 97) for the IBAN to be valid.

const SAUDI_LENGTH = 24;
const SAUDI_PREFIX = 'SA';

export function normalizeIban(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/\s+/g, '').toUpperCase();
}

/**
 * Returns true only when `iban` is a 24-char Saudi IBAN that passes the
 * mod-97 checksum. Whitespace is stripped, lowercase is accepted.
 *
 * Empty / null / non-string inputs return false rather than throwing —
 * useful in "rejects invalid IBAN" form-validation paths where the schema
 * already handles required-vs-optional separately.
 */
export function isValidSaudiIban(input: string | null | undefined): boolean {
  const iban = normalizeIban(input);
  if (iban.length !== SAUDI_LENGTH) return false;
  if (!iban.startsWith(SAUDI_PREFIX)) return false;
  // Check digits + BBAN must be all digits (Saudi IBANs have no letters in BBAN)
  const tail = iban.slice(2);
  if (!/^\d{22}$/.test(tail)) return false;

  // mod-97
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (ch) =>
    String(ch.charCodeAt(0) - 55) // 'A' (65) → "10"
  );

  // Big integer mod-97 done in chunks because JS numbers can't hold 26 digits.
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = String(remainder) + numeric.slice(i, i + 7);
    remainder = Number(chunk) % 97;
  }
  return remainder === 1;
}
