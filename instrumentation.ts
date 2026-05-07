// Next.js calls register() once per server runtime at boot. We use it to
// wire up our structured logger to a real reporter (Sentry, Datadog, etc.)
// when a DSN is present, falling back to the default consoleReporter
// otherwise so local dev keeps working without any setup.
//
// Sentry isn't a hard dependency — we dynamically import it only when a
// DSN is set, and skip wiring entirely if the package isn't installed.
// Run `pnpm add @sentry/nextjs && npx @sentry/wizard@latest -i nextjs` to
// turn the integration on.

export async function register() {
  if (!process.env.SENTRY_DSN) return;

  try {
    const [{ setLogReporter }, sentryAny] = await Promise.all([
      import('@/lib/utils/logger'),
      // @ts-expect-error — optional dependency, may not be installed
      import('@sentry/nextjs').catch(() => null),
    ]);

    if (!sentryAny) {
      console.warn(
        '[instrumentation] SENTRY_DSN is set but @sentry/nextjs is not installed.'
      );
      return;
    }
    const Sentry = sentryAny as {
      init: (opts: Record<string, unknown>) => void;
      captureException: (
        err: unknown,
        scope?: { tags?: Record<string, string>; extra?: Record<string, unknown> }
      ) => void;
      captureMessage: (
        msg: string,
        scope?: {
          level?: string;
          tags?: Record<string, string>;
          extra?: Record<string, unknown>;
        }
      ) => void;
    };

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
