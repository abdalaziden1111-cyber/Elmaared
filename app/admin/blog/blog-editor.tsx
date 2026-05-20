'use client';

// Phase V5.2 — Tiptap-powered bilingual blog editor.
//
// Two synced editors (AR + EN) side by side. Cover image upload posts to
// Supabase Storage via uploadCoverImageAction. Status toggle picks between
// draft / scheduled (with date picker) / published.

import { useState, useTransition } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import LinkExt from '@tiptap/extension-link';
import ImageExt from '@tiptap/extension-image';
import PlaceholderExt from '@tiptap/extension-placeholder';
import {
  createPostAction,
  updatePostAction,
  uploadCoverImageAction,
  slugify,
} from '@/app/actions/blog';

interface Props {
  initial?: {
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
  };
}

const EMPTY: NonNullable<Props['initial']> = {
  id: '',
  slug: '',
  title_ar: '',
  title_en: '',
  excerpt_ar: '',
  excerpt_en: '',
  content_ar: '',
  content_en: '',
  cover_image: '',
  status: 'draft',
  published_at: null,
  tags: [],
  seo_title_ar: '',
  seo_title_en: '',
  seo_description_ar: '',
  seo_description_en: '',
};

export function BlogEditor({ initial }: Props) {
  const seed = initial ?? EMPTY;
  const [slug, setSlug] = useState(seed.slug);
  const [titleAr, setTitleAr] = useState(seed.title_ar);
  const [titleEn, setTitleEn] = useState(seed.title_en ?? '');
  const [excerptAr, setExcerptAr] = useState(seed.excerpt_ar ?? '');
  const [excerptEn, setExcerptEn] = useState(seed.excerpt_en ?? '');
  const [coverImage, setCoverImage] = useState<string | null>(
    seed.cover_image ?? null
  );
  const [tags, setTags] = useState<string[]>(seed.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'published'>(
    seed.status
  );
  const [publishedAt, setPublishedAt] = useState<string>(
    seed.published_at ? seed.published_at.slice(0, 16) : ''
  );
  const [seoTitleAr, setSeoTitleAr] = useState(seed.seo_title_ar ?? '');
  const [seoTitleEn, setSeoTitleEn] = useState(seed.seo_title_en ?? '');
  const [seoDescAr, setSeoDescAr] = useState(seed.seo_description_ar ?? '');
  const [seoDescEn, setSeoDescEn] = useState(seed.seo_description_en ?? '');
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const arEditor = useEditor({
    extensions: [
      StarterKit,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      PlaceholderExt.configure({ placeholder: 'اكتب المحتوى بالعربية…' }),
    ],
    content: seed.content_ar || '',
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] rounded-lg border border-[var(--color-stone-300)] bg-white p-4 text-sm leading-7 focus:outline-none',
        dir: 'rtl',
        lang: 'ar',
      },
    },
    immediatelyRender: false,
  });

  const enEditor = useEditor({
    extensions: [
      StarterKit,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      PlaceholderExt.configure({ placeholder: 'Write the English content…' }),
    ],
    content: seed.content_en ?? '',
    editorProps: {
      attributes: {
        class:
          'min-h-[300px] rounded-lg border border-[var(--color-stone-300)] bg-white p-4 text-sm leading-7 focus:outline-none',
        dir: 'ltr',
        lang: 'en',
      },
    },
    immediatelyRender: false,
  });

  function addTag() {
    const t = tagDraft.trim().toLowerCase();
    if (!t || tags.includes(t)) return;
    setTags([...tags, t]);
    setTagDraft('');
  }
  function removeTag(t: string) {
    setTags(tags.filter((x) => x !== t));
  }

  async function uploadCover(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const fd = new FormData();
      fd.set('file', file);
      const r = await uploadCoverImageAction(fd);
      if (r.ok && r.data) {
        setCoverImage(r.data.publicUrl);
      } else {
        setMessage(r.ok ? 'تم الرفع.' : r.error ?? 'فشل');
      }
    } finally {
      setUploading(false);
    }
  }

  function save(nextStatus?: typeof status) {
    setMessage(null);
    const finalStatus = nextStatus ?? status;
    const payload = {
      id: seed.id || undefined,
      slug: slug || slugify(titleEn || titleAr),
      title_ar: titleAr,
      title_en: titleEn || null,
      excerpt_ar: excerptAr || null,
      excerpt_en: excerptEn || null,
      content_ar: arEditor?.getHTML() ?? '',
      content_en: enEditor?.getHTML() || null,
      cover_image: coverImage || null,
      status: finalStatus,
      published_at:
        finalStatus === 'published' || finalStatus === 'scheduled'
          ? publishedAt
            ? new Date(publishedAt).toISOString()
            : finalStatus === 'published'
            ? new Date().toISOString()
            : null
          : null,
      tags,
      seo_title_ar: seoTitleAr || null,
      seo_title_en: seoTitleEn || null,
      seo_description_ar: seoDescAr || null,
      seo_description_en: seoDescEn || null,
    };
    startTransition(async () => {
      const r = seed.id ? await updatePostAction(payload) : await createPostAction(payload);
      if (r.ok) {
        setStatus(finalStatus);
        setMessage(
          finalStatus === 'published'
            ? 'تم النشر.'
            : finalStatus === 'scheduled'
            ? 'تمت جدولة النشر.'
            : 'تم الحفظ كمسودة.'
        );
      } else {
        setMessage(r.error ?? 'فشل');
      }
    });
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="العنوان (عربي)">
          <input
            type="text"
            dir="rtl"
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-sm"
          />
        </FieldLabel>
        <FieldLabel label="Title (English)">
          <input
            type="text"
            dir="ltr"
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-sm"
          />
        </FieldLabel>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="مقتطف (عربي)">
          <textarea
            dir="rtl"
            value={excerptAr}
            onChange={(e) => setExcerptAr(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-sm"
          />
        </FieldLabel>
        <FieldLabel label="Excerpt (English)">
          <textarea
            dir="ltr"
            value={excerptEn}
            onChange={(e) => setExcerptEn(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-sm"
          />
        </FieldLabel>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="المحتوى (عربي)">
          <EditorContent editor={arEditor} />
        </FieldLabel>
        <FieldLabel label="Content (English)">
          <EditorContent editor={enEditor} />
        </FieldLabel>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
        <h3 className="text-sm font-semibold">صورة الغلاف</h3>
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt="cover"
            className="mt-2 max-h-48 rounded-lg object-cover"
          />
        ) : null}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadCover(file);
          }}
          disabled={uploading}
          className="mt-3 block text-xs"
        />
        {uploading ? (
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">يرفع…</p>
        ) : null}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <FieldLabel label="الرابط (slug)">
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            onBlur={() => {
              if (!slug && titleEn) setSlug(slugify(titleEn));
              else if (!slug && titleAr) setSlug(slugify(titleAr));
            }}
            dir="ltr"
            className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-sm font-mono"
            placeholder="my-article-slug"
          />
        </FieldLabel>
        <FieldLabel label="الوسوم">
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-stone-100)] px-2 py-0.5 text-xs"
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTag(t)}
                  className="text-[var(--color-stone-600)] hover:text-[var(--color-error,#B91C1C)]"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="أضف وسماً…"
              className="flex-1 rounded-lg border border-[var(--color-stone-300)] px-2 py-1 text-xs"
            />
          </div>
        </FieldLabel>
      </section>

      <details className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          إعدادات SEO
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <FieldLabel label="SEO title (AR)">
            <input
              dir="rtl"
              value={seoTitleAr}
              onChange={(e) => setSeoTitleAr(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-xs"
            />
          </FieldLabel>
          <FieldLabel label="SEO title (EN)">
            <input
              dir="ltr"
              value={seoTitleEn}
              onChange={(e) => setSeoTitleEn(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-xs"
            />
          </FieldLabel>
          <FieldLabel label="SEO description (AR)">
            <textarea
              dir="rtl"
              rows={2}
              value={seoDescAr}
              onChange={(e) => setSeoDescAr(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-xs"
            />
          </FieldLabel>
          <FieldLabel label="SEO description (EN)">
            <textarea
              dir="ltr"
              rows={2}
              value={seoDescEn}
              onChange={(e) => setSeoDescEn(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-stone-300)] px-3 py-2 text-xs"
            />
          </FieldLabel>
        </div>
      </details>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
        <h3 className="text-sm font-semibold">الجدولة + النشر</h3>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <label>
            تاريخ النشر:{' '}
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              className="rounded-lg border border-[var(--color-stone-300)] px-2 py-1"
            />
          </label>
          <span className="text-[var(--color-stone-600)]">
            الحالة الحالية: <strong>{status}</strong>
          </span>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        {message ? (
          <span className="text-sm text-[var(--color-stone-600)]">{message}</span>
        ) : null}
        <button
          type="button"
          onClick={() => save('draft')}
          disabled={pending}
          className="rounded-xl bg-[var(--color-stone-100)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-stone-300)] disabled:opacity-50"
        >
          حفظ كمسودة
        </button>
        <button
          type="button"
          onClick={() => save('scheduled')}
          disabled={pending || !publishedAt}
          className="rounded-xl bg-[var(--color-stone-100)] px-4 py-2 text-sm font-medium hover:bg-[var(--color-stone-300)] disabled:opacity-50"
        >
          جدولة
        </button>
        <button
          type="button"
          onClick={() => save('published')}
          disabled={pending}
          className="rounded-xl bg-[var(--color-action-blue)] px-5 py-2 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-50"
        >
          نشر الآن
        </button>
      </div>
    </div>
  );
}

function FieldLabel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-[var(--color-stone-600)]">
        {label}
      </span>
      {children}
    </label>
  );
}
