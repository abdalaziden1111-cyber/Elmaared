-- ======================================
-- 6. Escrow + Events + Invoices
-- ======================================

CREATE TABLE escrow_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) UNIQUE,
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  total_amount NUMERIC(12,2) NOT NULL,
  initial_deposit NUMERIC(12,2) NOT NULL,
  final_payment NUMERIC(12,2) NOT NULL,
  client_fee NUMERIC(12,2) NOT NULL,
  supplier_fee NUMERIC(12,2) NOT NULL,
  platform_revenue NUMERIC(12,2) NOT NULL,
  supplier_net NUMERIC(12,2) NOT NULL,
  vat_rate_applied NUMERIC(5,4) NOT NULL DEFAULT 0.15,
  client_fee_vat NUMERIC(12,2) NOT NULL,
  supplier_fee_vat NUMERIC(12,2) NOT NULL,
  total_vat NUMERIC(12,2) NOT NULL,
  status escrow_status NOT NULL DEFAULT 'awaiting_deposit',
  initial_deposit_receipt_url TEXT,
  initial_deposit_received_at TIMESTAMPTZ,
  initial_deposit_confirmed_by UUID REFERENCES profiles(id),
  final_payment_receipt_url TEXT,
  final_payment_received_at TIMESTAMPTZ,
  final_payment_confirmed_by UUID REFERENCES profiles(id),
  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES profiles(id),
  release_transaction_ref TEXT,
  refund_amount NUMERIC(12,2),
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escrow_status ON escrow_transactions(status);
CREATE INDEX idx_escrow_rfq ON escrow_transactions(rfq_id);

-- Append-only ledger — NO UPDATE, NO DELETE
CREATE TABLE escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  event_type escrow_event_type NOT NULL,
  amount NUMERIC(12,2),
  balance_after NUMERIC(12,2),
  bank_reference TEXT,
  receipt_url TEXT,
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_escrow_events_escrow ON escrow_events(escrow_id, created_at);
CREATE INDEX idx_escrow_events_type ON escrow_events(event_type);

-- Invoices (ZATCA-friendly, PDF only for MVP)
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL DEFAULT '',
  escrow_id UUID NOT NULL REFERENCES escrow_transactions(id),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_amount NUMERIC(12,2) NOT NULL,
  platform_commission NUMERIC(12,2) NOT NULL,
  vat_amount NUMERIC(12,2) NOT NULL,
  total_invoiced NUMERIC(12,2) NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_vat_number TEXT,
  buyer_cr_number TEXT,
  buyer_address TEXT,
  zatca_uuid TEXT,
  zatca_invoice_hash TEXT,
  zatca_qr_code TEXT,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_company ON invoices(company_id);
CREATE INDEX idx_invoices_rfq ON invoices(rfq_id);
