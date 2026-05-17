// Client-side error capture for Next.js 16+. Runs once in the browser.
// Like instrumentation.ts, we only wire Sentry when both:
//   1. NEXT_PUBLIC_SENTRY_DSN is set
//   2. The optional `@sentry/nextjs` package is installed
// Otherwise this file is a no-op, keeping local dev frictionless.

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    // @ts-expect-error — optional dependency, may not be installed
    const sentryAny = await import('@sentry/nextjs').catch(() => null);
    if (!sentryAny) {
      // eslint-disable-next-line no-console
      console.warn(
        '[instrumentation-client] NEXT_PUBLIC_SENTRY_DSN is set but @sentry/nextjs is not installed.'
      );
      return;
    }
    const Sentry = sentryAny as {
      init: (opts: Record<string, unknown>) => void;
    };

    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      // Lower client-side trace rate — most user sessions are uninteresting.
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 0,
      // Capture 100% of sessions with errors for replay (when @sentry/replay
      // is added). Until then, this option is silently ignored.
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0,
      environment: process.env.NODE_ENV,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[instrumentation-client] Failed to initialize Sentry:', err);
  }
}
