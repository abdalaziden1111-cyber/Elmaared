'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';
import type { ActionResult } from './auth';

type NotificationType = Database['public']['Enums']['notification_type'];

const ALL_TYPES: NotificationType[] = [
  'rfq_new',
  'rfq_match',
  'proposal_received',
  'proposal_shortlisted',
  'proposal_accepted',
  'proposal_rejected',
  'agreement_pending',
  'escrow_deposit_required',
  'escrow_received',
  'work_started',
  'delivery_pending',
  'delivery_approved',
  'panic_button',
  'message',
  'system',
];

const TIME_REGEX = /^(?:[01]\d|2[0-3]):[0-5]\d$/; // HH:MM 24h

const preferencesSchema = z.object({
  emailDisabledTypes: z.array(z.enum(ALL_TYPES as [NotificationType, ...NotificationType[]])).default([]),
  inAppDisabledTypes: z.array(z.enum(ALL_TYPES as [NotificationType, ...NotificationType[]])).default([]),
  quietHoursStart: z.string().regex(TIME_REGEX).nullable().optional(),
  quietHoursEnd: z.string().regex(TIME_REGEX).nullable().optional(),
  digestFrequency: z.enum(['off', 'daily', 'weekly']).default('off'),
  soundEnabled: z.boolean().default(true),
});

export type NotificationPreferencesInput = z.infer<typeof preferencesSchema>;

export async function getPreferencesAction(): Promise<
  ActionResult<NotificationPreferencesInput>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  const { data: row } = await admin
    .from('notification_preferences')
    .select(
      'email_disabled_types, in_app_disabled_types, quiet_hours_start, quiet_hours_end, digest_frequency, sound_enabled'
    )
    .eq('user_id', user.id)
    .maybeSingle();

  const r = (row ?? {
    email_disabled_types: [],
    in_app_disabled_types: [],
    quiet_hours_start: null,
    quiet_hours_end: null,
    digest_frequency: 'off',
    sound_enabled: true,
  }) as {
    email_disabled_types: NotificationType[];
    in_app_disabled_types: NotificationType[];
    quiet_hours_start: string | null;
    quiet_hours_end: string | null;
    digest_frequency: 'off' | 'daily' | 'weekly';
    sound_enabled: boolean;
  };

  return {
    ok: true,
    data: {
      emailDisabledTypes: r.email_disabled_types ?? [],
      inAppDisabledTypes: r.in_app_disabled_types ?? [],
      quietHoursStart: r.quiet_hours_start ?? null,
      quietHoursEnd: r.quiet_hours_end ?? null,
      digestFrequency: r.digest_frequency,
      soundEnabled: r.sound_enabled,
    },
  };
}

export async function updatePreferencesAction(
  input: unknown
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'بعض الخيارات غير صحيحة.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        email_disabled_types: parsed.data.emailDisabledTypes,
        in_app_disabled_types: parsed.data.inAppDisabledTypes,
        quiet_hours_start: parsed.data.quietHoursStart ?? null,
        quiet_hours_end: parsed.data.quietHoursEnd ?? null,
        digest_frequency: parsed.data.digestFrequency,
        sound_enabled: parsed.data.soundEnabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  if (error) return { ok: false, error: 'فشل في حفظ التفضيلات.' };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard/notifications/preferences');
  return { ok: true };
}

export { ALL_TYPES };
