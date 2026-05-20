// City-name normalisation for analytics aggregation. The `rfqs.city` column
// stores the user-typed string verbatim, so an RFQ created in Arabic UI
// ("الرياض") and one created in English UI ("Riyadh") end up as two
// separate buckets when aggregating by city.
//
// This helper folds the common Arabic + English spellings (plus the
// CITY value column from lib/constants/cities.ts) into a single canonical
// Arabic display name. Unknown strings pass through unchanged so we never
// silently drop user-typed cities.
//
// Long term: add a `city_code` column to `rfqs` and aggregate on that.
// This helper is the cheap interim fix.

import { CITIES } from '@/lib/constants/cities';

const ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const c of CITIES) {
    map[c.value.toLowerCase()] = c.labelAr;
    map[c.labelAr] = c.labelAr;
    map[c.labelEn.toLowerCase()] = c.labelAr;
  }
  // A couple of common alt-spellings that don't appear in CITIES.
  map['al-riyadh'] = 'الرياض';
  map['al riyadh'] = 'الرياض';
  return map;
})();

export function normalizeCityName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  // Try the lowercased form first (handles "Riyadh" vs "riyadh") then the
  // raw form (handles Arabic strings unchanged since toLowerCase() is a
  // no-op on Arabic but we still want to look the literal up).
  return (
    ALIASES[trimmed.toLowerCase()] ?? ALIASES[trimmed] ?? trimmed
  );
}
