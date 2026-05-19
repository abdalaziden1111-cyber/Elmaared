/**
 * Hijri-calendar helpers (UX Plan v2 §6, Sprint 4 S4.1).
 *
 * Built on Intl.DateTimeFormat with the Umm al-Qura calendar
 * (`u-ca-islamic-umalqura`) — Saudi Arabia's official lunar calendar.
 * No third-party library: the Intl polyfill in Node 22 + every modern
 * browser ships Umm al-Qura support, so we avoid the ~30kB
 * `hijri-converter` dep when standard Intl will do.
 *
 * Why a dedicated module instead of cramming this into `format.ts`:
 * - `format.ts` is pure presentation. This file does math (extract
 *   year/month/day from a Date, detect Ramadan).
 * - Future Ramadan-mode triggers (notifications, banners) will read
 *   `isRamadan(date)` directly.
 */

export type HijriParts = {
  year: number;
  /** 1-based: 1=Muharram … 9=Ramadan … 12=Dhul Hijjah. */
  month: number;
  day: number;
};

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

/**
 * Extract Hijri year/month/day for a given Gregorian Date. Uses
 * Intl.DateTimeFormat under the hood — same engine the rest of the app
 * relies on, so the values stay consistent with what users see.
 */
export function toHijriParts(date: Date | string): HijriParts {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return { year: 0, month: 0, day: 0 };
  }
  const parts = PARTS_FORMATTER.formatToParts(d);
  let year = 0;
  let month = 0;
  let day = 0;
  for (const p of parts) {
    if (p.type === 'year') year = Number(p.value);
    else if (p.type === 'month') month = Number(p.value);
    else if (p.type === 'day') day = Number(p.value);
  }
  return { year, month, day };
}

/**
 * True when the given Gregorian date falls inside Ramadan (Hijri month 9).
 * Used by S4.6's Ramadan-mode auto-detection. Cheap enough to call on every
 * server render — `toHijriParts` is a single Intl format.
 */
export function isRamadan(date: Date | string = new Date()): boolean {
  return toHijriParts(date).month === 9;
}

/**
 * "١٥ شعبان ١٤٤٧" — long-form Hijri date used inline by `formatHijri()` in
 * format.ts. Exported here so callers that want the Hijri-only string
 * (no Gregorian parenthetical) can grab it directly.
 */
export function formatHijriLong(
  date: Date | string,
  locale: 'ar' | 'en' = 'ar',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-SA-u-ca-islamic-umalqura' : 'en-u-ca-islamic-umalqura',
    { year: 'numeric', month: 'long', day: 'numeric' },
  ).format(d);
}
