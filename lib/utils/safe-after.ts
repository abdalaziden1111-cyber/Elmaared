import { after } from 'next/server';
import { log } from './logger';

/**
 * Wrapper around Next.js `after()` that catches and logs any error thrown
 * by the callback. Bare `after(...)` swallows exceptions silently — you
 * only find out something broke when nobody got the email.
 *
 * Use `safeAfter` everywhere we kick off background work (AI scoring,
 * email fanout, audit-log writes) so failures land in the structured
 * logger instead of disappearing.
 */
export function safeAfter(
  event: string,
  fn: () => Promise<unknown> | unknown,
  context?: Record<string, unknown>
): void {
  after(async () => {
    try {
      await fn();
    } catch (err) {
      log.error(`after.${event}`, err, context);
    }
  });
}
