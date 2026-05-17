'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { submitReviewAction } from '@/app/actions/review';
import type { ActionResult } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { Star } from 'lucide-react';

// Post-completion client→supplier review. Visible only when:
//   - RFQ status is 'completed'
//   - The client hasn't already submitted a review for this RFQ
// Server action validates ratings (1-5) and ownership.

const SUB_RATINGS: { name: string; label: string }[] = [
  { name: 'ratingQuality', label: 'جودة التنفيذ' },
  { name: 'ratingTimeliness', label: 'الالتزام بالموعد' },
  { name: 'ratingCommunication', label: 'التواصل' },
  { name: 'ratingFlexibility', label: 'المرونة' },
  { name: 'ratingPriceValue', label: 'القيمة مقابل السعر' },
];

export function ReviewForm({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitReviewAction,
    null
  );
  const [overall, setOverall] = useState(0);
  const [sub, setSub] = useState<Record<string, number>>({});

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = !state?.ok ? state?.fieldErrors ?? {} : {};

  return (
    <form noValidate action={formAction} className="grid gap-4">
      <input type="hidden" name="rfqId" value={rfqId} />
      <input type="hidden" name="ratingOverall" value={overall} />
      {Object.entries(sub).map(([name, val]) => (
        <input key={name} type="hidden" name={name} value={val} />
      ))}

      <fieldset>
        <legend className="text-sm font-medium">التقييم العام *</legend>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          من 1 (سيئ) إلى 5 (ممتاز)
        </p>
        <StarRow value={overall} onChange={setOverall} />
        {fieldErrors.ratingOverall ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">
            {fieldErrors.ratingOverall[0]}
          </p>
        ) : null}
      </fieldset>

      <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h3 className="text-sm font-medium text-[var(--color-midnight-green)]">
          تفاصيل أكثر (اختياري)
        </h3>
        <div className="mt-3 grid gap-3">
          {SUB_RATINGS.map((r) => (
            <fieldset key={r.name} className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-xs text-[var(--color-stone-600)]">{r.label}</legend>
              <StarRow
                value={sub[r.name] ?? 0}
                onChange={(v) =>
                  setSub((prev) => ({ ...prev, [r.name]: v }))
                }
                small
              />
            </fieldset>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="comment" className="text-xs text-[var(--color-stone-600)]">
          تعليق (اختياري)
        </label>
        <textarea
          id="comment"
          name="comment"
          rows={4}
          maxLength={2000}
          placeholder="شارك تجربتك مع هذا المورد. سيرى الموردون الآخرون هذا التقييم على ملفه العام."
          className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
      </div>

      {state && !state.ok ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-100)] p-3 text-sm text-[var(--color-success)]"
        >
          شكراً لتقييمك. سيظهر على الملف العام للمورد.
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton disabled={overall < 1 || state?.ok === true}>
          أرسل التقييم
        </SubmitButton>
      </div>
    </form>
  );
}

function StarRow({
  value,
  onChange,
  small,
}: {
  value: number;
  onChange: (v: number) => void;
  small?: boolean;
}) {
  const size = small ? 'size-5' : 'size-7';
  return (
    <div role="radiogroup" className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} من 5`}
            onClick={() => onChange(n)}
            className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            <Star
              className={`${size} transition-colors ${
                active
                  ? 'fill-[var(--color-dune-gold)] text-[var(--color-dune-gold)]'
                  : 'text-[var(--color-stone-300)]'
              }`}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
