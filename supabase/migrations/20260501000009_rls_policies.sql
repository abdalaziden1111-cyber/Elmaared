-- ======================================
-- 9. RLS Policies + Helper Functions
-- ======================================

-- Helper functions
CREATE OR REPLACE FUNCTION auth.user_role() RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ========== profiles ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles FOR SELECT
  USING (id = auth.uid() OR auth.is_admin());

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_insert_own_profile" ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ========== companies ==========
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_company" ON companies FOR ALL
  USING (owner_id = auth.uid() OR auth.is_admin());

-- ========== suppliers ==========
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supplier_read_own" ON suppliers FOR SELECT
  USING (owner_id = auth.uid() OR auth.is_admin());

CREATE POLICY "approved_suppliers_public_read" ON suppliers FOR SELECT
  USING (status = 'approved' AND deleted_at IS NULL);

CREATE POLICY "supplier_update_own" ON suppliers FOR UPDATE
  USING (owner_id = auth.uid() OR auth.is_admin());

CREATE POLICY "supplier_insert_own" ON suppliers FOR INSERT
  WITH CHECK (owner_id = auth.uid());

-- ========== supplier_portfolio ==========
ALTER TABLE supplier_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_public_read" ON supplier_portfolio FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.status = 'approved')
    OR auth.is_admin()
  );

CREATE POLICY "portfolio_owner_manage" ON supplier_portfolio FOR ALL
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== rfqs ==========
ALTER TABLE rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_view_own_rfqs" ON rfqs FOR SELECT
  USING (client_id = auth.uid() OR auth.is_admin());

CREATE POLICY "supplier_view_open_matching_rfqs" ON rfqs FOR SELECT
  USING (
    status = 'open'
    AND deleted_at IS NULL
    AND service_type = ANY(
      SELECT unnest(specializations) FROM suppliers WHERE owner_id = auth.uid() AND status = 'approved'
    )
  );

CREATE POLICY "selected_supplier_view_rfq" ON rfqs FOR SELECT
  USING (
    EXISTS(
      SELECT 1 FROM proposals p
      JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.rfq_id = rfqs.id
        AND s.owner_id = auth.uid()
        AND p.status IN ('shortlisted', 'accepted')
    )
  );

CREATE POLICY "client_create_rfq" ON rfqs FOR INSERT
  WITH CHECK (client_id = auth.uid() AND auth.user_role() = 'client');

CREATE POLICY "client_update_own_rfq" ON rfqs FOR UPDATE
  USING (client_id = auth.uid() OR auth.is_admin());

-- ========== proposals ==========
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_view_proposals_for_own_rfq" ON proposals FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
    OR auth.is_admin()
  );

CREATE POLICY "supplier_view_own_proposals" ON proposals FOR SELECT
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "supplier_create_proposal" ON proposals FOR INSERT
  WITH CHECK (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid() AND s.status = 'approved')
  );

CREATE POLICY "supplier_update_own_proposal" ON proposals FOR UPDATE
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== chats ==========
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_participants_read" ON chats FOR SELECT
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== messages ==========
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_participants_read_messages" ON messages FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.client_id = auth.uid()
          OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = c.supplier_id AND s.owner_id = auth.uid())
        )
    )
  );

CREATE POLICY "chat_participants_send_messages" ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      auth.is_admin()
      OR EXISTS(
        SELECT 1 FROM chats c
        WHERE c.id = messages.chat_id
          AND (
            c.client_id = auth.uid()
            OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = c.supplier_id AND s.owner_id = auth.uid())
          )
      )
    )
  );

-- ========== agreements ==========
ALTER TABLE agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agreement_parties_read" ON agreements FOR SELECT
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "agreement_parties_update" ON agreements FOR UPDATE
  USING (
    auth.is_admin()
    OR client_id = auth.uid()
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== agreement_revisions ==========
ALTER TABLE agreement_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "revision_parties_read" ON agreement_revisions FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(
      SELECT 1 FROM agreements a
      WHERE a.id = agreement_id
        AND (
          a.client_id = auth.uid()
          OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = a.supplier_id AND s.owner_id = auth.uid())
        )
    )
  );

-- ========== escrow_transactions ==========
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_parties_read" ON escrow_transactions FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid()) OR
    EXISTS(
      SELECT 1 FROM agreements a
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE a.id = agreement_id AND s.owner_id = auth.uid()
    )
  );

-- ========== escrow_events ==========
ALTER TABLE escrow_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "escrow_events_read" ON escrow_events FOR SELECT
  USING (
    auth.is_admin() OR
    EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN rfqs r ON r.id = et.rfq_id
      WHERE et.id = escrow_id AND r.client_id = auth.uid()
    ) OR
    EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN agreements a ON a.id = et.agreement_id
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE et.id = escrow_id AND s.owner_id = auth.uid()
    )
  );

-- ========== deliveries ==========
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_parties_read" ON deliveries FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
    OR EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
  );

-- ========== disputes ==========
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dispute_parties_read" ON disputes FOR SELECT
  USING (
    auth.is_admin()
    OR raised_by = auth.uid()
    OR EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid())
  );

-- ========== reviews ==========
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_reviews_read" ON reviews FOR SELECT
  USING (is_public = TRUE OR auth.is_admin());

CREATE POLICY "client_writes_review" ON reviews FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "supplier_responds_to_review" ON reviews FOR UPDATE
  USING (
    EXISTS(SELECT 1 FROM suppliers s WHERE s.id = supplier_id AND s.owner_id = auth.uid())
    OR auth.is_admin()
  );

-- ========== notifications ==========
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_reads_own_notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid() OR auth.is_admin());

CREATE POLICY "user_updates_own_notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- ========== audit_logs ==========
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_reads_audit" ON audit_logs FOR SELECT
  USING (auth.is_admin());

-- ========== invoices ==========
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_parties_read" ON invoices FOR SELECT
  USING (
    auth.is_admin()
    OR EXISTS(SELECT 1 FROM companies c WHERE c.id = company_id AND c.owner_id = auth.uid())
    OR EXISTS(
      SELECT 1 FROM escrow_transactions et
      JOIN agreements a ON a.id = et.agreement_id
      JOIN suppliers s ON s.id = a.supplier_id
      WHERE et.id = escrow_id AND s.owner_id = auth.uid()
    )
  );
