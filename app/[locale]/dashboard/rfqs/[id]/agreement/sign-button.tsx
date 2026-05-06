'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signAgreementAction } from '@/app/actions/agreement';
import { Loader2 } from 'lucide-react';

// Double-confirm flow: first click reveals the warning + confirm input;
// second click commits the signature.
export function SignButton({ agreementId }: { agreementId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<'idle' | 'confirm'>('idle');

  function commit() {
    startTransition(async () => {
      const r = await signAgreementAction(agreementId);
      if (r.ok) {
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  if (stage === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setStage('confirm')}
        className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)]"
      >
        ابدأ التوقيع
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-warning)] bg-[var(--color-warning-100)] p-4 text-sm">
      <p className="font-medium text-[var(--color-warning)]">
        التوقيع يلزمك قانونياً بالاتفاق أعلاه. تأكّد من قراءة فهم الطرف الآخر وتحليل الذكاء الاصطناعي قبل المتابعة.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={commit}
          disabled={pending}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-lg bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          نعم، وقّع باسمي
        </button>
        <button
          type="button"
          onClick={() => setStage('idle')}
          className="h-10 rounded-lg px-4 text-sm text-[var(--color-stone-600)]"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
