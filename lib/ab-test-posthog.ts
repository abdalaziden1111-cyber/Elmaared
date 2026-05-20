// Phase V3.2 — Bridge the FNV-1a bucketing in lib/ab-test.ts to PostHog
// analytics + feature flags.
//
// Usage (client-side, inside a feature-gated component):
//   const variant = bucketAndCapture(userId, 'AI_CONFIDENCE_4LEVEL');
//   if (variant === 'B') showNewExperience(); else showOldExperience();
//
// Side-effect: emits a single 'ab_assignment' analytics event per
// (session, experimentKey) — dedup'd via sessionStorage so a chatty page
// re-render doesn't flood the dashboard.

import { bucket, type Variant, type BucketOptions } from './ab-test';
import { trackEvent } from '@/lib/analytics/events';

const STORAGE_KEY = 'elmaared:ab_assignments';

interface AssignmentRecord {
  [experimentKey: string]: Variant;
}

function readSessionAssignments(): AssignmentRecord {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as AssignmentRecord;
    return {};
  } catch {
    return {};
  }
}

function writeSessionAssignments(map: AssignmentRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage can throw in private/quota-exceeded modes — swallow.
  }
}

/**
 * Bucket the user and emit an ab_assignment event the first time per
 * session. Returns the variant so the caller can branch UI immediately.
 *
 * Server-safe: if `window` is undefined we just bucket without emitting.
 * (Server-side analytics for AB assignments lands via PostHog server
 * reporter in V3.1 if the caller wraps trackEvent there.)
 */
export function bucketAndCapture(
  userId: string,
  experimentKey: string,
  options?: BucketOptions
): Variant {
  const variant = bucket(userId, experimentKey, options);

  // Server has no session storage; skip the dedup.
  if (typeof window === 'undefined') return variant;

  const existing = readSessionAssignments();
  if (existing[experimentKey] === variant) return variant;
  existing[experimentKey] = variant;
  writeSessionAssignments(existing);

  trackEvent({
    name: 'ab_assignment',
    props: { experimentKey, variant },
  });
  return variant;
}
