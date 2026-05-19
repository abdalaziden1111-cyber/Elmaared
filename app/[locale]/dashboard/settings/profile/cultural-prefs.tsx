'use client';

import { useState } from 'react';
import {
  HijriToggle,
  NumeralsToggle,
  type CalendarPreference,
  type NumeralsPreference,
} from '@/components/cultural/preference-toggles';

// Tiny client wrapper for Phase U4.2 — holds the optimistic state for the
// two toggles so they can highlight the just-picked option immediately
// while the server action persists in the background. Without this the
// toggles would have to live in the page (which is a server component)
// and couldn't react to clicks until a router refresh.

interface Props {
  initialCalendar: CalendarPreference;
  initialNumerals: NumeralsPreference;
}

export function CulturalPreferences({ initialCalendar, initialNumerals }: Props) {
  const [calendar, setCalendar] = useState<CalendarPreference>(initialCalendar);
  const [numerals, setNumerals] = useState<NumeralsPreference>(initialNumerals);

  return (
    <div className="mt-8">
      <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
        تفضيلات العرض
      </h2>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        كيف تريد رؤية التواريخ والأرقام في كل صفحات Elmaared. التغيير يحتاج
        تحديث الصفحة لينعكس على البيانات المحمَّلة من الخادم.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <HijriToggle value={calendar} onChange={setCalendar} />
        <NumeralsToggle value={numerals} onChange={setNumerals} />
      </div>
    </div>
  );
}
