-- Phase V1.1 — AI scoring cache.
--
-- Keyed by SHA-256 of (model + canonical prompt input). On a cache hit we
-- replay the stored `payload` into the proposals row instead of calling
-- the gateway, saving the cost + latency. TTL is enforced at read time
-- (expires_at check); a periodic cleanup job can DELETE expired rows.
--
-- Stored verbatim from the gateway response so the proposals row gets the
-- exact same score/summary/strengths/concerns on every replay. Schema-light
-- (JSONB) because the payload shape can evolve with the AI without
-- needing a migration.

CREATE TABLE ai_score_cache (
  hash         TEXT PRIMARY KEY,            -- SHA-256 hex
  operation    TEXT NOT NULL,               -- 'score_proposal' | 'analyze_agreement'
  payload      JSONB NOT NULL,              -- the exact gateway output
  model        TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL
);

-- Cleanup index — `DELETE FROM ai_score_cache WHERE expires_at < NOW()`
-- runs nightly via the existing scripts/ pattern.
CREATE INDEX idx_ai_score_cache_expires ON ai_score_cache (expires_at);

COMMENT ON TABLE ai_score_cache IS
  'Idempotent cache for AI scoring outputs. Key = SHA-256 of (model + canonical prompt input). Skips a gateway round-trip when the same proposal/agreement is re-scored within the TTL.';

ALTER TABLE ai_score_cache ENABLE ROW LEVEL SECURITY;

-- Service-role only — no end-user ever queries the cache directly.
-- Admins can read for diagnostics.
CREATE POLICY "admin_read_ai_score_cache"
  ON ai_score_cache FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
