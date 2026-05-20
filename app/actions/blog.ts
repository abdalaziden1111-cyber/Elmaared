'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { readingTimeMinutes, slugify } from '@/lib/blog/reading-time';
import type { ActionResult } from './auth';

const postInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'الرابط يجب أن يكون أحرف لاتينية صغيرة وأرقام وشرطات فقط'),
  title_ar: z.string().min(5),
  title_en: z.string().max(200).optional().nullable(),
  excerpt_ar: z.string().max(300).optional().nullable(),
  excerpt_en: z.string().max(300).optional().nullable(),
  content_ar: z.string().min(20),
  content_en: z.string().optional().nullable(),
  cover_image: z.string().optional().nullable(),
  status: z.enum(['draft', 'scheduled', 'published']),
  published_at: z.string().datetime().optional().nullable(),
  tags: z.array(z.string()).max(20).default([]),
  seo_title_ar: z.string().max(120).optional().nullable(),
  seo_title_en: z.string().max(120).optional().nullable(),
  seo_description_ar: z.string().max(300).optional().nullable(),
  seo_description_en: z.string().max(300).optional().nullable(),
});

export type BlogPostInput = z.infer<typeof postInputSchema>;

function rowFromInput(input: BlogPostInput, authorId: string) {
  const readingTime = readingTimeMinutes(input.content_ar);
  const publishedAt =
    input.status === 'published'
      ? input.published_at ?? new Date().toISOString()
      : input.status === 'scheduled'
      ? input.published_at ?? null
      : null;
  return {
    slug: input.slug,
    title_ar: input.title_ar,
    title_en: input.title_en ?? null,
    excerpt_ar: input.excerpt_ar ?? null,
    excerpt_en: input.excerpt_en ?? null,
    content_ar: input.content_ar,
    content_en: input.content_en ?? null,
    cover_image: input.cover_image ?? null,
    author_id: authorId,
    status: input.status,
    published_at: publishedAt,
    tags: input.tags,
    seo_title_ar: input.seo_title_ar ?? null,
    seo_title_en: input.seo_title_en ?? null,
    seo_description_ar: input.seo_description_ar ?? null,
    seo_description_en: input.seo_description_en ?? null,
    reading_time_minutes: readingTime,
  };
}

function flushBlogCaches(slug?: string | null) {
  // Next 16 signature: revalidateTag(tag, profile). 'default' picks the
  // standard stale-while-revalidate window for the tagged cache entry.
  revalidateTag('blog-list', 'default');
  revalidatePath('/ar/blog');
  revalidatePath('/en/blog');
  if (slug) {
    revalidatePath(`/ar/blog/${slug}`);
    revalidatePath(`/en/blog/${slug}`);
  }
  revalidatePath('/admin/blog');
}

export async function createPostAction(
  input: unknown
): Promise<ActionResult<{ id: string; slug: string }>> {
  const { user } = await requireRole(['admin']);
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'بعض الحقول غير صحيحة.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('blog_posts')
    .insert(rowFromInput(parsed.data, user.id))
    .select('id, slug')
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? 'فشل في إنشاء المقال.' };
  }
  flushBlogCaches(parsed.data.slug);
  return { ok: true, data: data as { id: string; slug: string } };
}

export async function updatePostAction(
  input: unknown
): Promise<ActionResult> {
  const { user } = await requireRole(['admin']);
  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success || !parsed.data.id) {
    return { ok: false, error: 'بيانات التحديث غير مكتملة.' };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from('blog_posts')
    .update(rowFromInput(parsed.data, user.id))
    .eq('id', parsed.data.id);
  if (error) return { ok: false, error: error.message };
  flushBlogCaches(parsed.data.slug);
  return { ok: true };
}

export async function deletePostAction(
  id: string
): Promise<ActionResult> {
  await requireRole(['admin']);
  if (!id) return { ok: false, error: 'معرف المقال مطلوب.' };
  const admin = createAdminClient();
  const { data: row } = await admin
    .from('blog_posts')
    .select('slug')
    .eq('id', id)
    .maybeSingle();
  const slug = (row as { slug: string } | null)?.slug ?? null;
  const { error } = await admin.from('blog_posts').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  flushBlogCaches(slug);
  return { ok: true };
}

/**
 * Upload a cover image to Supabase Storage and return the public URL.
 * Path layout: <userId>/<timestamp>-<safe-name>.
 */
export async function uploadCoverImageAction(
  formData: FormData
): Promise<ActionResult<{ publicUrl: string; path: string }>> {
  const { user } = await requireRole(['admin']);
  const file = formData.get('file');
  if (!(file instanceof File)) return { ok: false, error: 'الملف مفقود.' };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: 'حجم الصورة يجب أن يكون أقل من 5MB.' };
  }
  const safeName = file.name.replace(/[^a-z0-9._-]+/gi, '-').slice(0, 80);
  const path = `${user.id}/${Date.now()}-${safeName}`;

  const admin = createAdminClient();
  const { error } = await admin.storage
    .from('blog-images')
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) return { ok: false, error: error.message };
  const { data: pub } = admin.storage.from('blog-images').getPublicUrl(path);
  return { ok: true, data: { publicUrl: pub.publicUrl, path } };
}

export { slugify };
