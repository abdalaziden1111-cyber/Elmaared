// Client-side error capture for Next.js 16+. Runs once in the browser.
// @sentry/nextjs is now an installed dependency (Phase Z2 Item 4); the
// integration still only activates when NEXT_PUBLIC_SENTRY_DSN is set so
// dev runs stay free of Sentry network calls.

export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  try {
    const Sentry = await import('@sentry/nextjs');

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
