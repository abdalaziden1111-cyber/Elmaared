-- ======================================
-- 7. Deliveries, Disputes, Reviews
-- ======================================

CREATE TABLE deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  agreement_id UUID NOT NULL REFERENCES agreements(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  delivery_notes TEXT,
  delivery_photos TEXT[] DEFAULT '{}',
  delivery_video_url TEXT,
  delivered_at TIMESTAMPTZ,
  client_approved BOOLEAN,
  client_approved_at TIMESTAMPTZ,
  client_approval_notes TEXT,
  client_rejected_at TIMESTAMPTZ,
  client_rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deliveries_rfq ON deliveries(rfq_id);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id),
  raised_by UUID NOT NULL REFERENCES profiles(id),
  raised_by_role user_role NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT '{}',
  assigned_admin_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'open',
  resolution TEXT,
  resolution_in_favor_of TEXT,
  refund_decision NUMERIC(12,2),
  field_visit_required BOOLEAN DEFAULT FALSE,
  field_visit_at TIMESTAMPTZ,
  field_visit_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_rfq ON disputes(rfq_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES rfqs(id) UNIQUE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  rating_overall INT NOT NULL CHECK (rating_overall BETWEEN 1 AND 5),
  rating_quality INT CHECK (rating_quality BETWEEN 1 AND 5),
  rating_timeliness INT CHECK (rating_timeliness BETWEEN 1 AND 5),
  rating_communication INT CHECK (rating_communication BETWEEN 1 AND 5),
  rating_flexibility INT CHECK (rating_flexibility BETWEEN 1 AND 5),
  rating_price_value INT CHECK (rating_price_value BETWEEN 1 AND 5),
  comment TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  supplier_response TEXT,
  supplier_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_supplier ON reviews(supplier_id) WHERE is_public = TRUE;
