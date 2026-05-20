'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deletePostAction } from '@/app/actions/blog';

interface Props {
  id: string;
  title: string;
}

export function DeletePostButton({ id, title }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => {
        if (!confirm(`حذف "${title}"؟`)) return;
        startTransition(async () => {
          await deletePostAction(id);
        });
      }}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md bg-[var(--color-error-50,#FEF2F2)] px-2 py-1 text-xs text-[var(--color-error,#B91C1C)] hover:bg-[var(--color-error,#B91C1C)] hover:text-white disabled:opacity-50"
    >
      <Trash2 className="size-3" />
      حذف
    </button>
  );
}
