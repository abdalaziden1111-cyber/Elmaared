import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Phase Z2 Item 4 smoke test.
//
// instrumentation.ts is a Next.js boot hook — Next runs `register()` once
// per server runtime. The hook is DSN-gated: nothing happens unless
// SENTRY_DSN is set. When it IS set, the hook should:
//   1. Call Sentry.init exactly once with the DSN.
//   2. Install a logReporter that forwards error-level events to
//      Sentry.captureException, and warn-level events to Sentry.captureMessage.
//
// Both behaviors are covered below by mocking @sentry/nextjs.

const initMock = vi.fn();
const captureExceptionMock = vi.fn();
const captureMessageMock = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
}));

const ORIGINAL_DSN = process.env.SENTRY_DSN;
const ORIGINAL_PUBLIC_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

beforeEach(() => {
  initMock.mockReset();
  captureExceptionMock.mockReset();
  captureMessageMock.mockReset();
  vi.resetModules();
});

afterEach(() => {
  if (ORIGINAL_DSN === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = ORIGINAL_DSN;
  if (ORIGINAL_PUBLIC_DSN === undefined) delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  else process.env.NEXT_PUBLIC_SENTRY_DSN = ORIGINAL_PUBLIC_DSN;
});

describe('instrumentation.ts — Sentry wiring', () => {
  it('is a no-op when SENTRY_DSN is unset', async () => {
    delete process.env.SENTRY_DSN;
    const { register } = await import('@/instrumentation');
    await register();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('calls Sentry.init with the DSN when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://dummy@example.ingest.sentry.io/1';
    const { register } = await import('@/instrumentation');
    await register();
    expect(initMock).toHaveBeenCalledTimes(1);
    const initArgs = initMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(initArgs.dsn).toBe('https://dummy@example.ingest.sentry.io/1');
    expect(initArgs.environment).toBeDefined();
  });

  it('forwards log.error to Sentry.captureException via the installed reporter', async () => {
    process.env.SENTRY_DSN = 'https://dummy@example.ingest.sentry.io/1';
    const { register } = await import('@/instrumentation');
    await register();

    // After register(), the structured logger now routes through Sentry.
    const { log } = await import('@/lib/utils/logger');
    const err = new Error('boom');
    log.error('test_event', err, { request_id: 'req_1' });

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [capturedErr, scope] = captureExceptionMock.mock.calls[0] ?? [];
    expect(capturedErr).toBe(err);
    const s = scope as { tags?: Record<string, string>; extra?: Record<string, unknown> };
    expect(s.tags?.event).toBe('test_event');
    expect(s.extra?.request_id).toBe('req_1');
  });

  it('forwards log.warn to Sentry.captureMessage', async () => {
    process.env.SENTRY_DSN = 'https://dummy@example.ingest.sentry.io/1';
    const { register } = await import('@/instrumentation');
    await register();

    const { log } = await import('@/lib/utils/logger');
    log.warn('warn_event', { user_id: 'u_42' });

    expect(captureMessageMock).toHaveBeenCalledTimes(1);
    const [msg, scope] = captureMessageMock.mock.calls[0] ?? [];
    expect(msg).toBe('warn_event');
    const s = scope as { level?: string; extra?: Record<string, unknown> };
    expect(s.level).toBe('warning');
    expect(s.extra?.user_id).toBe('u_42');
  });
});

describe('instrumentation-client.ts — browser Sentry wiring', () => {
  it('is a no-op when NEXT_PUBLIC_SENTRY_DSN is unset', async () => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
    const { register } = await import('@/instrumentation-client');
    await register();
    expect(initMock).not.toHaveBeenCalled();
  });

  it('inits Sentry on the client with replay options when DSN is set', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://browser@example.ingest.sentry.io/2';
    const { register } = await import('@/instrumentation-client');
    await register();
    expect(initMock).toHaveBeenCalledTimes(1);
    const args = initMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(args.dsn).toBe('https://browser@example.ingest.sentry.io/2');
    expect(args.replaysOnErrorSampleRate).toBe(1.0);
  });

  it('tags client-side log.error captures with runtime=browser', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://browser@example.ingest.sentry.io/2';
    const { register } = await import('@/instrumentation-client');
    await register();

    const { log } = await import('@/lib/utils/logger');
    const err = new Error('client boom');
    log.error('client_test_event', err, { tab_id: 'abc' });

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const [, scope] = captureExceptionMock.mock.calls[0] ?? [];
    const s = scope as { tags?: Record<string, string>; extra?: Record<string, unknown> };
    expect(s.tags?.runtime).toBe('browser');
    expect(s.tags?.event).toBe('client_test_event');
    expect(s.extra?.tab_id).toBe('abc');
  });
});
