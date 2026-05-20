-- Phase V6.1 — Supplier KPI dashboard indexes.
--
-- The /supplier/dashboard page fires ~8 parallel SELECTs (totals,
-- acceptance rate, monthly revenue, category breakdown, reviews trend).
-- These indexes ensure each remains under 50ms even at 10k+ proposals
-- and 1k+ reviews per supplier.

CREATE INDEX IF NOT EXISTS idx_proposals_supplier_status_created
  ON proposals (supplier_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_supplier_created
  ON reviews (supplier_id, created_at DESC)
  WHERE is_public = TRUE;

-- escrow_transactions joins to suppliers via agreements.supplier_id, so
-- the existing idx_escrow_rfq + idx_escrow_status indexes already cover
-- the supplier-side revenue query. No new index needed there.

COMMENT ON INDEX idx_proposals_supplier_status_created IS
  'V6.1 — supports KPI tile + monthly revenue + win-rate-by-category queries.';
COMMENT ON INDEX idx_reviews_supplier_created IS
  'V6.1 — supports rating trend + avg-rating tiles. Partial WHERE is_public matches the public read filter.';
