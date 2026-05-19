'use client';

// Next.js global-error boundary — fires when an error escapes the root
// layout itself (i.e. before any locale-scoped error.tsx can catch it).
// Per the Next.js docs this file MUST render its own <html> and <body>
// because it REPLACES the root layout when active.
//
// Phase Z2 Item 4 (Sentry follow-on): we call Sentry.captureException
// directly here instead of going through the structured logger, because
// when this boundary fires the root layout may not have run — meaning
// the instrumentation-client.ts setLogReporter() call may not have
// completed yet. Direct capture is the safest bet.

import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

    // Dynamic import — keeps @sentry/nextjs out of the critical bundle
    // until something actually crashes. Promise rejection is intentionally
    // swallowed: if Sentry itself fails to load, there's nowhere left to
    // report it.
    import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(error, {
          tags: { event: 'global_error', runtime: 'browser' },
          extra: { digest: error.digest, timestamp: new Date().toISOString() },
        });
      })
      .catch(() => {
        console.error('[global-error] Sentry capture failed', error);
      });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            background: '#fafaf7',
            color: '#1c1917',
          }}
        >
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#dc2626' }}>
            خطأ في التطبيق
          </h1>
          <p style={{ marginTop: '0.75rem', color: '#57534e' }}>
            حدث خلل غير متوقع. سجّلنا الخطأ تلقائياً وفريقنا يتابعه.
          </p>
          {/* Intentional <a>: when global-error fires, the React tree is
              unrecoverable — a hard browser navigation is safer than
              client-side routing through a broken state. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            style={{
              marginTop: '1.5rem',
              borderRadius: '0.75rem',
              background: '#2563eb',
              padding: '0.75rem 1.5rem',
              color: '#fefce8',
              textDecoration: 'none',
            }}
          >
            العودة للرئيسية
          </a>
        </main>
      </body>
    </html>
  );
}
