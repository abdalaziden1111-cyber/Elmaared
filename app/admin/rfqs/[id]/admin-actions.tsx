'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { cancelRfqAction, overrideRfqStatusAction } from '@/app/actions/admin';
import { Loader2 } from 'lucide-react';

const OVERRIDE_OPTIONS: { value: string; label: string }[] = [
  { value: 'draft', label: 'مسودة' },
  { value: 'open', label: 'مفتوح' },
  { value: 'negotiating', label: 'قيد التفاوض' },
  { value: 'awarded', label: 'تم الاختيار' },
  { value: 'in_escrow', label: 'قيد الضمان' },
  { value: 'in_progress', label: 'قيد التنفيذ' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'completed', label: 'مكتمل' },
  { value: 'disputed', label: 'نزاع' },
  { value: 'cancelled', label: 'ملغى' },
];

export function AdminRfqActions({
  rfqId,
  currentStatus,
}: {
  rfqId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<'idle' | 'cancel' | 'override'>('idle');
  const [cancelReason, setCancelReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<string>(currentStatus);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function reset() {
    setStage('idle');
    setCancelReason('');
    setOverrideReason('');
    setError(null);
  }

  function doCancel() {
    setError(null);
    startTransition(async () => {
      const r = await cancelRfqAction(rfqId, cancelReason);
      if (r.ok) {
        setSuccess('تم إلغاء الطلب.');
        reset();
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  function doOverride() {
    setError(null);
    startTransition(async () => {
      const r = await overrideRfqStatusAction(rfqId, overrideStatus, overrideReason);
      if (r.ok) {
        setSuccess(`تم تعديل الحالة إلى ${overrideStatus}.`);
        reset();
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  const isTerminal = currentStatus === 'completed' || currentStatus === 'cancelled';

  return (
    <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          إجراءات Admin
        </h2>
        {success ? (
          <span className="rounded-full bg-[var(--color-success-100)] px-3 py-1 text-xs text-[var(--color-success)]">
            {success}
          </span>
        ) : null}
      </div>

      {stage === 'idle' ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setStage('cancel');
              setSuccess(null);
            }}
            disabled={pending || isTerminal}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--color-danger)] bg-white px-4 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-100)]/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            إلغاء الطلب
          </button>
          <button
            type="button"
            onClick={() => {
              setStage('override');
              setSuccess(null);
            }}
            disabled={pending}
            className="inline-flex h-10 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-4 text-sm font-medium text-[var(--color-stone-600)] hover:border-[var(--color-action-blue)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            تعديل الحالة يدوياً
          </button>
        </div>
      ) : null}

      {stage === 'cancel' ? (
        <div className="mt-4 grid gap-3">
          <p className="rounded-lg bg-[var(--color-danger-100)]/40 p-3 text-xs text-[var(--color-danger)]">
            إلغاء الطلب لا يمكن التراجع عنه. لو يوجد ضمان نشط سيتم تحويله إلى "مُسترد".
          </p>
          <label className="text-xs text-[var(--color-stone-600)]">
            سبب الإلغاء (10 أحرف على الأقل) *
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              required
              minLength={10}
              className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doCancel}
              disabled={pending || cancelReason.trim().length < 10}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-danger)] px-4 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              تأكيد الإلغاء
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="h-10 rounded-xl px-4 text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              تراجع
            </button>
          </div>
        </div>
      ) : null}

      {stage === 'override' ? (
        <div className="mt-4 grid gap-3">
          <p className="rounded-lg bg-[var(--color-warning-100)]/60 p-3 text-xs text-[var(--color-warning)]">
            هذا تعديل يدوي لحالة الطلب. استخدمه فقط في حالات الاسترجاع. سيُسجَّل في الـ
            audit log مع السبب.
          </p>
          <label className="text-xs text-[var(--color-stone-600)]">
            الحالة الجديدة
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              {OVERRIDE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.value})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--color-stone-600)]">
            سبب التعديل (20 حرفاً على الأقل) *
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              required
              minLength={20}
              className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={doOverride}
              disabled={
                pending ||
                overrideReason.trim().length < 20 ||
                overrideStatus === currentStatus
              }
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-warning)] px-4 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              تأكيد التعديل
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="h-10 rounded-xl px-4 text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              تراجع
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
