'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveChatAction } from '@/app/actions/admin';
import { Loader2 } from 'lucide-react';

export function ArchiveChatButton({
  chatId,
  isArchived,
}: {
  chatId: string;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isArchived) {
    return (
      <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs text-[var(--color-stone-600)]">
        مؤرشفة
      </span>
    );
  }

  function archive() {
    setError(null);
    startTransition(async () => {
      const r = await archiveChatAction(chatId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={archive}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-stone-300)] bg-white px-4 text-sm font-medium text-[var(--color-stone-600)] hover:border-[var(--color-action-blue)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        أرشف المحادثة
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
