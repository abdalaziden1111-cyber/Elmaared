// Phase V3.2 — bucketAndCapture: deterministic variant + session-deduped event.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const trackEventMock = vi.fn();
vi.mock('@/lib/analytics/events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/analytics/events')>();
  return {
    ...actual,
    trackEvent: (...args: unknown[]) => trackEventMock(...args),
  };
});

beforeEach(() => {
  trackEventMock.mockReset();
  // jsdom provides sessionStorage; clear it between tests.
  if (typeof window !== 'undefined') window.sessionStorage.clear();
});

describe('bucketAndCapture', () => {
  it('returns a stable variant for the same (userId, experimentKey)', async () => {
    const { bucketAndCapture } = await import('@/lib/ab-test-posthog');
    const a = bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    const b = bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    expect(a).toBe(b);
  });

  it('different users may land in different variants', async () => {
    const { bucketAndCapture } = await import('@/lib/ab-test-posthog');
    const variants = new Set<string>();
    for (let i = 0; i < 200; i++) {
      variants.add(bucketAndCapture(`u${i}`, 'AI_CONFIDENCE_4LEVEL'));
    }
    expect(variants.size).toBeGreaterThan(1);
  });

  it('emits ab_assignment exactly once per (session, experimentKey)', async () => {
    const { bucketAndCapture } = await import('@/lib/ab-test-posthog');
    bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    expect(trackEventMock).toHaveBeenCalledTimes(1);
  });

  it('different experiments emit their own assignment events', async () => {
    const { bucketAndCapture } = await import('@/lib/ab-test-posthog');
    bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    bucketAndCapture('user-1', 'RFQ_SINGLE_SCREEN');
    expect(trackEventMock).toHaveBeenCalledTimes(2);
  });

  it('event has the expected shape', async () => {
    const { bucketAndCapture } = await import('@/lib/ab-test-posthog');
    const variant = bucketAndCapture('user-1', 'AI_CONFIDENCE_4LEVEL');
    expect(trackEventMock).toHaveBeenCalledWith({
      name: 'ab_assignment',
      props: { experimentKey: 'AI_CONFIDENCE_4LEVEL', variant },
    });
  });
});
