-- Phase V1.1 — AI usage + cost tracking.
--
-- Every call to scoreProposal()/analyzeAgreement() that actually hits the
-- gateway writes one row. The daily rate-limit reads SUM(cost_usd) WHERE
-- user_id = ? AND created_at >= today; the admin dashboard reads the whole
-- table.
--
-- user_id is nullable so system-driven jobs (nightly lead scoring batch,
-- admin recompute) can log without claiming a user. cost_usd uses
-- NUMERIC(10,6) so sub-cent precision (~$10K cap) survives aggregation.

CREATE TABLE ai_usage_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  operation    TEXT NOT NULL,                -- 'score_proposal' | 'analyze_agreement' | 'score_lead'
  tokens_in    INT  NOT NULL DEFAULT 0,
  tokens_out   INT  NOT NULL DEFAULT 0,
  cost_usd     NUMERIC(10, 6) NOT NULL DEFAULT 0,
  model        TEXT NOT NULL,
  request_id   TEXT,                          -- optional provider-side trace id
  cache_hit    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: today's spend per user — the rate limiter reads this on every
-- AI call. We'd ideally use a partial index (WHERE created_at > now() - 7d)
-- but Postgres requires IMMUTABLE predicates and NOW() is VOLATILE. The
-- full index is still bounded by call volume (one row per gateway call).
CREATE INDEX idx_ai_usage_log_user_recent
  ON ai_usage_log (user_id, created_at DESC);

-- Admin dashboard sort.
CREATE INDEX idx_ai_usage_log_created ON ai_usage_log (created_at DESC);

COMMENT ON TABLE ai_usage_log IS
  'One row per AI gateway call. Drives the per-user daily budget cap and the admin AI-spend dashboard.';

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read; service-role bypasses RLS for inserts so no policy
-- is needed for that side.
CREATE POLICY "admin_read_ai_usage_log"
  ON ai_usage_log FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
