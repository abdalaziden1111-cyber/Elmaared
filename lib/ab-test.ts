/**
 * Deterministic A/B test bucketing for UX Plan v2 experiments.
 *
 * Each user is assigned to a stable bucket (A or B) per experiment, based on
 * a hash of (userId + experimentKey). Same user → same bucket across sessions,
 * which is what we need to measure per-decision metrics (Conversion, NPS,
 * Comprehension) without skewing from re-bucketing.
 *
 * 50/50 split is the default — overridable per experiment.
 */

/**
 * Simple non-cryptographic 32-bit hash (FNV-1a). Stable across runtimes,
 * sufficient for bucketing. Don't use for anything security-sensitive.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export type Variant = 'A' | 'B';

export interface BucketOptions {
  /** Probability of being in variant B, between 0 and 1. Default 0.5. */
  variantBWeight?: number;
}

/**
 * Assign a user to variant A or B for a given experiment.
 *
 * @param userId — stable identifier (Supabase user id). For anonymous users,
 *   pass the session id; the bucket will flip on logout, which is acceptable
 *   pre-login.
 * @param experimentKey — e.g. "rfq_single_screen", "ai_confidence_4level"
 */
export function bucket(
  userId: string,
  experimentKey: string,
  options: BucketOptions = {},
): Variant {
  const weight = options.variantBWeight ?? 0.5;
  const hash = fnv1a(`${userId}:${experimentKey}`);
  const normalized = hash / 0xffffffff;
  return normalized < weight ? 'B' : 'A';
}

/**
 * Bucketing for the v2 experiments tracked in the UX Plan. Names match the
 * feature flag keys for legibility, but bucketing is independent — a user can
 * be in variant B while the flag is off (e.g. during a holdout group), or in
 * variant A while the flag is on globally (rollout phase).
 */
export const experiments = {
  AI_CONFIDENCE_4LEVEL: 'ai_confidence_4level',
  RFQ_SINGLE_SCREEN: 'rfq_single_screen',
  AMANAH_NAMING: 'amanah_naming',
  CELEBRATION_MODALS: 'celebration_modals',
  HIJRI_DEFAULT: 'hijri_default',
} as const;
