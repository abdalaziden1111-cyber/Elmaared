'use client';

import { useEffect, useState } from 'react';
import { Sunrise, Moon } from 'lucide-react';
import { computePrayerSchedule } from '@/lib/cultural/prayer-times';

/**
 * Prayer Times widget (UX Plan v2 §6, Sprint 4 S4.4).
 *
 * Shows the five prayers (+sunrise) for a Saudi city with a live
 * countdown to the next one. Used on the Day-of event console
 * (when that page lands) and as an optional sidebar widget on any
 * project execution surface — exhibitions in KSA pause for prayer,
 * so this is operational information, not decoration.
 *
 * Behavior:
 * - Server-pure schedule via `computePrayerSchedule` (lib/cultural).
 * - Client-side: re-computes the schedule every 30 seconds so the
 *   "next prayer" + countdown stays accurate.
 * - Compact variant: a single pill ("الظهر بعد ١٢ دقيقة") for tight
 *   surfaces like the header. Full variant: card with all six entries
 *   highlighted by which is upcoming.
 */

interface Props {
  /** City slug — defaults to Riyadh when unrecognised. */
  city?: string;
  /** Compact pill variant (header strip, navbar). */
  compact?: boolean;
  className?: string;
}

const HHMM = new Intl.DateTimeFormat('ar-SA', {
  hour: '2-digit',
  minute: '2-digit',
});

export function PrayerTimesWidget({
  city = 'riyadh',
  compact = false,
  className = '',
}: Props) {
  const [now, setNow] = useState(() => new Date());

  // Re-tick every 30s. Fine for "minutes-to-next" granularity; cheaper
  // than per-second updates and avoids unnecessary re-renders.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const schedule = computePrayerSchedule(city, now);

  if (compact) {
    if (!schedule.next || schedule.minutesToNext == null) {
      return (
        <span
          data-component="prayer-times-widget"
          data-variant="compact"
          className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs font-medium text-[var(--color-stone-600)] ${className}`}
        >
          <Moon className="size-3.5" aria-hidden />
          الصلاة التالية: الفجر غداً
        </span>
      );
    }
    return (
      <span
        data-component="prayer-times-widget"
        data-variant="compact"
        className={`inline-flex items-center gap-1.5 rounded-full bg-[var(--color-action-blue)]/10 px-3 py-1 text-xs font-medium text-[var(--color-action-blue)] ${className}`}
        title={`${schedule.next.labelAr}: ${HHMM.format(schedule.next.time)}`}
      >
        <Sunrise className="size-3.5" aria-hidden />
        {schedule.next.labelAr} بعد <span className="num">{schedule.minutesToNext}</span> دقيقة
      </span>
    );
  }

  return (
    <section
      data-component="prayer-times-widget"
      data-variant="full"
      className={`rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 ${className}`}
      aria-label="مواقيت الصلاة"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          مواقيت الصلاة اليوم
        </h3>
        {schedule.next && schedule.minutesToNext != null ? (
          <span className="rounded-full bg-[var(--color-action-blue)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--color-action-blue)]">
            {schedule.next.labelAr} بعد <span className="num">{schedule.minutesToNext}</span> دقيقة
          </span>
        ) : null}
      </header>
      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {schedule.prayers.map((p) => {
          const isNext = schedule.next?.name === p.name;
          return (
            <li
              key={p.name}
              data-prayer={p.name}
              data-next={isNext}
              className={`flex items-center justify-between rounded-xl px-3 py-2 ${
                isNext
                  ? 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)] ring-1 ring-[var(--color-action-blue)]/30'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]'
              }`}
            >
              <span className="text-xs font-semibold">{p.labelAr}</span>
              <span className="num text-xs font-medium">{HHMM.format(p.time)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
