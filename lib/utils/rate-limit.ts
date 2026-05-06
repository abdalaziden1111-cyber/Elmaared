// In-memory token-bucket rate limiter. Used to throttle expensive
// operations (AI scoring, email fanout, panic alerts) so a misbehaving
// supplier can't drain budget by submitting 100 proposals in a minute.
//
// This is per-process — fine for a single Vercel function invocation
// but doesn't share state across instances. For cross-instance limits
// we'd need Vercel KV / Upstash, which is a follow-up. The contract here
// is designed so swapping the storage backend is a one-line change.

interface Bucket {
  tokens: number;
  updatedAtMs: number;
}

export interface RateLimitConfig {
  /** How many calls per window. */
  capacity: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** When the next token becomes available (ms epoch). 0 if capacity available. */
  resetAtMs: number;
}

/**
 * Creates a rate limiter scoped to a config. Each `check(key)` call
 * decrements the bucket for that key. The bucket regenerates linearly
 * over `windowMs`.
 *
 * `now()` is injectable so tests can advance time deterministically
 * without `vi.useFakeTimers`.
 */
export function createRateLimiter(
  config: RateLimitConfig,
  now: () => number = () => Date.now()
) {
  if (!Number.isFinite(config.capacity) || config.capacity <= 0) {
    throw new Error('capacity must be a positive number');
  }
  if (!Number.isFinite(config.windowMs) || config.windowMs <= 0) {
    throw new Error('windowMs must be a positive number');
  }

  const buckets = new Map<string, Bucket>();
  const refillRate = config.capacity / config.windowMs;

  function refill(bucket: Bucket, currentMs: number): void {
    const elapsed = currentMs - bucket.updatedAtMs;
    if (elapsed <= 0) return;
    const refilled = elapsed * refillRate;
    bucket.tokens = Math.min(config.capacity, bucket.tokens + refilled);
    bucket.updatedAtMs = currentMs;
  }

  return {
    check(key: string): RateLimitResult {
      if (!key) {
        throw new Error('rate-limit key must be a non-empty string');
      }
      const currentMs = now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { tokens: config.capacity, updatedAtMs: currentMs };
        buckets.set(key, bucket);
      } else {
        refill(bucket, currentMs);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return {
          allowed: true,
          remaining: Math.floor(bucket.tokens),
          resetAtMs: 0,
        };
      }

      // Need (1 - bucket.tokens) more tokens, at refillRate per ms
      const needed = 1 - bucket.tokens;
      const waitMs = Math.ceil(needed / refillRate);
      return {
        allowed: false,
        remaining: 0,
        resetAtMs: currentMs + waitMs,
      };
    },

    reset(key?: string): void {
      if (key) buckets.delete(key);
      else buckets.clear();
    },
  };
}
