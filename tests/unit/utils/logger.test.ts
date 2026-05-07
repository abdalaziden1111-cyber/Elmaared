import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '@/lib/utils/logger';

const consoleSpies = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
};

beforeEach(() => {
  Object.values(consoleSpies).forEach((s) => s.mockClear());
});

describe('log.info', () => {
  it('routes to console.log with [app] prefix', () => {
    log.info('test_event', { userId: 'u1' });
    expect(consoleSpies.log).toHaveBeenCalledWith(
      '[app]',
      expect.objectContaining({ level: 'info', event: 'test_event', userId: 'u1' })
    );
  });

  it('handles missing context', () => {
    log.info('event_only');
    expect(consoleSpies.log).toHaveBeenCalled();
  });
});

describe('log.warn', () => {
  it('routes to console.warn', () => {
    log.warn('soft_failure', { reason: 'rate-limit' });
    expect(consoleSpies.warn).toHaveBeenCalledWith(
      '[app]',
      expect.objectContaining({ level: 'warn', event: 'soft_failure' })
    );
  });
});

describe('log.error', () => {
  it('routes to console.error and serializes the Error', () => {
    const err = new Error('boom');
    log.error('payment_failed', err, { rfqId: 'r1' });
    const call = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(call.level).toBe('error');
    expect(call.event).toBe('payment_failed');
    expect(call.error_message).toBe('boom');
    expect(call.error_stack).toBeDefined();
    expect(call.rfqId).toBe('r1');
  });

  it('coerces non-Error values', () => {
    log.error('weird', 'string error');
    const call = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(call.error_message).toBe('string error');
    expect(call.error_stack).toBeUndefined();
  });

  it('handles null error', () => {
    log.error('event', null);
    const call = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(call.event).toBe('event');
    expect(call.error_message).toBeUndefined();
  });
});

describe('log.debug', () => {
  // process.env.NODE_ENV is readonly under @types/node; cast through Record
  // for the test's runtime-only mutation.
  const env = process.env as Record<string, string | undefined>;

  it('emits in non-production', () => {
    const orig = env.NODE_ENV;
    env.NODE_ENV = 'test';
    log.debug('trace', { step: 'one' });
    expect(consoleSpies.debug).toHaveBeenCalled();
    env.NODE_ENV = orig;
  });

  it('suppresses in production', () => {
    const orig = env.NODE_ENV;
    env.NODE_ENV = 'production';
    log.debug('trace');
    expect(consoleSpies.debug).not.toHaveBeenCalled();
    env.NODE_ENV = orig;
  });
});
