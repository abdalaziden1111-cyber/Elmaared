'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveDeliveryAction } from '@/app/actions/escrow';
import { Loader2 } from 'lucide-react';

export function ApproveDeliveryButton({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      const r = await approveDeliveryAction(rfqId);
      if (r.ok) router.refresh();
      else alert(r.error);
    });
  }

  return (
    <button
      type="button"
      onClick={approve}
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-[var(--color-success)] px-6 text-sm font-medium text-white disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      اعتماد التسليم
    </button>
  );
}
