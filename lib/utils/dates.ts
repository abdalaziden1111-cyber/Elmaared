// Date math helpers used across deadlines, validity windows, and the
// auto-approve-deliveries cron. Everything is timezone-naive and works on
// UTC ms — the platform is single-region (Saudi Arabia, no DST) so we
// don't pay the cost of carrying a tz library. All inputs go through
// toValidDate() so callers can hand us strings, Dates, or null.

export const ONE_MINUTE_MS = 60_000;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export function toValidDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Whole days between two dates, ignoring time-of-day. Result is always ≥ 0. */
export function daysBetween(
  a: Date | string | null | undefined,
  b: Date | string | null | undefined
): number | null {
  const da = toValidDate(a);
  const db = toValidDate(b);
  if (!da || !db) return null;
  const diff = Math.abs(da.getTime() - db.getTime());
  return Math.floor(diff / ONE_DAY_MS);
}

export function isPastDate(value: Date | string | null | undefined, now: Date = new Date()): boolean {
  const d = toValidDate(value);
  if (!d) return false;
  return d.getTime() < now.getTime();
}

export function isFutureDate(value: Date | string | null | undefined, now: Date = new Date()): boolean {
  const d = toValidDate(value);
  if (!d) return false;
  return d.getTime() > now.getTime();
}

/**
 * True when `value` falls within the next N days from `now` (inclusive of
 * "now"). Useful for deadline-warning UI ("less than 3 days left").
 * Negative N is treated as zero.
 */
export function isWithinNextDays(
  value: Date | string | null | undefined,
  n: number,
  now: Date = new Date()
): boolean {
  const d = toValidDate(value);
  if (!d) return false;
  if (!Number.isFinite(n)) return false;
  const days = Math.max(0, n);
  const cutoff = now.getTime() + days * ONE_DAY_MS;
  return d.getTime() >= now.getTime() && d.getTime() <= cutoff;
}

/**
 * True when `value` is older than N days from `now`. Used by the
 * auto-approve-deliveries cron to find deliveries that have been
 * sitting unreviewed.
 */
export function isOlderThanNDays(
  value: Date | string | null | undefined,
  n: number,
  now: Date = new Date()
): boolean {
  const d = toValidDate(value);
  if (!d) return false;
  if (!Number.isFinite(n) || n < 0) return false;
  const cutoff = now.getTime() - n * ONE_DAY_MS;
  return d.getTime() < cutoff;
}

export function addDays(value: Date | string | null | undefined, n: number): Date | null {
  const d = toValidDate(value);
  if (!d) return null;
  if (!Number.isFinite(n)) return null;
  return new Date(d.getTime() + n * ONE_DAY_MS);
}

/**
 * Add N business days (Mon-Thu working week + Sun-Wed in some Saudi sectors,
 * but we use Mon-Fri to match common international vendor expectations).
 * Skips Saturday (6) and Sunday (0). Negative N walks backwards.
 */
export function addBusinessDays(value: Date | string | null | undefined, n: number): Date | null {
  const d = toValidDate(value);
  if (!d) return null;
  if (!Number.isFinite(n)) return null;

  const direction = n >= 0 ? 1 : -1;
  let remaining = Math.abs(Math.trunc(n));
  let current = new Date(d.getTime());

  while (remaining > 0) {
    current = new Date(current.getTime() + direction * ONE_DAY_MS);
    const dow = current.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      remaining -= 1;
    }
  }
  return current;
}

/** Returns the start-of-day UTC for the given date. Useful for "today" queries. */
export function startOfUtcDay(value: Date | string | null | undefined): Date | null {
  const d = toValidDate(value);
  if (!d) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
