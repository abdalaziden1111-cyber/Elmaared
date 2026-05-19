-- UX Plan v2 Decision #08 (Sprint 5 S5.0) — Concierge MVP marker.
--
-- During the Year-1 Concierge phase (Plan v2 §11), internal ops staff
-- onboard suppliers manually and operate the supplier-side actions on
-- their behalf — submitting offers, responding to RFQs, etc. The
-- `is_concierge_managed` flag lets the supplier-profile UI render a small
-- "مُدار بواسطة Elmaared" badge so buyers know who's actually on the
-- other end. Default FALSE — only ops flips it for managed accounts.
--
-- Why a column on `suppliers` (not a separate table): every supplier row
-- needs this single boolean, and the buyer-side queries already pull
-- `suppliers` for company_name + ratings. Sidecar would add a join for
-- one bool — not worth it.

ALTER TABLE suppliers
  ADD COLUMN is_concierge_managed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN suppliers.is_concierge_managed IS
  'TRUE when Elmaared ops is operating this supplier account during the Concierge MVP phase. Surfaced as a "مُدار بواسطة Elmaared" badge.';

-- Partial index — only the managed rows need to be findable by ops dashboards.
CREATE INDEX idx_suppliers_concierge ON suppliers(is_concierge_managed)
  WHERE is_concierge_managed = TRUE;
