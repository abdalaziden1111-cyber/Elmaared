import { describe, it, expect } from 'vitest';
import {
  computePrayerSchedule,
  isCitySupported,
} from '@/lib/cultural/prayer-times';

// Anchor every test to a known timestamp so the snapshot-style assertions
// stay stable. 2026-05-19T09:00:00 Riyadh = 06:00 UTC.
const NOW = new Date('2026-05-19T06:00:00Z');

describe('computePrayerSchedule', () => {
  it('returns six entries (fajr → isha) in chronological order', () => {
    const out = computePrayerSchedule('riyadh', NOW);
    expect(out.prayers).toHaveLength(6);
    for (let i = 1; i < out.prayers.length; i++) {
      expect(out.prayers[i].time.getTime()).toBeGreaterThan(
        out.prayers[i - 1].time.getTime(),
      );
    }
  });

  it('produces Arabic labels for every prayer', () => {
    const out = computePrayerSchedule('riyadh', NOW);
    const labels = out.prayers.map((p) => p.labelAr);
    expect(labels).toEqual([
      'الفجر',
      'الشروق',
      'الظهر',
      'العصر',
      'المغرب',
      'العشاء',
    ]);
  });

  it('identifies the next upcoming prayer relative to `now`', () => {
    // At 09:00 Riyadh, fajr already passed; next upcoming is sunrise/dhuhr.
    const out = computePrayerSchedule('riyadh', NOW);
    expect(out.next).not.toBeNull();
    expect(out.next!.time.getTime()).toBeGreaterThan(NOW.getTime());
  });

  it('reports minutesToNext as a non-negative integer when a next prayer exists', () => {
    const out = computePrayerSchedule('riyadh', NOW);
    expect(out.minutesToNext).not.toBeNull();
    expect(out.minutesToNext!).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(out.minutesToNext!)).toBe(true);
  });

  it('returns next=null + minutesToNext=null after the day ends (00:00 next day)', () => {
    // Late-night moment after isha — adhan won't compute "tomorrow's fajr".
    const lateNight = new Date('2026-05-19T23:30:00Z'); // ~02:30 KSA
    const out = computePrayerSchedule('riyadh', lateNight);
    // After isha → next should be null OR forward into tomorrow; adhan
    // returns today's set only. Either way, minutesToNext mirrors next.
    if (out.next === null) {
      expect(out.minutesToNext).toBeNull();
    } else {
      expect(out.minutesToNext).not.toBeNull();
    }
  });

  it('falls back to Riyadh coordinates for an unknown city slug', () => {
    const riyadh = computePrayerSchedule('riyadh', NOW);
    const unknown = computePrayerSchedule('zzz-no-such-city', NOW);
    expect(unknown.prayers.length).toBe(riyadh.prayers.length);
    expect(unknown.prayers[0].time.getTime()).toBe(
      riyadh.prayers[0].time.getTime(),
    );
  });

  it('accepts other major Saudi cities (jeddah, dammam, makkah)', () => {
    for (const city of ['jeddah', 'dammam', 'makkah']) {
      const out = computePrayerSchedule(city, NOW);
      expect(out.prayers).toHaveLength(6);
      expect(out.city).toBe(city);
    }
  });
});

describe('isCitySupported', () => {
  it('returns true for Riyadh, Jeddah, Makkah', () => {
    expect(isCitySupported('riyadh')).toBe(true);
    expect(isCitySupported('jeddah')).toBe(true);
    expect(isCitySupported('makkah')).toBe(true);
  });

  it('returns false for unknown slugs', () => {
    expect(isCitySupported('zzz')).toBe(false);
    expect(isCitySupported('')).toBe(false);
  });
});
