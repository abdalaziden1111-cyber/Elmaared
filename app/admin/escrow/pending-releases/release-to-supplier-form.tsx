'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminReleaseToSupplierAction } from '@/app/actions/escrow';
import { Loader2 } from 'lucide-react';

export function ReleaseToSupplierForm({ escrowId }: { escrowId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [payoutRef, setPayoutRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await adminReleaseToSupplierAction(escrowId, payoutRef.trim());
      if (r.ok) {
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <label className="text-xs text-[var(--color-stone-600)] sm:text-end">
        مرجع التحويل البنكي
        <input
          type="text"
          value={payoutRef}
          onChange={(e) => setPayoutRef(e.target.value)}
          placeholder="مثال: REF-2026-00123"
          required
          minLength={4}
          className="num mt-1 h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] sm:w-64"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending || payoutRef.trim().length < 4}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-success)] px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        تأكيد التحرير
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
