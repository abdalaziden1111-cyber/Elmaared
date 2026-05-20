// Phase V3.1 — PostHog reporter wiring.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
const resetMock = vi.fn();
const identifyMock = vi.fn();
let serverInstance: { capture: typeof captureMock } | null = null;
let browserInstance:
  | { capture: typeof captureMock; reset: typeof resetMock; identify: typeof identifyMock }
  | null = null;

vi.mock('@/lib/analytics/posthog-server', () => ({
  getPosthogServer: async () => serverInstance,
}));
vi.mock('@/lib/analytics/posthog-browser', () => ({
  getPosthogBrowser: () => browserInstance,
  initPosthogBrowser: async () => browserInstance,
}));
// `import 'server-only'` throws in jsdom; stub it out for the test.
vi.mock('server-only', () => ({}));

beforeEach(() => {
  captureMock.mockReset();
  resetMock.mockReset();
  identifyMock.mockReset();
  serverInstance = { capture: captureMock };
  browserInstance = {
    capture: captureMock,
    reset: resetMock,
    identify: identifyMock,
  };
});

describe('serverPosthogReporter', () => {
  it('captures the event with a distinct id derived from props', async () => {
    const { serverPosthogReporter } = await import(
      '@/lib/analytics/reporter-posthog-server'
    );
    serverPosthogReporter.report({
      name: 'rfq_created',
      props: {
        rfqId: 'rfq-1',
        variant: 'wizard',
        completionTimeMs: 1234,
        sectionsOpened: 2,
        usedSmartDefaults: true,
      },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(captureMock).toHaveBeenCalledTimes(1);
    const arg = captureMock.mock.calls[0][0];
    expect(arg.event).toBe('rfq_created');
    expect(arg.distinctId).toBe('rfq:rfq-1');
  });

  it('no-ops when posthog server client is null', async () => {
    serverInstance = null;
    const { serverPosthogReporter } = await import(
      '@/lib/analytics/reporter-posthog-server'
    );
    serverPosthogReporter.report({
      name: 'milestone_celebrated',
      props: { milestone: 'first_rfq', withConfetti: true },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(captureMock).not.toHaveBeenCalled();
  });

  it('falls back to "server" distinct id when no userId/proposalId/rfqId', async () => {
    const { serverPosthogReporter } = await import(
      '@/lib/analytics/reporter-posthog-server'
    );
    serverPosthogReporter.report({
      name: 'milestone_celebrated',
      props: { milestone: 'first_rfq', withConfetti: true },
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(captureMock.mock.calls[0][0].distinctId).toBe('server');
  });
});

describe('browserPosthogReporter', () => {
  it('captures with event name + props', async () => {
    const { browserPosthogReporter } = await import(
      '@/lib/analytics/reporter-posthog-browser'
    );
    browserPosthogReporter.report({
      name: 'ai_confidence_viewed',
      props: { proposalId: 'p-1', level: 'high', sampleSize: 32 },
    });
    expect(captureMock).toHaveBeenCalledWith('ai_confidence_viewed', {
      proposalId: 'p-1',
      level: 'high',
      sampleSize: 32,
    });
  });

  it('no-ops when browser client is null', async () => {
    browserInstance = null;
    const { browserPosthogReporter } = await import(
      '@/lib/analytics/reporter-posthog-browser'
    );
    browserPosthogReporter.report({
      name: 'ai_confidence_viewed',
      props: { proposalId: 'p-1', level: 'high', sampleSize: 32 },
    });
    expect(captureMock).not.toHaveBeenCalled();
  });
});
