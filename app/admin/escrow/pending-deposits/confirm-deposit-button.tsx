'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminConfirmInitialDepositAction } from '@/app/actions/escrow';
import { Loader2 } from 'lucide-react';

export function ConfirmDepositButton({ escrowId }: { escrowId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const r = await adminConfirmInitialDepositAction(escrowId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={confirm}
        disabled={pending}
        className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[var(--color-success)] px-4 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : null}
        تأكيد الاستلام
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
