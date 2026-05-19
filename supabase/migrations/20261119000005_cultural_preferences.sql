-- UX Plan v2 Decision #06 (Sprint 4 S4.1) — Saudi Cultural Layer
-- preferences. Two per-user knobs that drive how dates and numbers are
-- rendered across the app:
--
--   preferred_calendar = 'hijri' | 'gregorian'
--   preferred_numerals = 'arabic-indic' | 'latin'
--
-- Stored on the existing `profiles` row instead of a new `user_preferences`
-- table because both columns are per-account (not per-device) and the
-- profile is already loaded in every authenticated render.
--
-- Defaults match the committee's recommendation (Plan v2 §6, Atrissi):
-- Hijri-first dates and Arabic-Indic numerals for Saudi users. The
-- Gregorian / Latin fallbacks remain a one-click toggle away (HijriToggle,
-- NumeralsToggle — S4.2).

CREATE TYPE calendar_preference AS ENUM ('hijri', 'gregorian');
CREATE TYPE numerals_preference AS ENUM ('arabic-indic', 'latin');

ALTER TABLE profiles
  ADD COLUMN preferred_calendar calendar_preference NOT NULL DEFAULT 'hijri',
  ADD COLUMN preferred_numerals numerals_preference NOT NULL DEFAULT 'arabic-indic';

COMMENT ON COLUMN profiles.preferred_calendar IS
  'Per-user calendar preference. Drives date rendering across the app.';
COMMENT ON COLUMN profiles.preferred_numerals IS
  'Per-user numeral system. Drives toLocaleString output across the app.';
