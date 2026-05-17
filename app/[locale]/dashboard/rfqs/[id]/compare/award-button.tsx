'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { awardWinnerAction } from '@/app/actions/agreement';
import { Loader2, Trophy } from 'lucide-react';

export function AwardButton({
  proposalId,
  rfqId,
}: {
  proposalId: string;
  rfqId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function award() {
    setError(null);
    startTransition(async () => {
      const r = await awardWinnerAction(proposalId);
      if (r.ok) {
        router.push(`/dashboard/rfqs/${rfqId}/agreement`);
      } else {
        setError(r.error);
      }
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--color-dune-gold)] px-3 text-xs font-medium text-[var(--color-dune-gold)]"
      >
        <Trophy className="size-3" /> اختر هذا العرض
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={award}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-dune-gold)] px-3 text-xs font-medium text-white disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3 animate-spin" /> : null}
          تأكيد الاختيار
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setError(null);
          }}
          className="h-9 px-2 text-xs text-[var(--color-stone-600)]"
        >
          إلغاء
        </button>
      </div>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
