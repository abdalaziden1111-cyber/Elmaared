// Money helpers that avoid the floating-point drift you get when you
// naively divide by 3. SAR amounts are tracked in 2-decimal precision
// so we work in halalas (1/100) under the hood and convert at the edges.

const ROUND_DECIMALS = 2;

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function toHalalas(amount: number): number {
  return Math.round(amount * 100);
}

function fromHalalas(halalas: number): number {
  return roundCents(halalas / 100);
}

/**
 * Splits `amount` into `parts` portions whose sum equals `amount` exactly
 * (no penny lost or gained to rounding). Earlier portions absorb the
 * remainder so e.g. splitting 10.00 into 3 returns [3.34, 3.33, 3.33].
 */
export function splitMoneyEvenly(amount: number, parts: number): number[] {
  if (!Number.isFinite(amount)) return [];
  if (!Number.isInteger(parts) || parts <= 0) return [];

  const totalHalalas = toHalalas(amount);
  const base = Math.floor(totalHalalas / parts);
  const remainder = totalHalalas - base * parts;

  const result: number[] = new Array(parts);
  for (let i = 0; i < parts; i++) {
    const halalas = base + (i < remainder ? 1 : 0);
    result[i] = fromHalalas(halalas);
  }
  return result;
}

/**
 * Returns `rate * amount` rounded to halala precision. Throws on
 * non-finite inputs because percentage math on NaN is meaningless and
 * silently propagating NaN would corrupt downstream totals.
 */
export function percentOf(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate)) {
    throw new Error('percentOf requires finite numbers');
  }
  return roundCents(amount * rate);
}

/** Sum a list of money values, robust to floating-point accumulation. */
export function sumMoney(values: ReadonlyArray<number>): number {
  if (!Array.isArray(values)) return 0;
  let total = 0;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    total += toHalalas(v);
  }
  return fromHalalas(total);
}

/** Compare two money values for equality at halala precision. */
export function moneyEquals(a: number, b: number): boolean {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return toHalalas(a) === toHalalas(b);
}
