-- Phase V4.1 — Notification filtering indexes.
--
-- The rebuilt notifications page filters by category (RFQ/proposal/chat/
-- payment/review/system) on top of user_id. Add a covering index so the
-- tab switch is hot even at 10k+ rows per user.
--
-- We don't add a generated `category` column because the mapping lives in
-- application code (lib/notifications/category.ts) and the enum is the
-- authoritative source — duplicating the mapping in two places is bug-
-- prone. The index below covers the common WHERE shape:
--   user_id = ? AND type IN (…) ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON notifications (user_id, type, created_at DESC);

COMMENT ON INDEX idx_notifications_user_type_created IS
  'Phase V4.1 — supports the filter-tab + recency sort on the rebuilt notifications page.';
