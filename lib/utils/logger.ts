// Structured logger. Today it just routes to console.* but the API is
// shaped so swapping the backend (Sentry, Datadog, Axiom) is a one-line
// change in `report()`. Every call carries an `event` discriminator and
// a free-form `context` object so log queries can group by event without
// regex'ing the message string.

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  event: string;
  message?: string;
  error?: unknown;
  context?: Record<string, unknown>;
}

function report(entry: LogEvent): void {
  const payload = {
    level: entry.level,
    event: entry.event,
    message: entry.message,
    ...(entry.error
      ? {
          error_message:
            entry.error instanceof Error ? entry.error.message : String(entry.error),
          error_stack: entry.error instanceof Error ? entry.error.stack : undefined,
        }
      : {}),
    ...(entry.context ?? {}),
  };

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
}

export const log = {
  debug: (event: string, context?: Record<string, unknown>) =>
    report({ level: 'debug', event, context }),
  info: (event: string, context?: Record<string, unknown>) =>
    report({ level: 'info', event, context }),
  warn: (event: string, context?: Record<string, unknown>) =>
    report({ level: 'warn', event, context }),
  error: (event: string, error: unknown, context?: Record<string, unknown>) =>
    report({ level: 'error', event, error, context }),
};
