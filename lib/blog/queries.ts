// Phase V5.3 — Public blog queries.
//
// Reads from blog_posts using the admin client (server-only) because the
// marketing pages aren't authed. RLS still gates write surfaces; reads
// remain open via the published-only policy when using anon-key, but
// going through admin here keeps the data path uniform with the rest of
// the marketing site.
//
// Phase V2.2 — public list + slug queries are wrapped in unstable_cache
// with the 'blog-list' tag so revalidateTag('blog-list') in
// app/actions/blog.ts actually invalidates them. 1-hour fallback TTL
// covers the (unlikely) case of an admin editing the DB directly.

import { unstable_cache } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';

export interface BlogPostListItem {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string | null;
  excerpt_ar: string | null;
  excerpt_en: string | null;
  cover_image: string | null;
  published_at: string | null;
  tags: string[];
  reading_time_minutes: number | null;
}

export interface BlogPostFull extends BlogPostListItem {
  content_ar: string;
  content_en: string | null;
  seo_title_ar: string | null;
  seo_title_en: string | null;
  seo_description_ar: string | null;
  seo_description_en: string | null;
}

const LIST_COLUMNS =
  'id, slug, title_ar, title_en, excerpt_ar, excerpt_en, cover_image, published_at, tags, reading_time_minutes';

const FULL_COLUMNS = `${LIST_COLUMNS}, content_ar, content_en, seo_title_ar, seo_title_en, seo_description_ar, seo_description_en`;

/**
 * Returns { posts, hasMore }. The page slice is computed in-memory after
 * the limit-N+1 query so we know whether to show "next page".
 *
 * V2.2 — wrapped in unstable_cache below; this is the raw query.
 */
async function listPublishedPostsUncached(args: {
  page?: number;
  pageSize?: number;
  tag?: string | null;
} = {}): Promise<{ posts: BlogPostListItem[]; hasMore: boolean; page: number }> {
  const admin = createAdminClient();
  const pageSize = Math.min(Math.max(args.pageSize ?? 12, 1), 50);
  const page = Math.max(1, args.page ?? 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize; // limit + 1

  let q = admin
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .range(from, to);

  if (args.tag) q = q.contains('tags', [args.tag]);

  const { data } = await q;
  const rows = (data ?? []) as BlogPostListItem[];
  const hasMore = rows.length > pageSize;
  const posts = hasMore ? rows.slice(0, pageSize) : rows;
  return { posts, hasMore, page };
}

async function getPostBySlugUncached(slug: string): Promise<BlogPostFull | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select(FULL_COLUMNS)
    .eq('slug', slug)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .maybeSingle();
  return (data as BlogPostFull | null) ?? null;
}

/**
 * Related posts by tag-overlap. The DB doesn't have a built-in scoring
 * function for array intersection size, so we pull a small candidate pool
 * (any post sharing at least one tag) and score in memory.
 */
export async function getRelatedPosts(args: {
  excludeId: string;
  tags: string[];
  limit?: number;
}): Promise<BlogPostListItem[]> {
  const limit = args.limit ?? 3;
  if (args.tags.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_posts')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .not('published_at', 'is', null)
    .lte('published_at', new Date().toISOString())
    .neq('id', args.excludeId)
    .overlaps('tags', args.tags)
    .order('published_at', { ascending: false })
    .limit(20);

  const candidates = (data ?? []) as BlogPostListItem[];
  // Score by number of matching tags; tie-break by recency (preserved by
  // the SELECT ORDER BY published_at desc).
  const tagSet = new Set(args.tags);
  candidates.sort((a, b) => {
    const aMatches = a.tags.filter((t) => tagSet.has(t)).length;
    const bMatches = b.tags.filter((t) => tagSet.has(t)).length;
    return bMatches - aMatches;
  });
  return candidates.slice(0, limit);
}

// V2.2 — public-facing cached wrappers. revalidateTag('blog-list') in
// app/actions/blog.ts invalidates both. Fallback TTL = 1 hour.
export const listPublishedPosts = unstable_cache(
  listPublishedPostsUncached,
  ['blog:list-published-posts'],
  { tags: ['blog-list'], revalidate: 3600 }
);

export const getPostBySlug = unstable_cache(
  getPostBySlugUncached,
  ['blog:get-post-by-slug'],
  { tags: ['blog-list'], revalidate: 3600 }
);
