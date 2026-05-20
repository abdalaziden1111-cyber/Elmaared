import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { createAdminClient } from '@/lib/supabase/admin';
import { BlogEditor } from '../../blog-editor';

interface PostRow {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  content_ar: string;
  content_en: string | null;
  cover_image: string | null;
  status: 'draft' | 'scheduled' | 'published';
  published_at: string | null;
  tags: string[];
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
}

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireRole(['admin']);
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select(
      'id, slug, title_ar, title_en, excerpt_ar, excerpt_en, content_ar, content_en, cover_image, status, published_at, tags, seo_title_ar, seo_title_en, seo_description_ar, seo_description_en'
    )
    .eq('id', id)
    .maybeSingle();
  const post = data as PostRow | null;
  if (!post) notFound();

  return (
    <div>
      <Breadcrumbs
        items={[
          { href: '/admin', label: 'نظرة عامة' },
          { href: '/admin/blog', label: 'المدوّنة' },
          { label: post.title_ar },
        ]}
      />
      <h1 className="mt-2 text-2xl font-semibold text-[var(--color-midnight-green)]">
        تحرير المقال
      </h1>
      <div className="mt-6">
        <BlogEditor initial={post} />
      </div>
    </div>
  );
}
