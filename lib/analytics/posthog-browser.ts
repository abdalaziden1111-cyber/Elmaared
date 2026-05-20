// Phase V3.1 — PostHog JS client (browser-only).
//
// Safe to import from client components. The init is lazy so a server
// component that accidentally references this won't crash — the function
// just returns null when `window` is undefined.

import type { PostHog as PostHogBrowser } from 'posthog-js';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

let instance: PostHogBrowser | null = null;
let initTried = false;

/**
 * Initialize the browser client once and return it. Subsequent calls
 * return the cached instance.
 *
 * Reverse-proxy: posthog-js is pointed at /api/posthog so ad-blockers
 * that filter app.posthog.com don't drop our analytics.
 */
export async function initPosthogBrowser(): Promise<PostHogBrowser | null> {
  if (typeof window === 'undefined') return null;
  if (instance) return instance;
  if (initTried || !POSTHOG_KEY) return null;
  initTried = true;
  try {
    const mod = await import('posthog-js');
    const ph = mod.default;
    ph.init(POSTHOG_KEY, {
      api_host: '/api/posthog',
      ui_host: POSTHOG_HOST,
      capture_pageview: 'history_change',
      autocapture: false,
      person_profiles: 'identified_only',
      disable_session_recording: true,
      loaded: () => {
        instance = ph;
      },
    });
    instance = ph;
    return instance;
  } catch (err) {
    console.error('[posthog-browser] init failed:', err);
    return null;
  }
}

export function getPosthogBrowser(): PostHogBrowser | null {
  return instance;
}

export const POSTHOG_REVERSE_PROXY_PATH = '/api/posthog';
