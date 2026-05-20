-- Phase V1.2 — AI-flagged risky/deviating clauses on agreements.
--
-- Populated by `analyzeAgreement()` after the AI reviews both sides'
-- understandings against the Saudi commercial-law templates in
-- lib/ai/legal-templates.ts. Each entry shape:
--   { clause: string, deviation: string, severity: 'high'|'medium'|'low' }
--
-- Default is an empty array so existing rows (and the no-AI fallback path)
-- don't need a backfill — the column always has a valid JSONB array.

ALTER TABLE agreements
  ADD COLUMN ai_risky_clauses JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN agreements.ai_risky_clauses IS
  'AI-flagged deviations from Saudi commercial norms. Array of {clause, deviation, severity}. Empty array means no issues flagged.';
