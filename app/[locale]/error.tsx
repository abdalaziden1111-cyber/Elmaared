'use client';

import { useEffect } from 'react';
import { log } from '@/lib/utils/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Phase Z2 Item 4 (Sentry follow-on): make "سجّلنا الخطأ تلقائياً" true.
    // The structured logger routes through Sentry via instrumentation-client.ts
    // when NEXT_PUBLIC_SENTRY_DSN is set; otherwise it falls back to console.
    log.error('locale_error_boundary', error, {
      digest: error.digest,
      scope: 'locale',
    });
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-[var(--color-danger)]">خطأ</h1>
      <p className="mt-2 text-[var(--color-stone-600)]">
        حدث خلل في الخادم. سجّلنا الخطأ تلقائياً.
      </p>
      <button
        onClick={reset}
        className="mt-6 rounded-xl bg-[var(--color-action-blue)] px-6 py-3 text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
      >
        حاول مرة أخرى
      </button>
    </main>
  );
}
