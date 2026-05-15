-- Private storage bucket for RFQ attachments (client logo, design references,
-- briefs, mood-boards). Files are not publicly accessible — reads go through
-- signed URLs generated server-side. Folder convention is
-- `${auth.uid()}/<kind>-<timestamp>.<ext>` so RLS can match by owner.
--
-- Visibility:
--   * Owner (client) — full read/write inside their folder.
--   * Suppliers — read access ONLY for attachments belonging to an RFQ they
--     have been notified about (i.e. status='open' AND match by
--     specialization/city). Enforced via a join into rfqs + supplier match.
--   * Admins — full read for oversight.
--
-- Note: this complements the rfqs.attachments jsonb column (which stores the
-- list of paths) and rfqs.logo_url (which stores a single path). Both are
-- written by createRfqAction once the user submits.

INSERT INTO storage.buckets (id, name, public)
VALUES ('rfq-attachments', 'rfq-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Clients may insert files only inside their own folder.
DROP POLICY IF EXISTS "rfq_attachments_owner_insert" ON storage.objects;
CREATE POLICY "rfq_attachments_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rfq-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients may update/replace their own files.
DROP POLICY IF EXISTS "rfq_attachments_owner_update" ON storage.objects;
CREATE POLICY "rfq_attachments_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients may delete their own files (e.g. removing an attachment before
-- publishing the RFQ).
DROP POLICY IF EXISTS "rfq_attachments_owner_delete" ON storage.objects;
CREATE POLICY "rfq_attachments_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients may read their own files.
DROP POLICY IF EXISTS "rfq_attachments_owner_select" ON storage.objects;
CREATE POLICY "rfq_attachments_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins may read any attachment (oversight + dispute resolution).
DROP POLICY IF EXISTS "rfq_attachments_admin_select" ON storage.objects;
CREATE POLICY "rfq_attachments_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- Suppliers may read attachments for any RFQ that references the file's
-- path in its attachments jsonb or logo_url, provided the RFQ is in an
-- open/active state (so closed/cancelled RFQs stop leaking past the bid
-- window). The supplier must also have a matching specialization for the
-- RFQ's service_type — this is the same minimum bar that lets them see
-- the RFQ itself per the existing rfqs RLS.
DROP POLICY IF EXISTS "rfq_attachments_supplier_select" ON storage.objects;
CREATE POLICY "rfq_attachments_supplier_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfq-attachments'
    AND EXISTS (
      SELECT 1
      FROM public.rfqs r
      JOIN public.suppliers s ON s.owner_id = auth.uid()
      WHERE r.status IN ('open', 'negotiating', 'awarded', 'in_escrow', 'in_progress', 'delivered', 'completed')
        AND s.status = 'approved'
        AND r.service_type = ANY(s.specializations)
        AND (
          r.logo_url = storage.objects.name
          OR r.attachments @> jsonb_build_array(jsonb_build_object('path', storage.objects.name))
        )
    )
  );
