'use client';

import { useState, useTransition } from 'react';
import { raisePanicAction } from '@/app/actions/chat';
import { TriangleAlert, Loader2, X } from 'lucide-react';

// In-chat panic escalation. Visible only when the chat is NOT already
// panic-flagged (parent passes `alreadyEscalated`). Click → confirm panel
// → submit reason (min 10 chars) → action flips chat.panic_at and inserts
// a system message. Admin sees the chat appear in /admin/disputes within
// 1s via realtime subscription.
export function PanicButton({
  chatId,
  alreadyEscalated,
}: {
  chatId: string;
  alreadyEscalated: boolean;
}) {
  const [stage, setStage] = useState<'idle' | 'confirm'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (alreadyEscalated || success) {
    return (
      <span
        role="status"
        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-danger-100)] px-3 py-1 text-xs text-[var(--color-danger)]"
      >
        🚨 تم التصعيد لـ Admin
      </span>
    );
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await raisePanicAction(chatId, reason.trim());
      if (r.ok) {
        setSuccess(true);
        setStage('idle');
      } else {
        setError(r.error);
      }
    });
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStage('confirm')}
        className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-danger)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        <TriangleAlert className="size-3" aria-hidden />
        صعّد لـ Admin
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)]/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--color-danger)]">
          🚨 تصعيد عاجل لـ Admin
        </p>
        <button
          type="button"
          onClick={() => {
            setStage('idle');
            setError(null);
            setReason('');
          }}
          aria-label="أغلق"
          className="text-[var(--color-stone-600)] hover:text-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        استخدم هذا الزر فقط لو لازم Admin يتدخّل في المحادثة. سيتم إشعار Admin فوراً وسيُسجَّل
        السبب في المحادثة.
      </p>
      <label className="mt-3 block">
        <span className="sr-only">سبب التصعيد</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          minLength={10}
          required
          placeholder="اشرح سبب التصعيد (10 أحرف على الأقل)"
          className="w-full rounded-lg border border-[var(--color-stone-300)] bg-white p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={pending || reason.trim().length < 10}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-danger)] px-3 text-xs font-medium text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          {pending ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
          أرسل التصعيد
        </button>
        <button
          type="button"
          onClick={() => {
            setStage('idle');
            setError(null);
          }}
          disabled={pending}
          className="h-9 rounded-lg px-3 text-xs text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          إلغاء
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-[var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
