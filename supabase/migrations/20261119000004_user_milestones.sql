-- UX Plan v2 Decision #07 + #13 (Sprint 3 S3.4) — Emotional Trust Layer.
--
-- Tracks the milestone events the buyer-side UI celebrates with the
-- `<CelebrationModal>` (confetti + Saudi-green confetti palette, per Plan v2
-- Δ4). The UNIQUE constraint on (user_id, milestone_type) guarantees a
-- celebration fires exactly once per user per milestone — re-renders don't
-- spam confetti, the user gets their dopamine hit and not a tax-audit.

CREATE TYPE milestone_type AS ENUM (
  'first_rfq',
  'first_deal',
  '100k_gmv',
  'yearly_anniversary'
);

CREATE TABLE user_milestones (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  milestone_type milestone_type NOT NULL,
  achieved_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, milestone_type)
);

CREATE INDEX idx_user_milestones_user ON user_milestones(user_id);

COMMENT ON TABLE user_milestones IS
  'Idempotent record of celebration-worthy milestones per user. One row per (user, type).';

-- RLS — user can read + insert their own milestone rows; admin reads all.
ALTER TABLE user_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_read_own_milestones"
  ON user_milestones FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admin_read_all_milestones"
  ON user_milestones FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "user_insert_own_milestone"
  ON user_milestones FOR INSERT
  WITH CHECK (user_id = auth.uid());
