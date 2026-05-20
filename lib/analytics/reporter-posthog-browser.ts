// Phase V3.1 — Browser-only PostHog reporter.
// Safe to import from client components.

import type { AnalyticsReporter } from './events';
import { getPosthogBrowser } from './posthog-browser';
import { log } from '@/lib/utils/logger';

export const browserPosthogReporter: AnalyticsReporter = {
  report(event) {
    try {
      const ph = getPosthogBrowser();
      if (!ph) return;
      ph.capture(event.name, event.props as unknown as Record<string, unknown>);
    } catch (err) {
      log.error('analytics.posthog_browser_capture_failed', err, {
        event: event.name,
      });
    }
  },
};
