-- ===================================================================
-- Phase Z2 Item 5 — Apply 7 pending migrations (Sprints 1/3/4/5 + Item 1)
-- ===================================================================
--
-- Paste this whole file into the Supabase SQL Editor and run once.
-- Safe to re-run: each migration is guarded by a tracker table so a
-- partial run can be resumed by pasting again.
--
-- After it completes, run from your laptop:
--   pnpm exec node scripts/verify-pending-migrations.mjs
-- which reads each new table/column/policy back via the service-role
-- PostgREST API and prints a green/red status.
--
-- Migrations included (in order):
--   1. 20261119000001_ai_confidence_metadata.sql
--   2. 20261119000002_ai_feedback.sql
--   3. 20261119000003_supplier_trust_signals.sql
--   4. 20261119000004_user_milestones.sql
--   5. 20261119000005_cultural_preferences.sql
--   6. 20261119000006_supplier_concierge_managed.sql
--   7. 20261201000001_rls_recursion_fix.sql      (Item 1)

-- -------------------------------------------------------------------
-- Tracker — records which migration filenames have already run so a
-- re-paste is cheap.
-- -------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._z2_migrations_applied (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

-- ===================================================================
-- 1. 20261119000001_ai_confidence_metadata.sql
-- ===================================================================
DO $mig01$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000001_ai_confidence_metadata.sql') THEN
    RAISE NOTICE 'mig01 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_confidence_level') THEN
      CREATE TYPE ai_confidence_level AS ENUM ('high', 'medium', 'low', 'unknown');
    END IF;

    ALTER TABLE proposals
      ADD COLUMN IF NOT EXISTS ai_confidence       ai_confidence_level,
      ADD COLUMN IF NOT EXISTS ai_sample_size      INT,
      ADD COLUMN IF NOT EXISTS ai_variance_pct     NUMERIC(5, 2),
      ADD COLUMN IF NOT EXISTS ai_price_range_min  NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS ai_price_range_max  NUMERIC(12, 2);

    COMMENT ON COLUMN proposals.ai_confidence IS
      'Visual confidence bucket derived from sample_size + variance_pct (see lib/ai/confidence.ts).';
    COMMENT ON COLUMN proposals.ai_sample_size IS
      'Number of historical comparable proposals (same service_type, last 12 months) used as the market baseline.';
    COMMENT ON COLUMN proposals.ai_variance_pct IS
      'Coefficient of variation (std/mean*100) of the comparable proposals'' total_price.';
    COMMENT ON COLUMN proposals.ai_price_range_min IS
      'Suggested fair-market lower bound (currency: matches proposals.currency).';
    COMMENT ON COLUMN proposals.ai_price_range_max IS
      'Suggested fair-market upper bound (currency: matches proposals.currency).';

    CREATE INDEX IF NOT EXISTS idx_proposals_ai_confidence
      ON proposals(ai_confidence)
      WHERE ai_confidence IS NOT NULL;

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000001_ai_confidence_metadata.sql');
    RAISE NOTICE 'mig01 applied';
  END IF;
END $mig01$;

-- ===================================================================
-- 2. 20261119000002_ai_feedback.sql
-- ===================================================================
DO $mig02$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000002_ai_feedback.sql') THEN
    RAISE NOTICE 'mig02 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ai_feedback_reason') THEN
      CREATE TYPE ai_feedback_reason AS ENUM (
        'price_too_high',
        'price_too_low',
        'illogical'
      );
    END IF;

    CREATE TABLE IF NOT EXISTS ai_feedback (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      reason      ai_feedback_reason NOT NULL,
      comment     TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (proposal_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_feedback_proposal ON ai_feedback(proposal_id);
    CREATE INDEX IF NOT EXISTS idx_ai_feedback_reason   ON ai_feedback(reason);
    CREATE INDEX IF NOT EXISTS idx_ai_feedback_created  ON ai_feedback(created_at);

    COMMENT ON TABLE ai_feedback IS
      'User-pushback signal for AI proposal scores. Drives retraining (Plan v2 Decision #01).';
    COMMENT ON COLUMN ai_feedback.reason IS
      'High-level bucket — full nuance lives in comment.';

    ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "client_insert_ai_feedback_for_own_rfq" ON ai_feedback;
    CREATE POLICY "client_insert_ai_feedback_for_own_rfq"
      ON ai_feedback FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM proposals p
          JOIN rfqs r ON r.id = p.rfq_id
          WHERE p.id = ai_feedback.proposal_id
            AND r.client_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "client_update_own_ai_feedback" ON ai_feedback;
    CREATE POLICY "client_update_own_ai_feedback"
      ON ai_feedback FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    DROP POLICY IF EXISTS "admin_select_ai_feedback" ON ai_feedback;
    CREATE POLICY "admin_select_ai_feedback"
      ON ai_feedback FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    DROP TRIGGER IF EXISTS ai_feedback_touch_updated_at ON ai_feedback;
    CREATE TRIGGER ai_feedback_touch_updated_at
      BEFORE UPDATE ON ai_feedback
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000002_ai_feedback.sql');
    RAISE NOTICE 'mig02 applied';
  END IF;
END $mig02$;

-- ===================================================================
-- 3. 20261119000003_supplier_trust_signals.sql
-- ===================================================================
DO $mig03$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000003_supplier_trust_signals.sql') THEN
    RAISE NOTICE 'mig03 already applied — skipping';
  ELSE
    CREATE TABLE IF NOT EXISTS supplier_trust_signals (
      supplier_id        UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
      identity_verified  BOOLEAN NOT NULL DEFAULT FALSE,
      zatca_verified     BOOLEAN NOT NULL DEFAULT FALSE,
      references_count   INT NOT NULL DEFAULT 0 CHECK (references_count >= 0),
      photo_id_uploaded  BOOLEAN NOT NULL DEFAULT FALSE,
      gov_id_verified    BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at         TIMESTAMPTZ DEFAULT NOW()
    );

    COMMENT ON TABLE supplier_trust_signals IS
      'Five identity-trust badge signals per supplier. Public read; admin write.';

    DROP TRIGGER IF EXISTS supplier_trust_signals_touch_updated_at ON supplier_trust_signals;
    CREATE TRIGGER supplier_trust_signals_touch_updated_at
      BEFORE UPDATE ON supplier_trust_signals
      FOR EACH ROW EXECUTE FUNCTION update_timestamp();

    ALTER TABLE supplier_trust_signals ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "public_read_trust_signals" ON supplier_trust_signals;
    CREATE POLICY "public_read_trust_signals"
      ON supplier_trust_signals FOR SELECT
      USING (true);

    DROP POLICY IF EXISTS "admin_write_trust_signals" ON supplier_trust_signals;
    CREATE POLICY "admin_write_trust_signals"
      ON supplier_trust_signals FOR ALL
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000003_supplier_trust_signals.sql');
    RAISE NOTICE 'mig03 applied';
  END IF;
END $mig03$;

-- ===================================================================
-- 4. 20261119000004_user_milestones.sql
-- ===================================================================
DO $mig04$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000004_user_milestones.sql') THEN
    RAISE NOTICE 'mig04 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'milestone_type') THEN
      CREATE TYPE milestone_type AS ENUM (
        'first_rfq',
        'first_deal',
        '100k_gmv',
        'yearly_anniversary'
      );
    END IF;

    CREATE TABLE IF NOT EXISTS user_milestones (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      milestone_type milestone_type NOT NULL,
      achieved_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE (user_id, milestone_type)
    );

    CREATE INDEX IF NOT EXISTS idx_user_milestones_user ON user_milestones(user_id);

    COMMENT ON TABLE user_milestones IS
      'Idempotent record of celebration-worthy milestones per user. One row per (user, type).';

    ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "user_read_own_milestones" ON user_milestones;
    CREATE POLICY "user_read_own_milestones"
      ON user_milestones FOR SELECT
      USING (user_id = auth.uid());

    DROP POLICY IF EXISTS "admin_read_all_milestones" ON user_milestones;
    CREATE POLICY "admin_read_all_milestones"
      ON user_milestones FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );

    DROP POLICY IF EXISTS "user_insert_own_milestone" ON user_milestones;
    CREATE POLICY "user_insert_own_milestone"
      ON user_milestones FOR INSERT
      WITH CHECK (user_id = auth.uid());

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000004_user_milestones.sql');
    RAISE NOTICE 'mig04 applied';
  END IF;
END $mig04$;

-- ===================================================================
-- 5. 20261119000005_cultural_preferences.sql
-- ===================================================================
DO $mig05$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000005_cultural_preferences.sql') THEN
    RAISE NOTICE 'mig05 already applied — skipping';
  ELSE
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'calendar_preference') THEN
      CREATE TYPE calendar_preference AS ENUM ('hijri', 'gregorian');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'numerals_preference') THEN
      CREATE TYPE numerals_preference AS ENUM ('arabic-indic', 'latin');
    END IF;

    ALTER TABLE profiles
      ADD COLUMN IF NOT EXISTS preferred_calendar calendar_preference NOT NULL DEFAULT 'hijri',
      ADD COLUMN IF NOT EXISTS preferred_numerals numerals_preference NOT NULL DEFAULT 'arabic-indic';

    COMMENT ON COLUMN profiles.preferred_calendar IS
      'Per-user calendar preference. Drives date rendering across the app.';
    COMMENT ON COLUMN profiles.preferred_numerals IS
      'Per-user numeral system. Drives toLocaleString output across the app.';

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000005_cultural_preferences.sql');
    RAISE NOTICE 'mig05 applied';
  END IF;
END $mig05$;

-- ===================================================================
-- 6. 20261119000006_supplier_concierge_managed.sql
-- ===================================================================
DO $mig06$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261119000006_supplier_concierge_managed.sql') THEN
    RAISE NOTICE 'mig06 already applied — skipping';
  ELSE
    ALTER TABLE suppliers
      ADD COLUMN IF NOT EXISTS is_concierge_managed BOOLEAN NOT NULL DEFAULT FALSE;

    COMMENT ON COLUMN suppliers.is_concierge_managed IS
      'TRUE when Elmaared ops is operating this supplier account during the Concierge MVP phase.';

    CREATE INDEX IF NOT EXISTS idx_suppliers_concierge ON suppliers(is_concierge_managed)
      WHERE is_concierge_managed = TRUE;

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261119000006_supplier_concierge_managed.sql');
    RAISE NOTICE 'mig06 applied';
  END IF;
END $mig06$;

-- ===================================================================
-- 7. 20261201000001_rls_recursion_fix.sql   (Phase Z2 Item 1)
-- ===================================================================
DO $mig07$
BEGIN
  IF EXISTS (SELECT 1 FROM public._z2_migrations_applied
             WHERE filename = '20261201000001_rls_recursion_fix.sql') THEN
    RAISE NOTICE 'mig07 already applied — skipping';
  ELSE
    CREATE OR REPLACE FUNCTION public.user_owns_rfq(p_rfq_id uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      SET search_path = public
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.rfqs r
        WHERE r.id = p_rfq_id AND r.client_id = auth.uid()
      );
    $fn$;

    CREATE OR REPLACE FUNCTION public.user_is_selected_supplier_for_rfq(p_rfq_id uuid)
      RETURNS boolean
      LANGUAGE sql
      SECURITY DEFINER
      STABLE
      SET search_path = public
    AS $fn$
      SELECT EXISTS (
        SELECT 1
        FROM public.proposals p
        JOIN public.suppliers s ON s.id = p.supplier_id
        WHERE p.rfq_id = p_rfq_id
          AND s.owner_id = auth.uid()
          AND p.status IN ('shortlisted', 'accepted')
      );
    $fn$;

    REVOKE EXECUTE ON FUNCTION public.user_owns_rfq(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.user_owns_rfq(uuid) TO authenticated;
    REVOKE EXECUTE ON FUNCTION public.user_is_selected_supplier_for_rfq(uuid) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION public.user_is_selected_supplier_for_rfq(uuid) TO authenticated;

    DROP POLICY IF EXISTS "selected_supplier_view_rfq" ON public.rfqs;
    CREATE POLICY "selected_supplier_view_rfq" ON public.rfqs FOR SELECT
      USING (public.user_is_selected_supplier_for_rfq(id));

    DROP POLICY IF EXISTS "client_view_proposals_for_own_rfq" ON public.proposals;
    CREATE POLICY "client_view_proposals_for_own_rfq" ON public.proposals FOR SELECT
      USING (public.user_owns_rfq(rfq_id) OR public.is_admin());

    INSERT INTO public._z2_migrations_applied(filename)
      VALUES ('20261201000001_rls_recursion_fix.sql');
    RAISE NOTICE 'mig07 applied';
  END IF;
END $mig07$;

-- ===================================================================
-- Final summary
-- ===================================================================
SELECT filename, applied_at
  FROM public._z2_migrations_applied
  ORDER BY filename;
