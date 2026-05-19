/**
 * Prayer times helper (UX Plan v2 §6, Sprint 4 S4.4).
 *
 * Computed locally via `adhan` — no external API, no rate limits, no
 * outage to worry about. The `adhan` library implements the Umm al-Qura
 * calculation method which matches Saudi Arabia's official prayer
 * timetable. Same numbers Saudi users see in their phone's clock app.
 *
 * The pure-helper layer here is server-component-safe; the widget that
 * consumes it (PrayerTimesWidget) lives behind a `'use client'` directive
 * because it ticks a countdown.
 */

import {
  CalculationMethod,
  Coordinates,
  Madhab,
  PrayerTimes,
} from 'adhan';

export type PrayerName = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface PrayerEntry {
  name: PrayerName;
  /** Localized Arabic label — what the UI renders. */
  labelAr: string;
  time: Date;
}

export interface PrayerSchedule {
  city: string;
  /** Six entries (fajr→isha) ordered chronologically. */
  prayers: PrayerEntry[];
  /** Next upcoming prayer relative to `now`; null after isha. */
  next: PrayerEntry | null;
  /** Minutes from now to `next.time`; null when next is null. */
  minutesToNext: number | null;
}

// Major Saudi cities + their lat/lng. Add more here as the marketplace
// expands. The widget falls back to Riyadh when an unknown city slug
// arrives (defensive — user shouldn't see "city not supported").
const CITY_COORDINATES: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753],
  jeddah: [21.4858, 39.1925],
  makkah: [21.4225, 39.8262],
  madinah: [24.4709, 39.6111],
  dammam: [26.3927, 49.9777],
  khobar: [26.2172, 50.1971],
  taif: [21.2854, 40.4183],
  abha: [18.2164, 42.5053],
  tabuk: [28.3998, 36.5715],
};

const NAME_AR: Record<PrayerName, string> = {
  fajr: 'الفجر',
  sunrise: 'الشروق',
  dhuhr: 'الظهر',
  asr: 'العصر',
  maghrib: 'المغرب',
  isha: 'العشاء',
};

/**
 * Compute today's six prayer entries for a Saudi city + identify the next
 * one relative to `now` (defaults to current time). Pure: same input →
 * same output.
 */
export function computePrayerSchedule(
  citySlug: string,
  now: Date = new Date(),
): PrayerSchedule {
  const coords = CITY_COORDINATES[citySlug] ?? CITY_COORDINATES.riyadh;
  const [lat, lng] = coords;
  const coordinates = new Coordinates(lat, lng);
  // Umm al-Qura matches the Saudi Ministry of Islamic Affairs schedule.
  const params = CalculationMethod.UmmAlQura();
  params.madhab = Madhab.Shafi;
  const date = new Date(now);
  const pt = new PrayerTimes(coordinates, date, params);

  const prayers: PrayerEntry[] = [
    { name: 'fajr', labelAr: NAME_AR.fajr, time: pt.fajr },
    { name: 'sunrise', labelAr: NAME_AR.sunrise, time: pt.sunrise },
    { name: 'dhuhr', labelAr: NAME_AR.dhuhr, time: pt.dhuhr },
    { name: 'asr', labelAr: NAME_AR.asr, time: pt.asr },
    { name: 'maghrib', labelAr: NAME_AR.maghrib, time: pt.maghrib },
    { name: 'isha', labelAr: NAME_AR.isha, time: pt.isha },
  ];

  const next = prayers.find((p) => p.time.getTime() > now.getTime()) ?? null;
  const minutesToNext = next
    ? Math.round((next.time.getTime() - now.getTime()) / 60_000)
    : null;

  return {
    city: citySlug,
    prayers,
    next,
    minutesToNext,
  };
}

/** Whether a given citySlug is recognised. Mostly for tests + UI hints. */
export function isCitySupported(slug: string): boolean {
  return slug in CITY_COORDINATES;
}
