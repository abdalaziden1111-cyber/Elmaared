/**
 * Trust-account naming — "أمانة Elmaared™" / "Elmaared Trust™".
 *
 * UX Plan v2 Decision #04: the committee replaced "Escrow" with "أمانة" because
 * the Arabic word carries religious and ethical weight that builds trust
 * instantly with a Saudi audience.
 *
 * History: Sprint 0 shipped the rename behind `FF_AMANAH` for a fast rollback
 * path. Sprint 1 (S1.0) retired the flag — Amanah is now the canonical name
 * across every buyer/supplier surface. Admin pages keep "Escrow" terminology
 * for the legal/operational context (Plan v2 Debate 04).
 *
 * Why a helper instead of inlining the literals: most escrow surfaces use
 * hard-coded Arabic strings (breadcrumbs, inline labels) and never go through
 * next-intl. The helper keeps the brand mark (™) consistent and lets us swap
 * naming in one place if a future v3 changes it again.
 */

export type TrustLocale = 'ar' | 'en';

const NAMES: Record<TrustLocale, string> = {
  ar: 'أمانة Elmaared™',
  en: 'Elmaared Trust™',
};

const STATUS_LABELS: Record<TrustLocale, string> = {
  ar: 'قيد أمانة Elmaared',
  en: 'In Elmaared Trust',
};

/**
 * Branded name for the trust account in the active locale.
 *
 * Example:
 *   trustName('ar') → "أمانة Elmaared™"
 *   trustName('en') → "Elmaared Trust™"
 *
 * Admin surfaces should NOT use this helper — they keep "Escrow" for the
 * legal/operational context (per Plan v2, Debate 04).
 */
export function trustName(locale: TrustLocale = 'ar'): string {
  return NAMES[locale];
}

/**
 * Localised status label for `rfqs.status = 'in_escrow'`. Used by the buyer
 * dashboard chip and any list view that shows RFQ status.
 */
export function inTrustStatusLabel(locale: TrustLocale = 'ar'): string {
  return STATUS_LABELS[locale];
}

/**
 * Legal disambiguation shown in tooltips next to the Amanah brand mark.
 * Even with the rename, contracts and regulatory pages must mention the
 * underlying Escrow Service term so callers know what they're agreeing to.
 */
export function trustLegalTooltip(locale: TrustLocale = 'ar'): string {
  if (locale === 'en') return 'Legally known as an Escrow Service.';
  return 'تُعرف قانونياً بـ Escrow Service.';
}
