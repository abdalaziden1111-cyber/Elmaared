-- Phase V5.1 — Blog CMS DB schema.
--
-- One table covers list + detail + scheduling + SEO. Bilingual fields (ar/en)
-- live side-by-side so the editor can write both languages in one form
-- without joining tables. Tags are a TEXT[] indexed with GIN so "related
-- posts" can use array overlap.

CREATE TYPE blog_status AS ENUM ('draft', 'scheduled', 'published');

CREATE TABLE blog_posts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  title_ar              TEXT NOT NULL,
  title_en              TEXT,
  excerpt_ar            TEXT,
  excerpt_en            TEXT,
  content_ar            TEXT NOT NULL,         -- HTML produced by Tiptap
  content_en            TEXT,
  cover_image           TEXT,                  -- storage path in `blog-images` bucket
  author_id             UUID REFERENCES profiles(id),
  published_at          TIMESTAMPTZ,
  status                blog_status NOT NULL DEFAULT 'draft',
  tags                  TEXT[] NOT NULL DEFAULT '{}',
  seo_title_ar          TEXT,
  seo_title_en          TEXT,
  seo_description_ar    TEXT,
  seo_description_en    TEXT,
  reading_time_minutes  INT,                   -- ceil(wordCount/200)
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_status_published_at
  ON blog_posts (status, published_at DESC NULLS LAST);

CREATE INDEX idx_blog_posts_tags ON blog_posts USING GIN (tags);

COMMENT ON TABLE blog_posts IS
  'Bilingual blog posts authored via /admin/blog. Public read = status=published AND published_at <= now(). Admin write only.';

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authed) can read published posts whose publish date has
-- already passed. Scheduled posts stay hidden until their time comes.
CREATE POLICY "anon_read_published_blog_posts"
  ON blog_posts FOR SELECT
  USING (status = 'published' AND published_at IS NOT NULL AND published_at <= NOW());

CREATE POLICY "admin_read_all_blog_posts"
  ON blog_posts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_write_blog_posts"
  ON blog_posts FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Bump updated_at on any write.
CREATE OR REPLACE FUNCTION set_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION set_blog_posts_updated_at();
