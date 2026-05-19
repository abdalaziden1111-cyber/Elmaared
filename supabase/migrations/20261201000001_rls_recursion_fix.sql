-- Phase Z2 — Item 1: break the recursive RLS pair on rfqs ↔ proposals.
--
-- The original 20260501000009 policies inline EXISTS-subqueries that cross
-- the two tables, so a SELECT on rfqs triggers proposals RLS which triggers
-- rfqs RLS → Postgres raises 42P17 (infinite recursion). Three audits
-- (MVP-VERIFICATION-REPORT, DEEP-AUDIT-REPORT, FINAL-POLISH-REPORT) filed
-- this as P1-1 and the 21 affected pages have a temporary admin-client
-- workaround.
--
-- Fix: wrap the two cross-table EXISTS checks in SECURITY DEFINER helpers.
-- Each helper runs as its owner (postgres) with caller RLS disabled inside
-- the body, so the inner SELECT does not re-enter the other table's
-- policies. This is the same pattern the existing public.is_admin() and
-- public.user_role() helpers already use in 20260501000009.

-- =========================================================
-- Helpers
-- =========================================================

CREATE OR REPLACE FUNCTION public.user_owns_rfq(p_rfq_id uuid)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfqs r
    WHERE r.id = p_rfq_id AND r.client_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_selected_supplier_for_rfq(p_rfq_id uuid)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.proposals p
    JOIN public.suppliers s ON s.id = p.supplier_id
    WHERE p.rfq_id = p_rfq_id
      AND s.owner_id = auth.uid()
      AND p.status IN ('shortlisted', 'accepted')
  );
$$;

REVOKE EXECUTE ON FUNCTION public.user_owns_rfq(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_owns_rfq(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.user_is_selected_supplier_for_rfq(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_is_selected_supplier_for_rfq(uuid) TO authenticated;

-- =========================================================
-- Policy rewrites
-- =========================================================

-- rfqs.selected_supplier_view_rfq used to do
--   USING (EXISTS(SELECT 1 FROM proposals p JOIN suppliers s ON ... ))
-- which re-entered proposals RLS. Swap for the helper.
DROP POLICY IF EXISTS "selected_supplier_view_rfq" ON public.rfqs;
CREATE POLICY "selected_supplier_view_rfq" ON public.rfqs FOR SELECT
  USING (public.user_is_selected_supplier_for_rfq(id));

-- proposals.client_view_proposals_for_own_rfq used to do
--   USING (EXISTS(SELECT 1 FROM rfqs r WHERE r.id = rfq_id AND r.client_id = auth.uid()) OR is_admin())
-- which re-entered rfqs RLS. Swap for the helper.
DROP POLICY IF EXISTS "client_view_proposals_for_own_rfq" ON public.proposals;
CREATE POLICY "client_view_proposals_for_own_rfq" ON public.proposals FOR SELECT
  USING (public.user_owns_rfq(rfq_id) OR public.is_admin());
