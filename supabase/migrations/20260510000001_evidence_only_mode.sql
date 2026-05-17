-- ======================================
-- MVP evidence-only mode
-- ======================================
-- The escrow money-holding flow is paused pending regulatory approval.
-- Agreements now transition directly: awarded → in_progress (skipping in_escrow).
-- The escrow_transactions row is still useful as a payment-evidence container,
-- so we widen the auto-create trigger to fire on the in_progress transition too.
-- The original in_escrow path stays in place — flipping back is a single-line revert.

CREATE OR REPLACE FUNCTION create_escrow_on_in_escrow() RETURNS TRIGGER AS $$
DECLARE
  v_agreement_id UUID;
  v_proposal_id UUID;
  v_total NUMERIC(12,2);
  v_client_fee NUMERIC(12,2);
  v_supplier_fee NUMERIC(12,2);
  v_client_fee_vat NUMERIC(12,2);
  v_supplier_fee_vat NUMERIC(12,2);
  v_total_amount NUMERIC(12,2);
BEGIN
  IF (NEW.status = 'in_escrow' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'in_escrow'))
     OR (NEW.status = 'in_progress' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'in_progress')) THEN

    -- Idempotent: row already created (e.g. on a prior transition or via the dormant in_escrow path)
    IF EXISTS(SELECT 1 FROM escrow_transactions WHERE rfq_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    SELECT a.id, a.proposal_id, p.total_price
      INTO v_agreement_id, v_proposal_id, v_total
    FROM agreements a
    JOIN proposals p ON p.id = a.proposal_id
    WHERE a.rfq_id = NEW.id
    LIMIT 1;

    IF v_agreement_id IS NULL OR v_total IS NULL THEN
      RETURN NEW;
    END IF;

    v_client_fee     := ROUND(v_total * 0.02, 2);
    v_supplier_fee   := ROUND(v_total * 0.03, 2);
    v_client_fee_vat := ROUND(v_client_fee * 0.15, 2);
    v_supplier_fee_vat := ROUND(v_supplier_fee * 0.15, 2);
    v_total_amount   := ROUND(v_total + v_client_fee + v_client_fee_vat, 2);

    INSERT INTO escrow_transactions (
      agreement_id, rfq_id,
      total_amount, initial_deposit, final_payment,
      client_fee, supplier_fee, platform_revenue, supplier_net,
      vat_rate_applied, client_fee_vat, supplier_fee_vat, total_vat,
      status
    ) VALUES (
      v_agreement_id, NEW.id,
      v_total_amount,
      ROUND(v_total_amount * 0.5, 2),
      ROUND(v_total_amount - ROUND(v_total_amount * 0.5, 2), 2),
      v_client_fee, v_supplier_fee, v_client_fee + v_supplier_fee, v_total - v_supplier_fee,
      0.15, v_client_fee_vat, v_supplier_fee_vat, v_client_fee_vat + v_supplier_fee_vat,
      'awaiting_deposit'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
