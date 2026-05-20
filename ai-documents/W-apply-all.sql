-- ===================================================================
-- Phase W1 — Apply 10 pending Phase V migrations
-- ===================================================================
--
-- Paste this whole file into the Supabase SQL Editor and run once.
-- Safe to re-run: each migration is guarded by a tracker table so a
-- partial run can be resumed by pasting again.
--
-- After it completes, run from your laptop:
--   pnpm exec node scripts/verify-pending-migrations.mjs
-- which probes the new tables/columns/enums/buckets and prints a
-- green/red status per check.
--
-- Migrations included (in order):
--   1.  20260520000005_milestones_expand.sql       (V2.1 — enum ADD VALUEs)
--   2.  20260520000006_ai_usage_log.sql            (V1.1 — table + RLS)
--   3.  20260520000007_ai_score_cache.sql          (V1.1 — table + RLS)
--   4.  20260520000008_agreement_risky_clauses.sql (V1.2 — ALTER TABLE)
--   5.  20260520000009_lead_scores.sql             (V1.3 — enum + table)
--   6.  20260520000010_notification_filters.sql    (V4.1 — index)
--   7.  20260520000011_notification_preferences.sql (V4.2 — table + RLS)
--   8.  20260520000012_blog_posts.sql              (V5.1 — enum + table + trigger)
--   9.  20260520000013_blog_images_bucket.sql      (V5.1 — Storage bucket + RLS)
--  10.  20260520000014_supplier_kpi_indexes.sql    (V6.1 — indexes)

-- -------------------------------------------------------------------
-- Tracker — records which migration filenames have already run so a
-- re-paste is cheap. Separate from Z2 tracker so each phase's
-- application status is independently visible.
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._w_migrations_applied (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ===================================================================
-- 1. 20260520000005_milestones_expand.sql
-- ===================================================================
-- ALTER TYPE ADD VALUE cannot run inside a DO block (Postgres rule:
-- new enum values can't be used in the same transaction). The
-- statements below are idempotent on their own thanks to IF NOT EXISTS,
-- so we run them unconditionally and mark applied via a separate INSERT.

ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_proposal_received';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_chat_opened';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_agreement_signed';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_escrow_funded';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_project_completed';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS '500k_gmv';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS '1m_gmv';

COMMENT ON TYPE milestone_type IS
  'Celebration buckets. Personal firsts (first_rfq, first_proposal_received, first_chat_opened, first_agreement_signed, first_escrow_funded, first_project_completed) + GMV tiers (100k_gmv, 500k_gmv, 1m_gmv) + yearly_anniversary. Legacy first_deal retained for back-compat with Phase U seeded rows; new code emits first_agreement_signed.';

INSERT INTO public._w_migrations_applied(filename)
  VALUES ('20260520000005_milestones_expand.sql')
  ON CONFLICT (filename) DO NOTHING;

-- ===================================================================
-- 2. 20260520000006_ai_usage_log.sql
-- ===================================================================
DO $mig06$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000006_ai_usage_log.sql') THEN
    RAISE NOTICE 'mig06 already applied — skipping';
  ELSE
    CREATE TABLE IF NOT EXISTS ai_usage_log (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      operation    TEXT NOT NULL,
      tokens_in    INT  NOT NULL DEFAULT 0,
      tokens_out   INT  NOT NULL DEFAULT 0,
      cost_usd     NUMERIC(10, 6) NOT NULL DEFAULT 0,
      model        TEXT NOT NULL,
      request_id   TEXT,
      cache_hit    BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Postgres requires IMMUTABLE predicates; NOW() is VOLATILE. We drop
    -- the WHERE clause — the resulting full index still hits the
    -- rate-limit lookup (which always filters by user_id + created_at).
    CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_recent
      ON ai_usage_log (user_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_ai_usage_log_created
      ON ai_usage_log (created_at DESC);

    COMMENT ON TABLE ai_usage_log IS
      'One row per AI gateway call. Drives the per-user daily budget cap and the admin AI-spend dashboard.';

    ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

    -- Drop-then-create makes the policy idempotent without IF NOT EXISTS.
    DROP POLICY IF EXISTS "admin_read_ai_usage_log" ON ai_usage_log;
    CREATE POLICY "admin_read_ai_usage_log"
      ON ai_usage_log FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000006_ai_usage_log.sql');
    RAISE NOTICE 'mig06 applied';
  END IF;
END $mig06$;

-- ===================================================================
-- 3. 20260520000007_ai_score_cache.sql
-- ===================================================================
DO $mig07$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000007_ai_score_cache.sql') THEN
    RAISE NOTICE 'mig07 already applied — skipping';
  ELSE
    CREATE TABLE IF NOT EXISTS ai_score_cache (
      hash         TEXT PRIMARY KEY,
      operation    TEXT NOT NULL,
      payload      JSONB NOT NULL,
      model        TEXT NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at   TIMESTAMPTZ NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_score_cache_expires
      ON ai_score_cache (expires_at);

    COMMENT ON TABLE ai_score_cache IS
      'Idempotent cache for AI scoring outputs. Key = SHA-256 of (model + canonical prompt input).';

    ALTER TABLE ai_score_cache ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "admin_read_ai_score_cache" ON ai_score_cache;
    CREATE POLICY "admin_read_ai_score_cache"
      ON ai_score_cache FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000007_ai_score_cache.sql');
    RAISE NOTICE 'mig07 applied';
  END IF;
END $mig07$;

-- ===================================================================
-- 4. 20260520000008_agreement_risky_clauses.sql
-- ===================================================================
DO $mig08$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000008_agreement_risky_clauses.sql') THEN
    RAISE NOTICE 'mig08 already applied — skipping';
  ELSE
    ALTER TABLE agreements
      ADD COLUMN IF NOT EXISTS ai_risky_clauses JSONB NOT NULL DEFAULT '[]'::jsonb;

    COMMENT ON COLUMN agreements.ai_risky_clauses IS
      'AI-flagged deviations from Saudi commercial norms. Array of {clause, deviation, severity}. Empty array = no issues flagged.';

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000008_agreement_risky_clauses.sql');
    RAISE NOTICE 'mig08 applied';
  END IF;
END $mig08$;

-- ===================================================================
-- 5. 20260520000009_lead_scores.sql
-- ===================================================================
DO $mig09$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000009_lead_scores.sql') THEN
    RAISE NOTICE 'mig09 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_category') THEN
      CREATE TYPE lead_category AS ENUM ('hot', 'warm', 'cold');
    END IF;

    CREATE TABLE IF NOT EXISTS lead_scores (
      id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id              UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
      category             lead_category NOT NULL,
      score                INT NOT NULL CHECK (score BETWEEN 0 AND 100),
      signals              JSONB NOT NULL DEFAULT '{}'::jsonb,
      narrative            TEXT,
      previous_category    lead_category,
      last_computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_hot_alerted_at  TIMESTAMPTZ,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_lead_scores_category_score
      ON lead_scores (category, score DESC);

    CREATE INDEX IF NOT EXISTS idx_lead_scores_last_computed
      ON lead_scores (last_computed_at);

    COMMENT ON TABLE lead_scores IS
      'AI lead-scoring snapshot per user. Deterministic base score; AI narrative on-demand only.';

    ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "admin_read_lead_scores" ON lead_scores;
    CREATE POLICY "admin_read_lead_scores"
      ON lead_scores FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000009_lead_scores.sql');
    RAISE NOTICE 'mig09 applied';
  END IF;
END $mig09$;

-- ===================================================================
-- 6. 20260520000010_notification_filters.sql
-- ===================================================================
DO $mig10$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000010_notification_filters.sql') THEN
    RAISE NOTICE 'mig10 already applied — skipping';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
      ON notifications (user_id, type, created_at DESC);

    COMMENT ON INDEX idx_notifications_user_type_created IS
      'V4.1 — supports the filter-tab + recency sort on the rebuilt notifications page.';

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000010_notification_filters.sql');
    RAISE NOTICE 'mig10 applied';
  END IF;
END $mig10$;

-- ===================================================================
-- 7. 20260520000011_notification_preferences.sql
-- ===================================================================
DO $mig11$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000011_notification_preferences.sql') THEN
    RAISE NOTICE 'mig11 already applied — skipping';
  ELSE
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      email_disabled_types  notification_type[] NOT NULL DEFAULT '{}',
      in_app_disabled_types notification_type[] NOT NULL DEFAULT '{}',
      quiet_hours_start     TIME,
      quiet_hours_end       TIME,
      digest_frequency      TEXT NOT NULL DEFAULT 'off' CHECK (digest_frequency IN ('off','daily','weekly')),
      sound_enabled         BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    COMMENT ON TABLE notification_preferences IS
      'Per-user notification + email preferences. Missing row = full defaults.';

    ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "user_read_own_prefs" ON notification_preferences;
    CREATE POLICY "user_read_own_prefs"
      ON notification_preferences FOR SELECT
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "user_upsert_own_prefs" ON notification_preferences;
    CREATE POLICY "user_upsert_own_prefs"
      ON notification_preferences FOR INSERT
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "user_update_own_prefs" ON notification_preferences;
    CREATE POLICY "user_update_own_prefs"
      ON notification_preferences FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000011_notification_preferences.sql');
    RAISE NOTICE 'mig11 applied';
  END IF;
END $mig11$;

-- ===================================================================
-- 8. 20260520000012_blog_posts.sql
-- ===================================================================
DO $mig12$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000012_blog_posts.sql') THEN
    RAISE NOTICE 'mig12 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'blog_status') THEN
      CREATE TYPE blog_status AS ENUM ('draft', 'scheduled', 'published');
    END IF;

    CREATE TABLE IF NOT EXISTS blog_posts (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      slug                  TEXT NOT NULL UNIQUE,
      title_ar              TEXT NOT NULL,
      title_en              TEXT,
      excerpt_ar            TEXT,
      excerpt_en            TEXT,
      content_ar            TEXT NOT NULL,
      content_en            TEXT,
      cover_image           TEXT,
      author_id             UUID REFERENCES profiles(id),
      published_at          TIMESTAMPTZ,
      status                blog_status NOT NULL DEFAULT 'draft',
      tags                  TEXT[] NOT NULL DEFAULT '{}',
      seo_title_ar          TEXT,
      seo_title_en          TEXT,
      seo_description_ar    TEXT,
      seo_description_en    TEXT,
      reading_time_minutes  INT,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
      ON blog_posts (status, published_at DESC NULLS LAST);

    CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN (tags);

    COMMENT ON TABLE blog_posts IS
      'Bilingual blog posts authored via /admin/blog.';

    ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "anon_read_published_blog_posts" ON blog_posts;
    CREATE POLICY "anon_read_published_blog_posts"
      ON blog_posts FOR SELECT
      USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

    DROP POLICY IF EXISTS "admin_read_all_blog_posts" ON blog_posts;
    CREATE POLICY "admin_read_all_blog_posts"
      ON blog_posts FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    DROP POLICY IF EXISTS "admin_write_blog_posts" ON blog_posts;
    CREATE POLICY "admin_write_blog_posts"
      ON blog_posts FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    CREATE OR REPLACE FUNCTION set_blog_posts_updated_at()
    RETURNS TRIGGER AS $set_blog_posts_updated_at$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $set_blog_posts_updated_at$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON blog_posts;
    CREATE TRIGGER trg_blog_posts_updated_at
      BEFORE UPDATE ON blog_posts
      FOR EACH ROW
      EXECUTE FUNCTION set_blog_posts_updated_at();

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000012_blog_posts.sql');
    RAISE NOTICE 'mig12 applied';
  END IF;
END $mig12$;

-- ===================================================================
-- 9. 20260520000013_blog_images_bucket.sql
-- ===================================================================
DO $mig13$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000013_blog_images_bucket.sql') THEN
    RAISE NOTICE 'mig13 already applied — skipping';
  ELSE
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'blog-images',
      'blog-images',
      true,
      5 * 1024 * 1024,
      ARRAY['image/png','image/jpeg','image/webp','image/avif']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = EXCLUDED.public,
          file_size_limit = EXCLUDED.file_size_limit,
          allowed_mime_types = EXCLUDED.allowed_mime_types;

    DROP POLICY IF EXISTS "admin_write_blog_images" ON storage.objects;
    CREATE POLICY "admin_write_blog_images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'blog-images'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    DROP POLICY IF EXISTS "admin_update_blog_images" ON storage.objects;
    CREATE POLICY "admin_update_blog_images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'blog-images'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    DROP POLICY IF EXISTS "admin_delete_blog_images" ON storage.objects;
    CREATE POLICY "admin_delete_blog_images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'blog-images'
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000013_blog_images_bucket.sql');
    RAISE NOTICE 'mig13 applied';
  END IF;
END $mig13$;

-- ===================================================================
-- 10. 20260520000014_supplier_kpi_indexes.sql
-- ===================================================================
DO $mig14$
BEGIN
  IF EXISTS (SELECT 1 FROM public._w_migrations_applied
             WHERE filename = '20260520000014_supplier_kpi_indexes.sql') THEN
    RAISE NOTICE 'mig14 already applied — skipping';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_proposals_supplier_status_created
      ON proposals (supplier_id, status, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_reviews_supplier_created
      ON reviews (supplier_id, created_at DESC)
      WHERE is_public = TRUE;

    COMMENT ON INDEX idx_proposals_supplier_status_created IS
      'V6.1 — supports KPI tile + monthly revenue + win-rate-by-category queries.';
    COMMENT ON INDEX idx_reviews_supplier_created IS
      'V6.1 — supports rating trend + avg-rating tiles. Partial WHERE is_public matches the public read filter.';

    INSERT INTO public._w_migrations_applied(filename)
      VALUES ('20260520000014_supplier_kpi_indexes.sql');
    RAISE NOTICE 'mig14 applied';
  END IF;
END $mig14$;

-- ===================================================================
-- Final status — should show 10 rows
-- ===================================================================
SELECT filename, applied_at
FROM public._w_migrations_applied
WHERE filename LIKE '2026052000001%' OR filename = '20260520000005_milestones_expand.sql'
   OR filename = '20260520000006_ai_usage_log.sql'
   OR filename = '20260520000007_ai_score_cache.sql'
   OR filename = '20260520000008_agreement_risky_clauses.sql'
   OR filename = '20260520000009_lead_scores.sql'
ORDER BY filename;
