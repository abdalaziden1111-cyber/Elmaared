-- Phase V4.2 — Per-user notification preferences.
--
-- Stores three things:
--   1. Which notification_type values send email (default: all)
--   2. Which send in-app (default: all — empty array means "follow legacy
--      always-on behavior", populated array means strict allow-list)
--   3. Sound + quiet-hours + digest_frequency knobs
--
-- The dispatcher (lib/notifications/dispatch.ts) reads this table on every
-- send and decides whether to insert + email. Missing row = defaults.

CREATE TABLE notification_preferences (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_disabled_types notification_type[] NOT NULL DEFAULT '{}',
  in_app_disabled_types notification_type[] NOT NULL DEFAULT '{}',
  quiet_hours_start    TIME,                       -- e.g. 22:00 — emails skipped between this and end
  quiet_hours_end      TIME,                       -- e.g. 07:00 — wraps midnight if end < start
  digest_frequency     TEXT NOT NULL DEFAULT 'off' CHECK (digest_frequency IN ('off','daily','weekly')),
  sound_enabled        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notification_preferences IS
  'Per-user notification + email preferences. Missing row = full defaults (everything on, no quiet hours, no digest).';
COMMENT ON COLUMN notification_preferences.email_disabled_types IS
  'Notification types the user OPTED OUT of receiving via email. Empty array = email all.';
COMMENT ON COLUMN notification_preferences.in_app_disabled_types IS
  'Notification types the user OPTED OUT of seeing in-app. Empty array = in-app all.';
COMMENT ON COLUMN notification_preferences.digest_frequency IS
  'off | daily | weekly — when not off, the dispatcher batches non-urgent emails into a single digest instead of one per event.';

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_prefs"
  ON notification_preferences FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_upsert_own_prefs"
  ON notification_preferences FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_update_own_prefs"
  ON notification_preferences FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
