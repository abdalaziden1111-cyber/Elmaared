'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adminConfirmInitialDepositAction } from '@/app/actions/escrow';
import { Loader2 } from 'lucide-react';

export function ConfirmDepositButton({ escrowId }: { escrowId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const r = await adminConfirmInitialDepositAction(escrowId);
      if (r.ok) router.refresh();
      else alert(r.error);
    });
  }

  return (
    <button
      type="button"
      onClick={confirm}
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-[var(--color-success)] px-4 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : null}
      تأكيد الاستلام
    </button>
  );
}
