-- ======================================
-- 3. RFQ + Proposals
-- ======================================

CREATE SEQUENCE IF NOT EXISTS rfq_number_seq START 1;

CREATE TABLE rfqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_number TEXT UNIQUE NOT NULL DEFAULT '',
  client_id UUID NOT NULL REFERENCES profiles(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  service_type service_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  details JSONB NOT NULL DEFAULT '{}',
  CONSTRAINT details_is_object CHECK (jsonb_typeof(details) = 'object'),
  attachments TEXT[] DEFAULT '{}',
  logo_url TEXT,
  exhibition_name TEXT,
  exhibition_city TEXT,
  exhibition_date DATE,
  delivery_location TEXT,
  budget_min NUMERIC(12,2),
  budget_max NUMERIC(12,2),
  proposals_deadline TIMESTAMPTZ,
  status rfq_status NOT NULL DEFAULT 'draft',
  winning_proposal_id UUID,
  awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_rfqs_client ON rfqs(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_rfqs_company ON rfqs(company_id);
CREATE INDEX idx_rfqs_service ON rfqs(service_type) WHERE status = 'open';
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_deadline ON rfqs(proposals_deadline) WHERE status = 'open';
CREATE INDEX idx_rfqs_open_search ON rfqs(service_type, status, created_at DESC)
  WHERE status = 'open';

CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  total_price NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  delivery_days INT NOT NULL,
  delivery_date DATE,
  description TEXT,
  scope_of_work TEXT,
  excluded_items TEXT,
  payment_terms TEXT,
  validity_days INT DEFAULT 14,
  proposal_pdf_url TEXT,
  attachments TEXT[] DEFAULT '{}',
  ai_score NUMERIC(5,2),
  ai_summary TEXT,
  ai_strengths TEXT[],
  ai_concerns TEXT[],
  status proposal_status NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rfq_id, supplier_id)
);

CREATE INDEX idx_proposals_rfq ON proposals(rfq_id);
CREATE INDEX idx_proposals_supplier ON proposals(supplier_id);
CREATE INDEX idx_proposals_status ON proposals(status);
