// Structured logger with a swappable reporter backend.
//
// Today the default reporter routes to `console.*`. Production can register
// a Sentry/Datadog/Axiom reporter via setLogReporter() at process boot
// (typically in instrumentation.ts) without changing any call sites.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  event: string;
  message?: string;
  error?: unknown;
  context?: Record<string, unknown>;
  timestamp: string;
}

export interface LogReporter {
  report(entry: LogEvent): void;
}

function flatten(entry: LogEvent): Record<string, unknown> {
  return {
    level: entry.level,
    event: entry.event,
    message: entry.message,
    timestamp: entry.timestamp,
    ...(entry.error
      ? {
          error_message:
            entry.error instanceof Error
              ? entry.error.message
              : String(entry.error),
          error_stack:
            entry.error instanceof Error ? entry.error.stack : undefined,
        }
      : {}),
    ...(entry.context ?? {}),
  };
}

export const consoleReporter: LogReporter = {
  report(entry) {
    const payload = flatten(entry);
    switch (entry.level) {
      case 'error':
        console.error('[app]', payload);
        break;
      case 'warn':
        console.warn('[app]', payload);
        break;
      case 'debug':
        if (process.env.NODE_ENV !== 'production') {
          console.debug('[app]', payload);
        }
        break;
      default:
        console.log('[app]', payload);
    }
  },
};

let currentReporter: LogReporter = consoleReporter;

/**
 * Swap the active reporter — typically called once at process boot from
 * instrumentation.ts. Returns the previous reporter so tests can restore.
 */
export function setLogReporter(reporter: LogReporter): LogReporter {
  const previous = currentReporter;
  currentReporter = reporter;
  return previous;
}

function emit(
  level: LogLevel,
  event: string,
  error: unknown | undefined,
  context: Record<string, unknown> | undefined
): void {
  currentReporter.report({
    level,
    event,
    error,
    context,
    timestamp: new Date().toISOString(),
  });
}

export const log = {
  debug: (event: string, context?: Record<string, unknown>) =>
    emit('debug', event, undefined, context),
  info: (event: string, context?: Record<string, unknown>) =>
    emit('info', event, undefined, context),
  warn: (event: string, context?: Record<string, unknown>) =>
    emit('warn', event, undefined, context),
  error: (event: string, error: unknown, context?: Record<string, unknown>) =>
    emit('error', event, error, context),
};

/** Test helper: capture every entry into an array instead of routing out. */
export function createMemoryReporter() {
  const entries: LogEvent[] = [];
  return {
    reporter: {
      report(entry: LogEvent) {
        entries.push(entry);
      },
    } as LogReporter,
    entries,
    clear() {
      entries.length = 0;
    },
  };
}
