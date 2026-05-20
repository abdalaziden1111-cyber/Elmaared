// Phase V3.1 — PostHog Node client (server-only).
//
// IMPORTANT: never import this from client components — posthog-node
// pulls node:fs + node:async_hooks which the browser bundler can't ship.
// The browser path lives in lib/analytics/posthog-browser.ts.

import 'server-only';
import type { PostHog as PostHogNode } from 'posthog-node';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

let instance: PostHogNode | null = null;
let initTried = false;

/**
 * Lazy posthog-node singleton. Returns null when the key is missing so
 * callers can short-circuit cheaply. Per-call cost is minimal — the
 * underlying client batches and flushes on a timer.
 */
export async function getPosthogServer(): Promise<PostHogNode | null> {
  if (instance) return instance;
  if (initTried || !POSTHOG_KEY) return null;
  initTried = true;
  try {
    const { PostHog } = await import('posthog-node');
    instance = new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      // Flush often enough that a short-lived serverless invocation
      // doesn't drop a captured event between request end and process exit.
      flushAt: 1,
      flushInterval: 0,
    });
    return instance;
  } catch (err) {
    console.error('[posthog-server] init failed:', err);
    return null;
  }
}
