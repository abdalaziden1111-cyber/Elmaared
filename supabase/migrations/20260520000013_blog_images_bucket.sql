-- Phase V5.1 — Storage bucket for blog cover images.
--
-- Public read so the <img> on the marketing site can render without a
-- signed URL. Admin-only write through RLS on storage.objects.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5 * 1024 * 1024, -- 5 MB cap
  ARRAY['image/png','image/jpeg','image/webp','image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Anon read is granted by the public flag; we only need a policy for
-- admin uploads.
CREATE POLICY "admin_write_blog_images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_update_blog_images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_delete_blog_images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images'
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
