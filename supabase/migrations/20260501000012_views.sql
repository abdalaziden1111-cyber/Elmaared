-- ======================================
-- 12. Convenience views
-- ======================================

CREATE VIEW active_rfqs AS
  SELECT * FROM rfqs WHERE deleted_at IS NULL;

CREATE VIEW active_suppliers AS
  SELECT * FROM suppliers WHERE deleted_at IS NULL AND status = 'approved';
