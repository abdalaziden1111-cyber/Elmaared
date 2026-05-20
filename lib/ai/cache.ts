// Phase V1.1 — AI scoring cache.
//
// Key: SHA-256 of (model + canonical JSON of the prompt input). The
// canonicalization recursively sorts object keys so a payload that arrives
// with reordered keys still hashes to the same value.
//
// Read path returns the stored payload typed as `unknown` — callers are
// expected to validate it with their own zod schema (the same schema used
// to validate the live AI response), so a corrupted cache entry can't
// poison a downstream insert.

import { createHash } from 'node:crypto';
import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';

export interface CachedEntry<T = unknown> {
  payload: T;
  model: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Recursive JSON.stringify that sorts object keys, so two semantically
 * equal objects with different insertion order hash to the same key.
 * Arrays preserve order (it's meaningful in the prompt).
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map((v) => stableStringify(v)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return (
    '{' +
    keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',') +
    '}'
  );
}

/**
 * Hash key for the AI cache. `operation` lets the same input shape map to
 * separate keys for `score_proposal` vs `analyze_agreement` (extra safety
 * against accidental cross-operation hits when two prompts happen to be
 * structurally similar).
 */
export function hashKey(args: {
  operation: 'score_proposal' | 'analyze_agreement';
  model: string;
  input: unknown;
}): string {
  const canonical = `${args.operation}|${args.model}|${stableStringify(args.input)}`;
  return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Lookup a cache entry. Returns null on miss, on expired entry (auto-deleted
 * by the caller? no — left for the nightly cleanup), or on read failure.
 */
export async function readCache<T = unknown>(
  hash: string,
  admin?: AdminSupabase
): Promise<CachedEntry<T> | null> {
  const client = admin ?? createAdminClient();
  const { data, error } = await client
    .from('ai_score_cache')
    .select('payload, model, created_at, expires_at')
    .eq('hash', hash)
    .maybeSingle();
  if (error) {
    log.error('ai.cache.read_failed', error, { hash });
    return null;
  }
  if (!data) return null;
  const row = data as {
    payload: T;
    model: string;
    created_at: string;
    expires_at: string;
  };
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return {
    payload: row.payload,
    model: row.model,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

/**
 * Write a cache entry, replacing any prior row at the same hash. TTL
 * defaults to 30 days — long enough that real-world re-scoring of the same
 * input lands in cache, short enough that stale market context eventually
 * gets re-priced when the proposal is touched again.
 */
export async function writeCache(args: {
  hash: string;
  operation: 'score_proposal' | 'analyze_agreement';
  payload: unknown;
  model: string;
  ttlDays?: number;
  admin?: AdminSupabase;
}): Promise<void> {
  const client = args.admin ?? createAdminClient();
  const ttlDays = args.ttlDays ?? 30;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await client
    .from('ai_score_cache')
    .upsert({
      hash: args.hash,
      operation: args.operation,
      payload: args.payload,
      model: args.model,
      expires_at: expiresAt,
    });
  if (error) {
    // Cache writes are best-effort — surface in logs, never block the
    // gateway result from landing on the proposals row.
    log.error('ai.cache.write_failed', error, { hash: args.hash });
  }
}
