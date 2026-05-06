import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/utils/rate-limit';

describe('createRateLimiter — config validation', () => {
  it('throws on non-finite capacity', () => {
    expect(() =>
      createRateLimiter({ capacity: NaN, windowMs: 1000 })
    ).toThrow();
    expect(() =>
      createRateLimiter({ capacity: Infinity, windowMs: 1000 })
    ).toThrow();
  });

  it('throws on zero/negative capacity', () => {
    expect(() => createRateLimiter({ capacity: 0, windowMs: 1000 })).toThrow();
    expect(() => createRateLimiter({ capacity: -1, windowMs: 1000 })).toThrow();
  });

  it('throws on non-finite windowMs', () => {
    expect(() => createRateLimiter({ capacity: 5, windowMs: NaN })).toThrow();
  });

  it('throws on zero/negative windowMs', () => {
    expect(() => createRateLimiter({ capacity: 5, windowMs: 0 })).toThrow();
    expect(() => createRateLimiter({ capacity: 5, windowMs: -1000 })).toThrow();
  });
});

describe('createRateLimiter — happy path', () => {
  it('allows up to capacity requests', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 3, windowMs: 1000 }, () => now);

    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(false);
  });

  it('decrements remaining count', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 3, windowMs: 1000 }, () => now);

    expect(rl.check('user').remaining).toBe(2);
    expect(rl.check('user').remaining).toBe(1);
    expect(rl.check('user').remaining).toBe(0);
  });

  it('reports resetAtMs when blocked', () => {
    let now = 1000;
    const rl = createRateLimiter({ capacity: 1, windowMs: 1000 }, () => now);
    rl.check('user'); // exhaust
    const blocked = rl.check('user');
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetAtMs).toBeGreaterThan(now);
  });

  it('isolates per-key buckets', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 1, windowMs: 1000 }, () => now);
    expect(rl.check('alice').allowed).toBe(true);
    expect(rl.check('bob').allowed).toBe(true);
    expect(rl.check('alice').allowed).toBe(false);
    expect(rl.check('bob').allowed).toBe(false);
  });
});

describe('createRateLimiter — refill', () => {
  it('refills tokens linearly over time', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 4, windowMs: 1000 }, () => now);

    // exhaust
    for (let i = 0; i < 4; i++) rl.check('user');
    expect(rl.check('user').allowed).toBe(false);

    // advance 250ms — should refill 1 token (4 / 1000 * 250 = 1)
    now = 250;
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(false);

    // advance another 250ms — refill another token
    now = 500;
    expect(rl.check('user').allowed).toBe(true);
  });

  it('caps refill at capacity (no infinite accumulation)', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 3, windowMs: 1000 }, () => now);

    // wait for a long time without checking — bucket should still be full but not overfull
    now = 1_000_000;
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(true);
    expect(rl.check('user').allowed).toBe(false);
  });
});

describe('createRateLimiter — reset', () => {
  it('reset(key) clears one bucket', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 1, windowMs: 1000 }, () => now);
    rl.check('user'); // exhaust
    expect(rl.check('user').allowed).toBe(false);
    rl.reset('user');
    expect(rl.check('user').allowed).toBe(true);
  });

  it('reset() with no key clears everything', () => {
    let now = 0;
    const rl = createRateLimiter({ capacity: 1, windowMs: 1000 }, () => now);
    rl.check('alice');
    rl.check('bob');
    rl.reset();
    expect(rl.check('alice').allowed).toBe(true);
    expect(rl.check('bob').allowed).toBe(true);
  });
});

describe('createRateLimiter — invalid keys', () => {
  it('throws on empty key', () => {
    const rl = createRateLimiter({ capacity: 5, windowMs: 1000 });
    expect(() => rl.check('')).toThrow();
  });
});
