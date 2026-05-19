-- UX Plan v2 Decision #01 (Sprint 1 S1.4) — "I disagree" signal collection.
--
-- Josh Clark in Debate 01: every AI suggestion needs a way for the user to
-- push back. The button is in the UI; this table is where the disagreement
-- lands so the ML team can use it to retrain.
--
-- One row per (proposal_id, user_id) — users can change their mind by
-- re-submitting (upsert on the unique key). Comments are optional. RLS
-- restricts INSERT/UPDATE to the proposal's RFQ owner; SELECT is admin-only
-- because the data is operational signal, not user-visible content.

CREATE TYPE ai_feedback_reason AS ENUM (
  'price_too_high',
  'price_too_low',
  'illogical'
);

CREATE TABLE ai_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      ai_feedback_reason NOT NULL,
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (proposal_id, user_id)
);

CREATE INDEX idx_ai_feedback_proposal ON ai_feedback(proposal_id);
CREATE INDEX idx_ai_feedback_reason   ON ai_feedback(reason);
CREATE INDEX idx_ai_feedback_created  ON ai_feedback(created_at);

COMMENT ON TABLE ai_feedback IS
  'User-pushback signal for AI proposal scores. Drives retraining (Plan v2 Decision #01).';
COMMENT ON COLUMN ai_feedback.reason IS
  'High-level bucket — full nuance lives in comment.';

-- RLS
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- A user can write feedback only on proposals whose parent RFQ they own.
-- Match the policy pattern used elsewhere in 20260501000009_rls_policies.sql.
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

CREATE POLICY "client_update_own_ai_feedback"
  ON ai_feedback FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- SELECT is admin-only; client UI doesn't need to read its own feedback
-- (the button does an upsert via server action either way).
CREATE POLICY "admin_select_ai_feedback"
  ON ai_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Keep updated_at in sync.
CREATE TRIGGER ai_feedback_touch_updated_at
  BEFORE UPDATE ON ai_feedback
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();
