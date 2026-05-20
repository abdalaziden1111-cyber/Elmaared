// Phase V3.1 — Server-only PostHog reporter.
// Kept in its own file so client bundles never pull posthog-node.

import 'server-only';
import type { AnalyticsEvent, AnalyticsReporter } from './events';
import { getPosthogServer } from './posthog-server';
import { log } from '@/lib/utils/logger';

function distinctIdFor(event: AnalyticsEvent): string {
  const props = event.props as unknown as Record<string, unknown>;
  if (typeof props.userId === 'string') return props.userId;
  if (typeof props.proposalId === 'string') return `proposal:${props.proposalId}`;
  if (typeof props.rfqId === 'string') return `rfq:${props.rfqId}`;
  return 'server';
}

export const serverPosthogReporter: AnalyticsReporter = {
  report(event) {
    void (async () => {
      try {
        const ph = await getPosthogServer();
        if (!ph) return;
        ph.capture({
          distinctId: distinctIdFor(event),
          event: event.name,
          properties: event.props as unknown as Record<string, unknown>,
        });
      } catch (err) {
        log.error('analytics.posthog_server_capture_failed', err, {
          event: event.name,
        });
      }
    })();
  },
};
