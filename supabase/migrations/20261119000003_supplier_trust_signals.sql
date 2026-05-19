-- UX Plan v2 Decision #07 (Sprint 3 S3.0) — Identity Trust Layer.
--
-- 1-to-1 sidecar to the `suppliers` table holding the five badge signals the
-- comparison + supplier-profile UI surfaces:
--    identity_verified  — CR + ID confirmed by ops
--    zatca_verified     — VAT number validated against ZATCA
--    references_count   — count of third-party references on file
--    photo_id_uploaded  — supplier has uploaded a govt ID image
--    gov_id_verified    — that govt ID has been verified (Nafath or manual)
--
-- Why a sidecar instead of columns on `suppliers`:
-- - `suppliers` is hot (every supplier query reads it); trust signals change
--   rarely — keeping them in a separate row reduces dirty-page churn.
-- - Adds a clean RLS scope: signals are PUBLIC (anyone can read the proof),
--   while supplier rows still respect their own per-role policies.
-- - The committee (Plan v2 §4, Identity Trust Layer) wants room to add new
--   signals (financial-health, insurance-on-file, etc.) without thrashing
--   the suppliers schema.

CREATE TABLE supplier_trust_signals (
  supplier_id        UUID PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
  identity_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  zatca_verified     BOOLEAN NOT NULL DEFAULT FALSE,
  references_count   INT NOT NULL DEFAULT 0 CHECK (references_count >= 0),
  photo_id_uploaded  BOOLEAN NOT NULL DEFAULT FALSE,
  gov_id_verified    BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE supplier_trust_signals IS
  'Five identity-trust badge signals per supplier. Public read; admin write.';

-- Keep updated_at in sync via the existing trigger.
CREATE TRIGGER supplier_trust_signals_touch_updated_at
  BEFORE UPDATE ON supplier_trust_signals
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- RLS — public read because the badges ARE the proof; admin-only write.
ALTER TABLE supplier_trust_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_trust_signals"
  ON supplier_trust_signals FOR SELECT
  USING (true);

CREATE POLICY "admin_write_trust_signals"
  ON supplier_trust_signals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
