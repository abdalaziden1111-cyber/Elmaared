-- Private storage bucket for supplier verification documents (CR, VAT,
-- portfolio PDFs). Files are not directly accessible — all reads must go
-- through signed URLs generated server-side. The folder convention is
-- `${auth.uid()}/<field>-<timestamp>.<ext>` so RLS can match by owner.

INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-docs', 'supplier-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Suppliers may write/replace only files inside their own folder.
DROP POLICY IF EXISTS "supplier_docs_owner_insert" ON storage.objects;
CREATE POLICY "supplier_docs_owner_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'supplier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "supplier_docs_owner_update" ON storage.objects;
CREATE POLICY "supplier_docs_owner_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'supplier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "supplier_docs_owner_select" ON storage.objects;
CREATE POLICY "supplier_docs_owner_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'supplier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Admins can read any supplier doc to review/approve.
DROP POLICY IF EXISTS "supplier_docs_admin_select" ON storage.objects;
CREATE POLICY "supplier_docs_admin_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'supplier-docs'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "supplier_docs_owner_delete" ON storage.objects;
CREATE POLICY "supplier_docs_owner_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'supplier-docs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
