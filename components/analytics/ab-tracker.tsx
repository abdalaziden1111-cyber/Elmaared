'use client';

// Phase V3.2 — Tiny mount-only client island that fires an A/B
// assignment event once per session for a given (userId, experimentKey).
// Renders nothing; intended to drop into a server-component page next to
// the experimental UI so the assignment lands in PostHog.

import { useEffect } from 'react';
import { bucketAndCapture } from '@/lib/ab-test-posthog';

interface Props {
  userId: string;
  experimentKey: string;
}

export function AbTracker({ userId, experimentKey }: Props) {
  useEffect(() => {
    if (!userId) return;
    bucketAndCapture(userId, experimentKey);
  }, [userId, experimentKey]);
  return null;
}
