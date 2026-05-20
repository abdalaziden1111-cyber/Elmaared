-- Phase V2.1 — Expand celebration milestones from 4 → 10.
--
-- New types layer the buyer journey (first proposal received, first chat,
-- first agreement, first escrow funded, first project completed) and add
-- two higher GMV tiers (500k, 1m). The legacy `first_deal` value stays in
-- the enum for back-compat with seeded rows from Phase U; new code paths
-- emit `first_agreement_signed` instead.
--
-- ALTER TYPE ... ADD VALUE is non-transactional in Postgres and cannot be
-- combined with other statements that USE the new value in the same
-- transaction. Each ADD VALUE runs in its own implicit transaction; this
-- file holds nothing else so a partial run is safe to retry.

ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_proposal_received';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_chat_opened';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_agreement_signed';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_escrow_funded';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS 'first_project_completed';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS '500k_gmv';
ALTER TYPE milestone_type ADD VALUE IF NOT EXISTS '1m_gmv';

COMMENT ON TYPE milestone_type IS
  'Celebration buckets. Personal firsts (first_rfq, first_proposal_received, first_chat_opened, first_agreement_signed, first_escrow_funded, first_project_completed) + GMV tiers (100k_gmv, 500k_gmv, 1m_gmv) + yearly_anniversary. Legacy first_deal retained for back-compat with Phase U seeded rows; new code emits first_agreement_signed.';
