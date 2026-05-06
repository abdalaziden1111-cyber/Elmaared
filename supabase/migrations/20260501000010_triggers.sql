-- ======================================
-- 10. Triggers and Functions
-- ======================================

-- 10.1 Auto-update updated_at on any UPDATE
CREATE OR REPLACE FUNCTION update_timestamp() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that have updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
      AND table_name NOT IN ('escrow_events', 'agreement_revisions', 'messages', 'audit_logs', 'notifications')
  LOOP
    EXECUTE format('
      CREATE TRIGGER trg_updated_at_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_timestamp();
    ', t, t);
  END LOOP;
END;
$$;

-- 10.2 Auto-generate RFQ number
CREATE OR REPLACE FUNCTION generate_rfq_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.rfq_number := 'RFQ-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                    LPAD(nextval('rfq_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rfq_number BEFORE INSERT ON rfqs
  FOR EACH ROW WHEN (NEW.rfq_number = '' OR NEW.rfq_number IS NULL)
  EXECUTE FUNCTION generate_rfq_number();

-- 10.3 Auto-generate Invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS TRIGGER AS $$
BEGIN
  NEW.invoice_number := 'INV-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                        LPAD(nextval('invoice_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number BEFORE INSERT ON invoices
  FOR EACH ROW WHEN (NEW.invoice_number = '' OR NEW.invoice_number IS NULL)
  EXECUTE FUNCTION generate_invoice_number();

-- 10.4 Prevent UPDATE/DELETE on escrow_events (append-only)
CREATE OR REPLACE FUNCTION prevent_escrow_event_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'escrow_events is append-only: no UPDATE or DELETE allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_escrow_events
  BEFORE UPDATE OR DELETE ON escrow_events
  FOR EACH ROW EXECUTE FUNCTION prevent_escrow_event_mutation();

-- 10.5 Prevent UPDATE/DELETE on agreement_revisions (immutable)
CREATE OR REPLACE FUNCTION prevent_revision_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'agreement_revisions is immutable: no UPDATE or DELETE allowed';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_no_update_agreement_revisions
  BEFORE UPDATE OR DELETE ON agreement_revisions
  FOR EACH ROW EXECUTE FUNCTION prevent_revision_mutation();

-- 10.6 Update supplier stats after review
CREATE OR REPLACE FUNCTION update_supplier_stats() RETURNS TRIGGER AS $$
BEGIN
  UPDATE suppliers
  SET
    average_rating = (
      SELECT ROUND(AVG(rating_overall)::NUMERIC, 2) FROM reviews WHERE supplier_id = NEW.supplier_id
    ),
    total_completed_orders = (
      SELECT COUNT(*) FROM rfqs r
      JOIN agreements a ON a.rfq_id = r.id
      WHERE a.supplier_id = NEW.supplier_id AND r.status = 'completed'
    )
  WHERE id = NEW.supplier_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_supplier_stats AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_supplier_stats();

-- 10.7 Notify matching suppliers when RFQ goes open
CREATE OR REPLACE FUNCTION notify_matching_suppliers() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'open') THEN
    INSERT INTO notifications (user_id, type, title, body, rfq_id, link)
    SELECT
      s.owner_id,
      'rfq_match',
      'طلب عرض جديد يطابق تخصصك',
      NEW.title,
      NEW.id,
      '/dashboard/rfq/' || NEW.id::TEXT
    FROM suppliers s
    WHERE NEW.service_type = ANY(s.specializations)
      AND s.status = 'approved'
      AND s.deleted_at IS NULL
      AND (NEW.exhibition_city IS NULL OR NEW.exhibition_city = ANY(s.cities));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_matching_suppliers
  AFTER INSERT OR UPDATE ON rfqs
  FOR EACH ROW EXECUTE FUNCTION notify_matching_suppliers();
