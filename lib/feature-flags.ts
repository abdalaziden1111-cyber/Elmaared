/**
 * Feature flags for UX Design Plan v2 rollout.
 *
 * Why: each binding decision from the UX committee (Plan v2) ships behind a
 * flag so we can A/B test, rollback without a deploy, and keep the v1 behavior
 * intact when a flag is OFF. Default is always OFF — a missing env var keeps
 * the app on the v1 path.
 *
 * Naming: NEXT_PUBLIC_FF_<DECISION> — public because most flags are read by
 * client components. Server code reads the same env at request time.
 */

function readFlag(envVar: string | undefined): boolean {
  return envVar === 'true' || envVar === '1';
}

export const flags = {
  /** Decision #01 — AI Confidence Indicator (🟢🔵🟡⚪) + range + sample size */
  AI_CONFIDENCE_UI: readFlag(process.env.NEXT_PUBLIC_FF_AI_CONFIDENCE),

  /** Decision #02 — RFQ Single-screen + 3 collapsible sections + Smart Defaults */
  RFQ_SINGLE_SCREEN: readFlag(process.env.NEXT_PUBLIC_FF_RFQ_SINGLE),

  // Decision #04 — "أمانة Elmaared™" naming retired the FF_AMANAH flag in
  // Sprint 1 (S1.0). Amanah is now the canonical default; no flag needed.
  // See lib/i18n/trust-name.ts.

  /** Decision #07 — Trust Architecture (Identity + Process + Outcome) badges/bars */
  TRUST_ARCHITECTURE: readFlag(process.env.NEXT_PUBLIC_FF_TRUST),

  /** Decision #06 — Hijri calendar as default date display */
  HIJRI_DEFAULT: readFlag(process.env.NEXT_PUBLIC_FF_HIJRI),

  /** Decision #06 — Prayer times widget in Day-of console */
  PRAYER_TIMES: readFlag(process.env.NEXT_PUBLIC_FF_PRAYER),

  /** Decision #08 — Concierge MVP UI copy ("فريقنا يبحث لك" vs "X supplier available") */
  CONCIERGE_MODE: readFlag(process.env.NEXT_PUBLIC_FF_CONCIERGE),

  /** Decision #06 — Arabic-Indic numerals (١٢٣) instead of Latin (123) */
  ARABIC_NUMERALS: readFlag(process.env.NEXT_PUBLIC_FF_NUMERALS),

  /** Decision #13 — Celebration modals + confetti on milestones */
  CELEBRATION_MODALS: readFlag(process.env.NEXT_PUBLIC_FF_CELEBRATION),

  /** Decision #11 — PDPL consent banner on first visit */
  PDPL_CONSENT: readFlag(process.env.NEXT_PUBLIC_FF_PDPL),
} as const;

export type FeatureFlag = keyof typeof flags;

/** Runtime check for a single flag — useful inside dynamic helpers. */
export function isEnabled(flag: FeatureFlag): boolean {
  return flags[flag];
}
