// Combines FormData → object reshape → Zod validation in one helper so
// every Server Action doesn't reinvent the same boilerplate. Returns a
// discriminated result the action can return directly.

import type { z, ZodTypeAny } from 'zod';

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors: Record<string, string[]> };

/**
 * Parse a FormData using a Zod schema. The shape extractor takes the
 * raw FormData and returns the candidate object — leaving caller in
 * control of trimming/JSON parsing/type coercion before validation.
 *
 * On failure returns `fieldErrors` shaped like `result.error.flatten()`
 * so the form UI can highlight specific fields.
 */
export function parseActionInput<S extends ZodTypeAny>(
  formData: FormData,
  schema: S,
  shape: (fd: FormData) => Record<string, unknown>
): ParseResult<z.infer<S>> {
  let candidate: Record<string, unknown>;
  try {
    candidate = shape(formData);
  } catch {
    return {
      ok: false,
      error: 'بيانات النموذج غير صحيحة.',
      fieldErrors: {},
    };
  }

  const parsed = schema.safeParse(candidate);
  if (parsed.success) {
    return { ok: true, data: parsed.data as z.infer<S> };
  }

  const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
  // Filter out undefined entries that Zod sometimes produces
  const cleanFieldErrors: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(fieldErrors)) {
    if (Array.isArray(v) && v.length > 0) {
      cleanFieldErrors[k] = v;
    }
  }

  return {
    ok: false,
    error: 'تأكد من تعبئة جميع الحقول بشكل صحيح.',
    fieldErrors: cleanFieldErrors,
  };
}
