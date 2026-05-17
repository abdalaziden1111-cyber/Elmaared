'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { shortlistProposalAction } from '@/app/actions/chat';
import { Loader2, MessageCircle } from 'lucide-react';

export function ShortlistButton({
  proposalId,
  rfqId,
}: {
  proposalId: string;
  rfqId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function shortlist() {
    setError(null);
    startTransition(async () => {
      const r = await shortlistProposalAction(proposalId);
      if (r.ok) {
        const d = r.data as { chatId?: string } | undefined;
        if (d?.chatId) {
          router.push(`/dashboard/rfqs/${rfqId}/chats/${d.chatId}`);
        }
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={shortlist}
        disabled={pending}
        className="inline-flex h-9 items-center gap-1 rounded-lg bg-[var(--color-action-blue)] px-3 text-xs font-medium text-[var(--color-cream)] disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3 animate-spin" /> : <MessageCircle className="size-3" />}
        ابدأ المحادثة
      </button>
      {error ? <p className="text-xs text-[var(--color-danger)]">{error}</p> : null}
    </div>
  );
}
