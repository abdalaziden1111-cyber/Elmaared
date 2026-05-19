'use client';

import { useTransition } from 'react';
import { Calendar, Hash } from 'lucide-react';
import { toast } from 'sonner';
import { updateCulturalPreferencesAction } from '@/app/actions/cultural-preferences';

/**
 * Twin toggles for the Saudi Cultural Layer preferences (Sprint 4 S4.2).
 *
 * - `<HijriToggle>` flips Hijri ↔ Gregorian as the default date display.
 * - `<NumeralsToggle>` flips Arabic-Indic (١٢٣) ↔ Latin (123) digits.
 *
 * Both write to `profiles.preferred_calendar` / `preferred_numerals` via
 * one server action. They live side-by-side in the Settings page but are
 * exported separately so a future onboarding flow can show them at
 * different moments.
 *
 * State is controlled by the parent (which loads the current value from
 * the profile server-side). After a successful save we show a Sonner
 * toast confirming the change — the actual visual effect requires a
 * page refresh because most date/number renders are RSC-cached. The
 * toast hints at this without forcing a reload.
 */

export type CalendarPreference = 'hijri' | 'gregorian';
export type NumeralsPreference = 'arabic-indic' | 'latin';

interface HijriToggleProps {
  value: CalendarPreference;
  /** Called with the new value before persistence completes (optimistic). */
  onChange?: (next: CalendarPreference) => void;
}

interface NumeralsToggleProps {
  value: NumeralsPreference;
  onChange?: (next: NumeralsPreference) => void;
}

export function HijriToggle({ value, onChange }: HijriToggleProps) {
  const [pending, startTransition] = useTransition();

  function pick(next: CalendarPreference) {
    if (next === value) return;
    onChange?.(next);
    startTransition(async () => {
      const res = await updateCulturalPreferencesAction({ calendar: next });
      if (res.ok) {
        toast.success(
          next === 'hijri'
            ? 'سيُعرض التاريخ هجرياً افتراضياً. حدّث الصفحة لرؤية التغيير.'
            : 'سيُعرض التاريخ ميلادياً افتراضياً. حدّث الصفحة لرؤية التغيير.',
        );
      } else {
        toast.error(res.error ?? 'تعذّر حفظ التفضيل.');
      }
    });
  }

  return (
    <fieldset
      data-component="hijri-toggle"
      className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
    >
      <legend className="px-2 text-sm font-semibold text-[var(--color-midnight-green)]">
        <Calendar className="me-1 inline size-4 align-text-bottom" aria-hidden />
        نظام التاريخ
      </legend>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-stone-600)]">
        التواريخ في Elmaared تظهر بالتقويم الهجري افتراضياً مع التقويم الميلادي
        بين قوسين. يمكنك عكس هذا الترتيب.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <PickerButton
          active={value === 'hijri'}
          disabled={pending}
          onClick={() => pick('hijri')}
          title="هجري"
          example="١٥ شعبان ١٤٤٧"
        />
        <PickerButton
          active={value === 'gregorian'}
          disabled={pending}
          onClick={() => pick('gregorian')}
          title="ميلادي"
          example="٢٤ فبراير ٢٠٢٦"
        />
      </div>
    </fieldset>
  );
}

export function NumeralsToggle({ value, onChange }: NumeralsToggleProps) {
  const [pending, startTransition] = useTransition();

  function pick(next: NumeralsPreference) {
    if (next === value) return;
    onChange?.(next);
    startTransition(async () => {
      const res = await updateCulturalPreferencesAction({ numerals: next });
      if (res.ok) {
        toast.success(
          next === 'arabic-indic'
            ? 'الأرقام ستظهر بالعربية (١٢٣). حدّث الصفحة لرؤية التغيير.'
            : 'الأرقام ستظهر باللاتينية (123). حدّث الصفحة لرؤية التغيير.',
        );
      } else {
        toast.error(res.error ?? 'تعذّر حفظ التفضيل.');
      }
    });
  }

  return (
    <fieldset
      data-component="numerals-toggle"
      className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
    >
      <legend className="px-2 text-sm font-semibold text-[var(--color-midnight-green)]">
        <Hash className="me-1 inline size-4 align-text-bottom" aria-hidden />
        نظام الأرقام
      </legend>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-stone-600)]">
        المبالغ والكميات تظهر بالأرقام العربية (١٢٣) افتراضياً. يمكنك
        التبديل للأرقام اللاتينية إذا كنتِ تفضّلينها.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <PickerButton
          active={value === 'arabic-indic'}
          disabled={pending}
          onClick={() => pick('arabic-indic')}
          title="عربية"
          example="١٢٣"
        />
        <PickerButton
          active={value === 'latin'}
          disabled={pending}
          onClick={() => pick('latin')}
          title="لاتينية"
          example="123"
        />
      </div>
    </fieldset>
  );
}

function PickerButton({
  active,
  disabled,
  onClick,
  title,
  example,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  title: string;
  example: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-active={active}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
        active
          ? 'border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5'
          : 'border-[var(--color-stone-300)] bg-white hover:border-[var(--color-action-blue)]'
      } disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className="text-sm font-semibold">{title}</span>
      <span className="text-xs text-[var(--color-stone-600)] num">{example}</span>
    </button>
  );
}
