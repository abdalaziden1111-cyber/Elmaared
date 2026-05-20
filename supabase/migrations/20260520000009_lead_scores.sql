-- Phase V1.3 — AI Lead Scoring.
--
-- One row per user (client or supplier) capturing the current "temperature"
-- of the lead. Deterministic signals power the base score 0-100; the AI
-- narrative is optional and only fetched on admin recompute (keeps the
-- nightly batch cheap and predictable).
--
-- `previous_category` lets the cold→hot transition detector fire an email
-- alert without scanning history. `last_hot_alerted_at` debounces the
-- alert (max 1 per 7 days per user) so a flapping lead doesn't spam admins.

CREATE TYPE lead_category AS ENUM ('hot', 'warm', 'cold');

CREATE TABLE lead_scores (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  category             lead_category NOT NULL,
  score                INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  signals              JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative            TEXT,                          -- AI summary, optional
  previous_category    lead_category,
  last_computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hot_alerted_at  TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hot path: admin dashboard sorts by category + score.
CREATE INDEX idx_lead_scores_category_score
  ON lead_scores (category, score DESC);

-- Nightly batch picks rows older than 24 h.
CREATE INDEX idx_lead_scores_last_computed
  ON lead_scores (last_computed_at);

COMMENT ON TABLE lead_scores IS
  'AI lead-scoring snapshot per user. Deterministic base score; AI narrative on-demand only. Used by /admin/leads + nightly batch + cold→hot email alerts.';

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

-- Admin only — leads are an internal CRM concept; users don't see their
-- own score. Service-role bypasses RLS for the batch writer.
CREATE POLICY "admin_read_lead_scores"
  ON lead_scores FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
