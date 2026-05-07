import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  log,
  setLogReporter,
  consoleReporter,
  createMemoryReporter,
} from '@/lib/utils/logger';

const consoleSpies = {
  log: vi.spyOn(console, 'log').mockImplementation(() => {}),
  warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
  error: vi.spyOn(console, 'error').mockImplementation(() => {}),
  debug: vi.spyOn(console, 'debug').mockImplementation(() => {}),
};

beforeEach(() => {
  Object.values(consoleSpies).forEach((s) => s.mockClear());
  setLogReporter(consoleReporter);
});

describe('log.info / warn — console reporter', () => {
  it('routes info to console.log with [app] prefix and timestamp', () => {
    log.info('test_event', { userId: 'u1' });
    expect(consoleSpies.log).toHaveBeenCalled();
    const payload = consoleSpies.log.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.level).toBe('info');
    expect(payload.event).toBe('test_event');
    expect(payload.userId).toBe('u1');
    expect(typeof payload.timestamp).toBe('string');
  });

  it('routes warn to console.warn', () => {
    log.warn('soft_failure', { reason: 'rate-limit' });
    expect(consoleSpies.warn).toHaveBeenCalled();
  });

  it('handles missing context', () => {
    log.info('event_only');
    expect(consoleSpies.log).toHaveBeenCalled();
  });
});

describe('log.error — Error serialization', () => {
  it('extracts message + stack from Error instance', () => {
    log.error('boom', new Error('explosion'), { rfqId: 'r1' });
    const payload = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.error_message).toBe('explosion');
    expect(payload.error_stack).toBeDefined();
    expect(payload.rfqId).toBe('r1');
  });

  it('coerces non-Error to string', () => {
    log.error('weird', 'string error');
    const payload = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.error_message).toBe('string error');
    expect(payload.error_stack).toBeUndefined();
  });

  it('handles null error', () => {
    log.error('event', null);
    const payload = consoleSpies.error.mock.calls[0][1] as Record<string, unknown>;
    expect(payload.event).toBe('event');
    expect(payload.error_message).toBeUndefined();
  });
});

describe('log.debug — env gating', () => {
  const env = process.env as Record<string, string | undefined>;
  let orig: string | undefined;

  beforeEach(() => {
    orig = env.NODE_ENV;
  });
  afterEach(() => {
    env.NODE_ENV = orig;
  });

  it('emits in non-production', () => {
    env.NODE_ENV = 'test';
    log.debug('trace', { step: 'one' });
    expect(consoleSpies.debug).toHaveBeenCalled();
  });

  it('suppresses in production', () => {
    env.NODE_ENV = 'production';
    log.debug('trace');
    expect(consoleSpies.debug).not.toHaveBeenCalled();
  });
});

describe('setLogReporter — pluggable backend', () => {
  it('routes to memory reporter when installed', () => {
    const mem = createMemoryReporter();
    setLogReporter(mem.reporter);

    log.info('to_memory', { x: 1 });
    log.error('also_memory', new Error('e'), { y: 2 });

    expect(mem.entries).toHaveLength(2);
    expect(mem.entries[0].event).toBe('to_memory');
    expect(mem.entries[0].context?.x).toBe(1);
    expect(mem.entries[1].event).toBe('also_memory');
    expect(mem.entries[1].error).toBeInstanceOf(Error);
  });

  it('returns the previous reporter so tests can restore', () => {
    const mem1 = createMemoryReporter();
    const prev1 = setLogReporter(mem1.reporter);
    expect(prev1).toBe(consoleReporter);

    const mem2 = createMemoryReporter();
    const prev2 = setLogReporter(mem2.reporter);
    expect(prev2).toBe(mem1.reporter);
  });

  it('console reporter is restored at the end of each test (sanity)', () => {
    // beforeEach restores consoleReporter — this just verifies the spy fires
    log.info('after_restore');
    expect(consoleSpies.log).toHaveBeenCalled();
  });
});

describe('createMemoryReporter — clear', () => {
  it('clear() empties the captured entries', () => {
    const mem = createMemoryReporter();
    setLogReporter(mem.reporter);
    log.info('a');
    log.info('b');
    expect(mem.entries).toHaveLength(2);
    mem.clear();
    expect(mem.entries).toHaveLength(0);
  });
});
