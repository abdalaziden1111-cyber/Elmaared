/**
 * Fake-review fraud detection (UX Plan v2 §7 scenario 6, Sprint 5 S5.2).
 *
 * Pure heuristic over a supplier's review history. Returns a verdict +
 * the specific signals that fired so admin reviewers can audit decisions
 * later. No NLP — the linguistic-pattern signal needs an LLM call and
 * would couple this module to the AI gateway; we leave that for a future
 * scorer pipeline (`lib/fraud/llm-content-detector.ts`).
 *
 * Decision tiers:
 *   - 'ok'          — nothing suspicious; reviews surface normally.
 *   - 'suspicious'  — at least one weak signal; admin gets a soft flag.
 *   - 'quarantine'  — two or more signals OR one critical one; reviews
 *                     hidden until human reviewer clears them.
 *
 * Designed so a unit test can feed a deterministic review array and
 * assert the verdict — no Supabase, no time-now dependencies (always
 * pass `now` for testability).
 */

export interface ReviewSample {
  id: string;
  rating: number;
  /** ISO timestamp or Date. */
  createdAt: string | Date;
  /** Reviewer's IP at the moment of submission. Optional. */
  ip?: string | null;
  /** Browser / device fingerprint hash. Optional. */
  deviceHash?: string | null;
  /** Reviewer's authenticated user id. Used to detect single-account spam. */
  reviewerId?: string | null;
}

export type FraudSignal =
  | 'burst_cadence'
  | 'ip_collision'
  | 'device_collision'
  | 'all_five_star_streak'
  | 'reviewer_reuse';

export type FraudVerdict = 'ok' | 'suspicious' | 'quarantine';

export interface FraudReport {
  verdict: FraudVerdict;
  signals: FraudSignal[];
  /** Human-readable reason strings (Arabic) for the admin queue. */
  reasons: string[];
}

interface Options {
  /** Reference time. Defaults to Date.now() — pass a fixed date in tests. */
  now?: Date;
}

const BURST_WINDOW_MS = 24 * 60 * 60 * 1000;       // 24 hours
const BURST_THRESHOLD = 5;                         // 5+ reviews in 24h
const STREAK_THRESHOLD = 8;                        // 8 perfect 5-stars in a row
const IP_REUSE_THRESHOLD = 3;                      // 3+ reviews from same IP
const DEVICE_REUSE_THRESHOLD = 3;                  // 3+ reviews from same device
const REVIEWER_REUSE_THRESHOLD = 2;                // 2+ reviews from same user

/**
 * Score the supplier's review history. Pass the recent slice (last 90
 * days is the committee's window) — older reviews are typically too
 * stale to inform a quarantine decision.
 */
export function detectFakeReviews(
  reviews: readonly ReviewSample[],
  options: Options = {},
): FraudReport {
  const now = (options.now ?? new Date()).getTime();
  const signals = new Set<FraudSignal>();
  const reasons: string[] = [];

  // 1. Burst cadence — count reviews within the last 24h.
  let burstCount = 0;
  for (const r of reviews) {
    const ts = new Date(r.createdAt).getTime();
    if (Number.isFinite(ts) && now - ts <= BURST_WINDOW_MS) burstCount++;
  }
  if (burstCount >= BURST_THRESHOLD) {
    signals.add('burst_cadence');
    reasons.push(
      `وصلت ${burstCount} مراجعات خلال ٢٤ ساعة (الحد المعتاد < ${BURST_THRESHOLD}).`,
    );
  }

  // 2. IP collision.
  const ipBuckets = countBy(reviews, (r) => r.ip ?? null);
  for (const [ip, count] of ipBuckets) {
    if (ip != null && count >= IP_REUSE_THRESHOLD) {
      signals.add('ip_collision');
      reasons.push(`${count} مراجعات من نفس عنوان IP.`);
      break;
    }
  }

  // 3. Device collision.
  const deviceBuckets = countBy(reviews, (r) => r.deviceHash ?? null);
  for (const [device, count] of deviceBuckets) {
    if (device != null && count >= DEVICE_REUSE_THRESHOLD) {
      signals.add('device_collision');
      reasons.push(`${count} مراجعات من نفس بصمة الجهاز.`);
      break;
    }
  }

  // 4. Reviewer reuse — same authenticated reviewerId submitted multiple
  // reviews for the same supplier.
  const reviewerBuckets = countBy(reviews, (r) => r.reviewerId ?? null);
  for (const [rid, count] of reviewerBuckets) {
    if (rid != null && count >= REVIEWER_REUSE_THRESHOLD) {
      signals.add('reviewer_reuse');
      reasons.push(`نفس المراجع قدّم ${count} تقييمات.`);
      break;
    }
  }

  // 5. All-five-star streak — count contiguous trailing 5-star reviews
  // (newest-first ordering).
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  let streak = 0;
  for (const r of sorted) {
    if (r.rating === 5) streak++;
    else break;
  }
  if (streak >= STREAK_THRESHOLD) {
    signals.add('all_five_star_streak');
    reasons.push(
      `${streak} تقييمات متتالية بـ ٥ نجوم (الحد < ${STREAK_THRESHOLD}).`,
    );
  }

  const verdict = resolveVerdict(signals);
  return { verdict, signals: [...signals], reasons };
}

function resolveVerdict(signals: Set<FraudSignal>): FraudVerdict {
  if (signals.size === 0) return 'ok';
  // Critical-single signals — any of these alone trips quarantine because
  // there's no legitimate explanation.
  if (
    signals.has('burst_cadence') ||
    signals.has('ip_collision') ||
    signals.has('device_collision') ||
    signals.has('reviewer_reuse')
  ) {
    return 'quarantine';
  }
  // Two-plus weak signals also escalate.
  if (signals.size >= 2) return 'quarantine';
  return 'suspicious';
}

function countBy<T, K>(
  items: readonly T[],
  keyFn: (item: T) => K,
): Map<K, number> {
  const out = new Map<K, number>();
  for (const x of items) {
    const k = keyFn(x);
    out.set(k, (out.get(k) ?? 0) + 1);
  }
  return out;
}
