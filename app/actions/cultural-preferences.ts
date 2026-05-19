'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { log } from '@/lib/utils/logger';
import type { ActionResult } from './auth';

// UX Plan v2 Decision #06 (Sprint 4 S4.2) — persists the user's calendar +
// numerals preferences to `profiles`. Idempotent: the caller can pass one
// preference or both. Validates inputs via Zod so a malformed FormData
// fails closed.

const schema = z.object({
  calendar: z.enum(['hijri', 'gregorian']).optional(),
  numerals: z.enum(['arabic-indic', 'latin']).optional(),
});

export async function updateCulturalPreferencesAction(
  input: z.infer<typeof schema>,
): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'تفضيل غير صالح.' };
  }
  const { calendar, numerals } = parsed.data;
  if (!calendar && !numerals) {
    return { ok: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  // Build the partial update — only set fields the caller provided so a
  // single-knob update doesn't clobber the other preference.
  const patch: Record<string, string> = {};
  if (calendar) patch.preferred_calendar = calendar;
  if (numerals) patch.preferred_numerals = numerals;

  const { error } = await admin
    .from('profiles')
    .update(patch)
    .eq('id', user.id);

  if (error) {
    log.error('cultural_preferences.update_failed', error, {
      user_id: user.id,
      patch,
    });
    return { ok: false, error: 'تعذّر حفظ التفضيل.' };
  }

  // Refresh the dashboard so the next render picks up the new preference.
  revalidatePath('/dashboard');
  return { ok: true };
}
