// Phase V4.2 — Central notification dispatcher.
//
// Single entry point for every server action that wants to notify a user.
// Reads preferences, gates in-app insert + email send, respects quiet
// hours. Designed to be called from inside safeAfter() so a failed send
// never blocks the triggering request.
//
// Pre-V4 the actions inserted into the notifications table directly. New
// code paths should use this function instead — it preserves the
// "system_X" notification_type → category mapping in one place and makes
// preference enforcement uniform across the app.

import type { AdminSupabase } from '@/lib/supabase/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { log } from '@/lib/utils/logger';
import {
  buildNotification,
  notificationTypeOf,
  type BuildNotificationArgs,
  type RecipientRole,
} from './build';
import type { NotificationType } from './category';
import { notificationEmail } from '@/lib/email/notification-template';

export interface DispatchArgs {
  /** The recipient profile id. */
  userId: string;
  /** Discriminated payload — same shape buildNotification() consumes. */
  args: BuildNotificationArgs;
  /** Optional links to the underlying resources for the table FKs. */
  rfqId?: string | null;
  proposalId?: string | null;
  chatId?: string | null;
  /** When true, bypass quiet hours (use for high-urgency events). */
  forceEmail?: boolean;
  admin?: AdminSupabase;
}

interface PrefsRow {
  email_disabled_types: NotificationType[] | null;
  in_app_disabled_types: NotificationType[] | null;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  digest_frequency: 'off' | 'daily' | 'weekly';
}

/**
 * Decide whether `now` (UTC time-of-day "HH:MM:SS") falls within the
 * user's quiet hours window. Handles the wrap-midnight case
 * (start=22:00, end=07:00 → quiet from 22:00 to next-day 07:00).
 */
function inQuietHours(
  start: string | null,
  end: string | null,
  now: Date
): boolean {
  if (!start || !end) return false;
  const cur =
    now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const s = parseTimeToSeconds(start);
  const e = parseTimeToSeconds(end);
  if (s === null || e === null) return false;
  if (s === e) return false;
  if (s < e) return cur >= s && cur < e;
  // Wraps midnight.
  return cur >= s || cur < e;
}

function parseTimeToSeconds(t: string): number | null {
  // Accepts HH:MM or HH:MM:SS.
  const m = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0);
}

/**
 * Lookup the recipient's email via auth.admin. Returns null if not
 * available (deleted user, etc.); dispatcher then skips the email leg.
 */
async function lookupEmail(
  admin: AdminSupabase,
  userId: string
): Promise<string | null> {
  try {
    const { data } = await admin.auth.admin.getUserById(userId);
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Lookup the recipient's preferred locale and role in one round-trip.
 * Role drives role-aware link routing in buildNotification() so that
 * `message` and `agreement_pending` notifications fired at a supplier
 * land on the supplier surface rather than 404-ing on a client-only URL.
 */
async function lookupRecipient(
  admin: AdminSupabase,
  userId: string
): Promise<{ locale: string | null; role: RecipientRole | null }> {
  const { data } = await admin
    .from('profiles')
    .select('preferred_language, role')
    .eq('id', userId)
    .maybeSingle();
  const row = data as { preferred_language: string | null; role: RecipientRole | null } | null;
  return {
    locale: row?.preferred_language ?? null,
    role: row?.role ?? null,
  };
}

export async function dispatchNotification(
  dispatch: DispatchArgs
): Promise<void> {
  const admin = dispatch.admin ?? createAdminClient();
  const type = notificationTypeOf(dispatch.args);

  // Preferences fetch — missing row = defaults (everything on).
  const { data: prefsRowRaw } = await admin
    .from('notification_preferences')
    .select(
      'email_disabled_types, in_app_disabled_types, quiet_hours_start, quiet_hours_end, digest_frequency'
    )
    .eq('user_id', dispatch.userId)
    .maybeSingle();
  const prefs = (prefsRowRaw ?? null) as PrefsRow | null;

  const inAppOff = prefs?.in_app_disabled_types?.includes(type) ?? false;
  const emailOff = prefs?.email_disabled_types?.includes(type) ?? false;
  const isDigestMode = (prefs?.digest_frequency ?? 'off') !== 'off';
  const quietNow = inQuietHours(
    prefs?.quiet_hours_start ?? null,
    prefs?.quiet_hours_end ?? null,
    new Date()
  );

  const { locale, role } = await lookupRecipient(admin, dispatch.userId);
  const payload = buildNotification(dispatch.args, locale, role);

  // 1. In-app insert (unless opted out).
  if (!inAppOff) {
    const { error } = await admin.from('notifications').insert({
      user_id: dispatch.userId,
      type,
      title: payload.title,
      body: payload.body,
      link: payload.link,
      rfq_id: dispatch.rfqId ?? null,
      proposal_id: dispatch.proposalId ?? null,
      chat_id: dispatch.chatId ?? null,
    });
    if (error) {
      log.error('dispatch.in_app_insert_failed', error, {
        user_id: dispatch.userId,
        type,
      });
    }
  }

  // 2. Email send (unless opted out OR digest mode is on for this user OR
  //    quiet hours are active and the caller hasn't set forceEmail).
  if (emailOff) return;
  if (isDigestMode) return; // batched separately by the digest cron
  if (quietNow && !dispatch.forceEmail) return;

  const email = await lookupEmail(admin, dispatch.userId);
  if (!email) return;

  try {
    const { subject, html } = notificationEmail({
      title: payload.title,
      body: payload.body,
      link: payload.link,
    });
    const result = await sendEmail({ to: email, subject, html });
    if (result.skipped) return; // dev-mode: no key
    if (result.error) {
      log.warn('dispatch.email_send_failed');
    } else {
      await admin
        .from('notifications')
        .update({ sent_email: true })
        .eq('user_id', dispatch.userId)
        .eq('type', type)
        // Best-effort marker on the most recent row of this type. Acceptable
        // for the dashboard summary, not a billing-quality audit field.
        .order('created_at', { ascending: false })
        .limit(1);
    }
  } catch (err) {
    log.error('dispatch.email_threw', err, { user_id: dispatch.userId, type });
  }
}

// Re-exported for tests + callers that want the side-effect-free quiet
// check (used by the digest cron to filter "would-have-sent-now" emails).
export const __testing = { inQuietHours };
