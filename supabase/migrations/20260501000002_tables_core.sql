-- ======================================
-- 2. Core tables: profiles, companies, suppliers, portfolio
-- ======================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'ar',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  legal_name TEXT,
  cr_number TEXT UNIQUE,
  vat_number TEXT,
  size TEXT,
  industry TEXT,
  city TEXT,
  address TEXT,
  logo_url TEXT,
  ceo_email TEXT,
  ceo_email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_companies_owner ON companies(owner_id);
CREATE INDEX idx_companies_cr ON companies(cr_number);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) UNIQUE,
  company_name TEXT NOT NULL,
  legal_name TEXT,
  cr_number TEXT UNIQUE NOT NULL,
  vat_number TEXT,
  status supplier_status NOT NULL DEFAULT 'pending_review',
  specializations service_type[] NOT NULL DEFAULT '{}',
  cities TEXT[] NOT NULL DEFAULT '{}',
  bio TEXT,
  website TEXT,
  team_size INT,
  years_of_experience INT,
  min_order_value NUMERIC(12,2),
  cr_document_url TEXT,
  vat_document_url TEXT,
  portfolio_pdf_url TEXT,
  total_completed_orders INT DEFAULT 0,
  average_rating NUMERIC(3,2),
  on_time_delivery_rate NUMERIC(5,2),
  bank_name TEXT,
  iban TEXT,
  account_holder_name TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_suppliers_status ON suppliers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_suppliers_specializations ON suppliers USING GIN(specializations);
CREATE INDEX idx_suppliers_cities ON suppliers USING GIN(cities);

CREATE TABLE supplier_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  service_type service_type,
  client_name TEXT,
  exhibition_name TEXT,
  year INT,
  cover_image_url TEXT,
  images TEXT[] DEFAULT '{}',
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_portfolio_supplier ON supplier_portfolio(supplier_id);
