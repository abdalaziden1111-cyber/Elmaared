'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { adminJoinChatAction } from '@/app/actions/chat';
import { Loader2 } from 'lucide-react';

export function JoinChatButton({ chatId }: { chatId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function join() {
    setError(null);
    startTransition(async () => {
      const r = await adminJoinChatAction(chatId);
      if (r.ok) router.refresh();
      else setError(r.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={join}
        disabled={pending}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] disabled:opacity-60 hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        انضم للمحادثة
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
