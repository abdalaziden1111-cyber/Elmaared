'use client';

// Phase V3.1 — PostHog browser provider.
//
// Initializes posthog-js once on mount, identifies the user when a userId
// is available, and swaps the global AnalyticsReporter so trackEvent()
// calls fan to PostHog instead of console.
//
// Renders nothing — purely an effect mount. Safe to include unconditionally
// in the locale layout; if NEXT_PUBLIC_POSTHOG_KEY is missing it no-ops.

import { useEffect } from 'react';
import { initPosthogBrowser, getPosthogBrowser } from '@/lib/analytics/posthog-browser';
import { browserPosthogReporter } from '@/lib/analytics/reporter-posthog-browser';
import { setAnalyticsReporter } from '@/lib/analytics/events';

interface Props {
  userId?: string | null;
}

export function PosthogProvider({ userId }: Props) {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ph = await initPosthogBrowser();
      if (cancelled || !ph) return;
      setAnalyticsReporter(browserPosthogReporter);
      if (userId) {
        try {
          ph.identify(userId);
        } catch (err) {
          console.error('[posthog] identify failed:', err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Handle user changes (login/logout). identify resets the distinct_id.
  useEffect(() => {
    const ph = getPosthogBrowser();
    if (!ph) return;
    try {
      if (userId) ph.identify(userId);
      else ph.reset();
    } catch (err) {
      console.error('[posthog] re-identify failed:', err);
    }
  }, [userId]);

  return null;
}
