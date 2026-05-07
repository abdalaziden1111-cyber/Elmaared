import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server's `after` to run the callback synchronously, so we can
// observe success/error paths without an actual Next runtime.
vi.mock('next/server', () => ({
  after: (fn: () => Promise<void> | void) => {
    void Promise.resolve().then(() => fn());
  },
}));

const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

beforeEach(() => {
  consoleErrorSpy.mockClear();
});

async function flushPromises() {
  // Two ticks: one for the after() promise wrapper, one for the inner await
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

describe('safeAfter', () => {
  it('runs the callback', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    const fn = vi.fn().mockResolvedValue('ok');
    safeAfter('test_event', fn);
    await flushPromises();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('catches a rejected promise and logs structured error', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    safeAfter('test_event', () => Promise.reject(new Error('boom')));
    await flushPromises();
    expect(consoleErrorSpy).toHaveBeenCalled();
    const payload = consoleErrorSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.event).toBe('after.test_event');
    expect(payload.error_message).toBe('boom');
  });

  it('catches a thrown error in a sync callback', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    safeAfter('sync_throw', () => {
      throw new Error('sync boom');
    });
    await flushPromises();
    expect(consoleErrorSpy).toHaveBeenCalled();
    const payload = consoleErrorSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.error_message).toBe('sync boom');
  });

  it('passes context through to the logger', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    safeAfter(
      'with_context',
      () => Promise.reject(new Error('x')),
      { rfq_id: 'rfq-123', supplier_count: 5 }
    );
    await flushPromises();
    const payload = consoleErrorSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.rfq_id).toBe('rfq-123');
    expect(payload.supplier_count).toBe(5);
  });

  it('does not throw when callback succeeds', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    expect(() => safeAfter('ok', () => Promise.resolve())).not.toThrow();
    await flushPromises();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('handles non-Error rejections', async () => {
    const { safeAfter } = await import('@/lib/utils/safe-after');
    safeAfter('weird_reject', () => Promise.reject('just a string'));
    await flushPromises();
    expect(consoleErrorSpy).toHaveBeenCalled();
    const payload = consoleErrorSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.error_message).toBe('just a string');
  });
});
