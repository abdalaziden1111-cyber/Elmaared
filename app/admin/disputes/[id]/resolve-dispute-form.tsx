'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminResolveDisputeAction } from '@/app/actions/review';
import { Loader2 } from 'lucide-react';

type Favor = 'client' | 'supplier' | 'shared';
type ResumeStatus = 'in_progress' | 'completed' | 'cancelled';

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [favor, setFavor] = useState<Favor>('client');
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('completed');

  function submit(formData: FormData) {
    setError(null);
    const resolution = (formData.get('resolution') ?? '').toString();
    const refundRaw = (formData.get('refundDecision') ?? '').toString();
    const refund = refundRaw === '' ? null : Number(refundRaw);

    startTransition(async () => {
      const r = await adminResolveDisputeAction({
        disputeId,
        resolution,
        inFavorOf: favor,
        refundDecision: refund,
        resumeRfqStatus: resumeStatus,
      });
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <form action={submit} className="mt-4 grid gap-4">
      <fieldset>
        <legend className="text-xs text-[var(--color-stone-600)]">القرار لصالح</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['client', 'supplier', 'shared'] as Favor[]).map((f) => (
            <label key={f} className="cursor-pointer">
              <input
                type="radio"
                name="favor"
                value={f}
                checked={favor === f}
                onChange={() => setFavor(f)}
                className="peer sr-only"
              />
              <span
                aria-pressed={favor === f}
                className={`inline-block rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${
                  favor === f
                    ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)] ring-[var(--color-midnight-green)]'
                    : 'bg-white text-[var(--color-stone-600)] ring-[var(--color-stone-300)]'
                } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-action-blue)]`}
              >
                {f === 'client' ? 'العميل' : f === 'supplier' ? 'المورد' : 'مُشترك'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-xs text-[var(--color-stone-600)]">
          حالة الطلب بعد القرار
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['in_progress', 'completed', 'cancelled'] as ResumeStatus[]).map((s) => (
            <label key={s} className="cursor-pointer">
              <input
                type="radio"
                name="resumeStatus"
                value={s}
                checked={resumeStatus === s}
                onChange={() => setResumeStatus(s)}
                className="peer sr-only"
              />
              <span
                aria-pressed={resumeStatus === s}
                className={`inline-block rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${
                  resumeStatus === s
                    ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)] ring-[var(--color-midnight-green)]'
                    : 'bg-white text-[var(--color-stone-600)] ring-[var(--color-stone-300)]'
                } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-action-blue)]`}
              >
                {s === 'in_progress'
                  ? 'يكمل التنفيذ'
                  : s === 'completed'
                    ? 'مكتمل'
                    : 'ملغى'}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor="refundDecision"
          className="text-xs text-[var(--color-stone-600)]"
        >
          مبلغ الاسترداد (ر.س) — اتركه فارغاً لو لا يوجد استرداد
        </label>
        <input
          id="refundDecision"
          name="refundDecision"
          type="number"
          min="0"
          step="0.01"
          className="num mt-1 h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
      </div>

      <div>
        <label
          htmlFor="resolution"
          className="text-xs text-[var(--color-stone-600)]"
        >
          نص القرار (20 حرفاً على الأقل) *
        </label>
        <textarea
          id="resolution"
          name="resolution"
          rows={5}
          minLength={20}
          required
          placeholder="اشرح القرار بوضوح. سيُسجَّل في الـ audit log."
          className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          احسم النزاع
        </button>
      </div>
    </form>
  );
}
