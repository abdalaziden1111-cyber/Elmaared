-- UX Plan v2 Decision #01 (Sprint 1 S1.1) — AI Confidence Framework.
--
-- Adds market-quality metadata to proposals so the comparison UI can show a
-- 4-level visual indicator (🟢 high / 🔵 medium / 🟡 low / ⚪ unknown) plus a
-- price range, instead of a single naked AI score number.
--
-- The five new columns are populated by `lib/ai/score-proposal.ts` at the same
-- moment the AI score is generated. They describe the QUALITY OF THE MARKET
-- DATA used to ground the AI's judgment (sample size + variance + range), not
-- the AI's own self-assessment. That separation is intentional — per Josh
-- Clark in Debate 01, AI shouldn't be allowed to invent its own confidence.

CREATE TYPE ai_confidence_level AS ENUM ('high', 'medium', 'low', 'unknown');

ALTER TABLE proposals
  ADD COLUMN ai_confidence       ai_confidence_level,
  ADD COLUMN ai_sample_size      INT,
  ADD COLUMN ai_variance_pct     NUMERIC(5, 2),
  ADD COLUMN ai_price_range_min  NUMERIC(12, 2),
  ADD COLUMN ai_price_range_max  NUMERIC(12, 2);

COMMENT ON COLUMN proposals.ai_confidence IS
  'Visual confidence bucket derived from sample_size + variance_pct (see lib/ai/confidence.ts).';
COMMENT ON COLUMN proposals.ai_sample_size IS
  'Number of historical comparable proposals (same service_type, last 12 months) used as the market baseline.';
COMMENT ON COLUMN proposals.ai_variance_pct IS
  'Coefficient of variation (std/mean*100) of the comparable proposals'' total_price. Higher = more disagreement in the market.';
COMMENT ON COLUMN proposals.ai_price_range_min IS
  'Suggested fair-market lower bound (currency: matches proposals.currency).';
COMMENT ON COLUMN proposals.ai_price_range_max IS
  'Suggested fair-market upper bound (currency: matches proposals.currency).';

-- Partial index — only "scored" rows have a confidence value, so a partial
-- index keeps it cheap. Used by future admin/BI queries filtering by quality.
CREATE INDEX idx_proposals_ai_confidence
  ON proposals(ai_confidence)
  WHERE ai_confidence IS NOT NULL;
