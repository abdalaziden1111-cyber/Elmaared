/**
 * Authentic Saudi names library (UX Plan v2 §6, Sprint 4 S4.3).
 *
 * The committee — Atrissi + Krug in Debate 06 — pushed back hard against
 * generic "محمد عام" / "John Smith" placeholders in mocks, seeds, and test
 * fixtures. Every demo screen, every E2E run, every recorded video should
 * show names that a real Saudi user recognises.
 *
 * Fifty names, ten per region:
 *   1. Najd (Riyadh + central)
 *   2. Hijaz (Jeddah + western coast)
 *   3. Eastern Province (Dammam, Khobar, Hofuf)
 *   4. Makkah / Madinah (the two holy cities + surrounding districts)
 *   5. Asir / Jazan (south-west, including ranges and coast)
 *
 * Each entry carries a `gender` ('m' | 'f') for downstream demographic
 * balancing and a `regionLabel` (Arabic) for grouping in dashboards.
 *
 * Usage:
 *   import { saudiNames, pickRandomName } from '@/lib/mock/saudi-names';
 *   const seed = pickRandomName({ seed: rfqId, region: 'najd' });
 *   db.insert({ full_name: seed.name });
 *
 * Rule: NEVER hard-code "John Smith"-style placeholders in this codebase.
 * If the test needs a name, pull from here.
 */

export type SaudiRegion =
  | 'najd'
  | 'hijaz'
  | 'eastern'
  | 'makkah_madinah'
  | 'asir_jazan';

export interface SaudiName {
  name: string;
  region: SaudiRegion;
  /** Inclusive 'm' = male, 'f' = female. */
  gender: 'm' | 'f';
  /** Human-readable Arabic region label for dashboards / mocks. */
  regionLabel: string;
}

const NAJD: SaudiName[] = [
  { name: 'عبدالعزيز السبيعي', region: 'najd', gender: 'm', regionLabel: 'نجد' },
  { name: 'تركي القحطاني', region: 'najd', gender: 'm', regionLabel: 'نجد' },
  { name: 'نوف الفهد', region: 'najd', gender: 'f', regionLabel: 'نجد' },
  { name: 'الجوهرة العنزي', region: 'najd', gender: 'f', regionLabel: 'نجد' },
  { name: 'فهد الرشيد', region: 'najd', gender: 'm', regionLabel: 'نجد' },
  { name: 'ريم الدوسري', region: 'najd', gender: 'f', regionLabel: 'نجد' },
  { name: 'سلطان الحربي', region: 'najd', gender: 'm', regionLabel: 'نجد' },
  { name: 'منى المطيري', region: 'najd', gender: 'f', regionLabel: 'نجد' },
  { name: 'خالد البرّاك', region: 'najd', gender: 'm', regionLabel: 'نجد' },
  { name: 'شهد الزهراني', region: 'najd', gender: 'f', regionLabel: 'نجد' },
];

const HIJAZ: SaudiName[] = [
  { name: 'أحمد المغربي', region: 'hijaz', gender: 'm', regionLabel: 'الحجاز' },
  { name: 'سامي الزواوي', region: 'hijaz', gender: 'm', regionLabel: 'الحجاز' },
  { name: 'رهف الحضرمي', region: 'hijaz', gender: 'f', regionLabel: 'الحجاز' },
  { name: 'ياسمين العقيلي', region: 'hijaz', gender: 'f', regionLabel: 'الحجاز' },
  { name: 'محمد بن لادن', region: 'hijaz', gender: 'm', regionLabel: 'الحجاز' },
  { name: 'دانة الجفري', region: 'hijaz', gender: 'f', regionLabel: 'الحجاز' },
  { name: 'نواف المالكي', region: 'hijaz', gender: 'm', regionLabel: 'الحجاز' },
  { name: 'لجين الباتلي', region: 'hijaz', gender: 'f', regionLabel: 'الحجاز' },
  { name: 'طلال البلوي', region: 'hijaz', gender: 'm', regionLabel: 'الحجاز' },
  { name: 'ميس الفلاتي', region: 'hijaz', gender: 'f', regionLabel: 'الحجاز' },
];

const EASTERN: SaudiName[] = [
  { name: 'علي المعلم', region: 'eastern', gender: 'm', regionLabel: 'المنطقة الشرقية' },
  { name: 'حسين البلوشي', region: 'eastern', gender: 'm', regionLabel: 'المنطقة الشرقية' },
  { name: 'فاطمة العواد', region: 'eastern', gender: 'f', regionLabel: 'المنطقة الشرقية' },
  { name: 'زينب المالكي', region: 'eastern', gender: 'f', regionLabel: 'المنطقة الشرقية' },
  { name: 'عبدالله الزواد', region: 'eastern', gender: 'm', regionLabel: 'المنطقة الشرقية' },
  { name: 'نورة المسعود', region: 'eastern', gender: 'f', regionLabel: 'المنطقة الشرقية' },
  { name: 'إبراهيم المنيف', region: 'eastern', gender: 'm', regionLabel: 'المنطقة الشرقية' },
  { name: 'رهف القصير', region: 'eastern', gender: 'f', regionLabel: 'المنطقة الشرقية' },
  { name: 'ماجد العسيري', region: 'eastern', gender: 'm', regionLabel: 'المنطقة الشرقية' },
  { name: 'سارة العتيبي', region: 'eastern', gender: 'f', regionLabel: 'المنطقة الشرقية' },
];

const MAKKAH_MADINAH: SaudiName[] = [
  { name: 'هاشم الحازمي', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
  { name: 'بدر الشريف', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
  { name: 'شيخة الهاشمي', region: 'makkah_madinah', gender: 'f', regionLabel: 'مكة والمدينة' },
  { name: 'يزن النوري', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
  { name: 'رزان البقمي', region: 'makkah_madinah', gender: 'f', regionLabel: 'مكة والمدينة' },
  { name: 'أنس الجهني', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
  { name: 'روان السلمي', region: 'makkah_madinah', gender: 'f', regionLabel: 'مكة والمدينة' },
  { name: 'يوسف الحجيلي', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
  { name: 'ندى الزائدي', region: 'makkah_madinah', gender: 'f', regionLabel: 'مكة والمدينة' },
  { name: 'فهد العمري', region: 'makkah_madinah', gender: 'm', regionLabel: 'مكة والمدينة' },
];

const ASIR_JAZAN: SaudiName[] = [
  { name: 'فيصل العسيري', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
  { name: 'نورا الشهري', region: 'asir_jazan', gender: 'f', regionLabel: 'عسير وجازان' },
  { name: 'صالح الفيفي', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
  { name: 'أمل القرني', region: 'asir_jazan', gender: 'f', regionLabel: 'عسير وجازان' },
  { name: 'عبدالرحمن المعلمي', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
  { name: 'مشاري الفيفي', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
  { name: 'روان النعيمي', region: 'asir_jazan', gender: 'f', regionLabel: 'عسير وجازان' },
  { name: 'خالد الزهراني', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
  { name: 'سامية القحطاني', region: 'asir_jazan', gender: 'f', regionLabel: 'عسير وجازان' },
  { name: 'يوسف الجهني', region: 'asir_jazan', gender: 'm', regionLabel: 'عسير وجازان' },
];

/** All 50 names in declaration order. Each region contributes 10. */
export const saudiNames: readonly SaudiName[] = Object.freeze([
  ...NAJD,
  ...HIJAZ,
  ...EASTERN,
  ...MAKKAH_MADINAH,
  ...ASIR_JAZAN,
]);

/**
 * Deterministic FNV-1a hash so a given seed always yields the same name
 * across runs — useful for fixtures keyed on `rfq.id` etc. Borrowed from
 * lib/ab-test.ts (same algorithm, kept inline to avoid coupling the mock
 * library to the A/B-test module).
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export interface PickOptions {
  /** Stable string — same seed → same name. Defaults to Date.now(). */
  seed?: string;
  /** Restrict to one region. */
  region?: SaudiRegion;
  /** Restrict to one gender. */
  gender?: 'm' | 'f';
}

/**
 * Return one Saudi name. Filters by region + gender if provided. When the
 * filter is too narrow and matches zero names, returns the first name of
 * the library so callers never get `undefined`.
 */
export function pickRandomName(options: PickOptions = {}): SaudiName {
  const { seed, region, gender } = options;
  const pool = saudiNames.filter(
    (n) =>
      (!region || n.region === region) && (!gender || n.gender === gender),
  );
  if (pool.length === 0) return saudiNames[0];
  const key = seed ?? String(Date.now() + Math.random());
  const hash = fnv1a(key);
  return pool[hash % pool.length];
}

/** Return every name from one region. */
export function namesByRegion(region: SaudiRegion): readonly SaudiName[] {
  return saudiNames.filter((n) => n.region === region);
}
