'use client';

import { useEffect, useState, type ReactNode } from 'react';

// Wraps a skeleton with a client-side watchdog. If RSC streaming stalls (slow
// network, dropped connection), we swap from the skeleton to an actionable
// retry card so the user is never stuck staring at a perpetual placeholder.
//
// Place inside each route segment's `loading.tsx`:
//
//   export default function Loading() {
//     return (
//       <LoadingWithTimeout>
//         <SomePageSkeleton />
//       </LoadingWithTimeout>
//     );
//   }
//
export function LoadingWithTimeout({
  children,
  timeoutMs = 15000,
}: {
  children: ReactNode;
  timeoutMs?: number;
}) {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setStalled(true), timeoutMs);
    return () => window.clearTimeout(id);
  }, [timeoutMs]);

  if (stalled) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-md rounded-2xl border border-[var(--color-warning-100)] bg-[var(--color-warning-100)]/40 p-6 text-center"
      >
        <p className="text-base font-semibold text-[var(--color-midnight-green)]">
          الصفحة تستغرق وقتاً أطول من المعتاد
        </p>
        <p className="mt-2 text-sm text-[var(--color-stone-600)]">
          قد يكون اتصالك بطيئاً أو حدث خلل بسيط. حاول إعادة التحميل.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-10 items-center rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }
  return <>{children}</>;
}
