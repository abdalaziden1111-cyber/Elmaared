// Helpers for safely pulling values out of FormData inside Server Actions.
// FormData entries are FormDataEntryValue (string | File), so naive casts
// silently mishandle file inputs, multi-value fields, and missing keys.
// Centralizing here gives every action consistent fallback behavior.

/**
 * Returns the trimmed string value for `key`, or null if missing/empty/file.
 * Use this when an empty string should be treated the same as a missing field.
 */
export function getFormString(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** Returns the raw string value untouched, or '' if missing. */
export function getFormStringOrEmpty(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === 'string' ? v : '';
}

/**
 * Parses the field as a number. Returns null when:
 * - the field is missing
 * - the field is a File (would have NaN'd via Number())
 * - the result is NaN or non-finite
 */
export function getFormNumber(formData: FormData, key: string): number | null {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses the field as JSON. Returns null on missing field, non-string value,
 * or invalid JSON. Caller is expected to validate the shape afterwards
 * (e.g. with Zod) — this only guarantees the JSON parses.
 */
export function getFormJson<T = unknown>(formData: FormData, key: string): T | null {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/**
 * Parses a JSON array of strings. Common shape across our wizards
 * (specializations, cities, photos). Returns [] on failure or non-array
 * — never returns null so callers don't need a separate empty-array branch.
 */
export function getFormStringArray(formData: FormData, key: string): string[] {
  const parsed = getFormJson<unknown>(formData, key);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((x): x is string => typeof x === 'string');
}

/**
 * Reads a file from FormData. Returns null when the field is missing,
 * a string (legacy form), or an empty placeholder file (size 0).
 */
export function getFormFile(formData: FormData, key: string): File | null {
  const v = formData.get(key);
  if (!(v instanceof File)) return null;
  if (v.size === 0) return null;
  return v;
}
