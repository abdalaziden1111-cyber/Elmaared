'use client';

import { useState, useTransition } from 'react';
import { approveSupplierAction, rejectSupplierAction } from '@/app/actions/admin';
import { Loader2 } from 'lucide-react';

export function ApproveRejectButtons({ supplierId }: { supplierId: string }) {
  const [pending, startTransition] = useTransition();
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await approveSupplierAction(supplierId);
      if (!result.ok) setError(result.error);
    });
  }

  function reject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectSupplierAction(supplierId, reason);
      if (!result.ok) setError(result.error);
      else setShowReject(false);
    });
  }

  return (
    <div className="flex shrink-0 flex-col gap-2">
      {showReject ? (
        <div className="flex w-72 flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="سبب الرفض (10 أحرف على الأقل)"
            className="rounded-lg border border-[var(--color-stone-300)] p-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reject}
              disabled={pending || reason.trim().length < 10}
              className="inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--color-danger)] px-3 text-xs font-medium text-white disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-3 animate-spin" /> : null}
              تأكيد الرفض
            </button>
            <button
              type="button"
              onClick={() => setShowReject(false)}
              className="h-9 rounded-lg px-3 text-xs text-[var(--color-stone-600)]"
            >
              إلغاء
            </button>
          </div>
          {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={approve}
            disabled={pending}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[var(--color-success)] px-4 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-3 animate-spin" /> : null}
            اعتماد
          </button>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="h-9 rounded-lg border border-[var(--color-stone-300)] px-4 text-sm"
          >
            رفض
          </button>
          {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
        </>
      )}
    </div>
  );
}
