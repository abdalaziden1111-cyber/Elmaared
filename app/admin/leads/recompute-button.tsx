'use client';

import { useTransition, useState } from 'react';
import { recomputeLeadAction } from './actions';

interface Props {
  userId: string;
}

/**
 * Phase V1.3 — fires the admin recompute server action and shows pending
 * state. Keeps the page server-rendered; only this button is interactive.
 */
export function RecomputeButton({ userId }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClick() {
    setMessage(null);
    startTransition(async () => {
      const result = await recomputeLeadAction(userId);
      if (result.ok) {
        setMessage(`تم — ${result.data!.category} (${result.data!.score})`);
      } else {
        setMessage(result.error ?? 'فشل');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex h-8 items-center rounded-lg bg-[var(--color-action-blue)] px-3 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] disabled:opacity-50"
      >
        {pending ? 'يحتسب…' : 'إعادة احتساب'}
      </button>
      {message ? (
        <span className="text-[10px] text-[var(--color-stone-600)]">{message}</span>
      ) : null}
    </div>
  );
}
