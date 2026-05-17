'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { publishRfqAction } from '@/app/actions/rfq';
import { Loader2 } from 'lucide-react';

export function PublishButton({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function publish() {
    setError(null);
    startTransition(async () => {
      const r = await publishRfqAction(rfqId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={publish}
        disabled={pending}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        انشر الطلب الآن
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
