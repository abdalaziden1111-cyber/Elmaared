-- ======================================
-- 5. Agreements + Revisions
-- ======================================

CREATE TABLE agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  proposal_id UUID NOT NULL REFERENCES proposals(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  client_understanding TEXT NOT NULL DEFAULT '',
  supplier_understanding TEXT NOT NULL DEFAULT '',
  client_submitted_at TIMESTAMPTZ,
  supplier_submitted_at TIMESTAMPTZ,
  ai_agreed_points JSONB,
  ai_disputed_points JSONB,
  ai_missing_points JSONB,
  ai_recommendation TEXT,
  final_text TEXT,
  final_terms JSONB,
  client_approved_at TIMESTAMPTZ,
  supplier_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES profiles(id),
  admin_approved_at TIMESTAMPTZ,
  client_signature_hash TEXT,
  supplier_signature_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agreements_rfq ON agreements(rfq_id);
CREATE INDEX idx_agreements_status ON agreements(status);

-- Immutable revision history
CREATE TABLE agreement_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  revision_number INT NOT NULL,
  source TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  authored_by UUID REFERENCES profiles(id),
  authored_role user_role,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agreement_id, revision_number)
);

CREATE INDEX idx_agreement_revisions_agreement ON agreement_revisions(agreement_id, revision_number);
