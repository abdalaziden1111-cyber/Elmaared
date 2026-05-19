// Next.js calls register() once per server runtime at boot. We use it to
// wire up our structured logger to a real reporter (Sentry) when a DSN is
// present, falling back to the default consoleReporter otherwise so local
// dev keeps working without any setup.
//
// @sentry/nextjs is now an installed dependency (Phase Z2 Item 4), but the
// integration still only activates when SENTRY_DSN is set — keeps dev
// runs free of Sentry network calls.

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  try {
    const [{ setLogReporter }, Sentry] = await Promise.all([
      import('@/lib/utils/logger'),
      import('@sentry/nextjs'),
    ]);

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
      environment: process.env.NODE_ENV,
    });

    setLogReporter({
      report(entry) {
        switch (entry.level) {
          case 'error':
            Sentry.captureException(entry.error ?? new Error(entry.event), {
              tags: { event: entry.event },
              extra: { ...entry.context, timestamp: entry.timestamp },
            });
            break;
          case 'warn':
            Sentry.captureMessage(entry.event, {
              level: 'warning',
              tags: { event: entry.event },
              extra: { ...entry.context, timestamp: entry.timestamp },
            });
            break;
          default:
            // info/debug stay on console — Sentry isn't a telemetry sink
            console.log('[app]', {
              level: entry.level,
              event: entry.event,
              ...entry.context,
            });
        }
      },
    });
  } catch (err) {
    // Sentry init failed — don't take the whole app down. Log via stderr
    // since the structured logger itself is what we were trying to set up.
    console.error('[instrumentation] Failed to initialize Sentry reporter:', err);
  }
}
