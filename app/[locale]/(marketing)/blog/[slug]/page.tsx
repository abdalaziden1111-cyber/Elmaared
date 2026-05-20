import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { getPostBySlug, getRelatedPosts } from '@/lib/blog/queries';
import { ShareButtons } from '@/components/marketing/share-buttons';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa').replace(
  /\/+$/,
  ''
);

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: 'Article — تطبيق المعارض' };
  const isAr = locale === 'ar';
  const seoTitle = isAr
    ? post.seo_title_ar ?? post.title_ar
    : post.seo_title_en ?? post.title_en ?? post.title_ar;
  const seoDesc = isAr
    ? post.seo_description_ar ?? post.excerpt_ar
    : post.seo_description_en ?? post.excerpt_en;
  return {
    title: seoTitle,
    description: seoDesc ?? undefined,
    openGraph: {
      title: seoTitle,
      description: seoDesc ?? undefined,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations('marketing.blog');
  const isAr = locale === 'ar';
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const title = isAr ? post.title_ar : post.title_en ?? post.title_ar;
  const excerpt = isAr ? post.excerpt_ar : post.excerpt_en;
  const content = isAr ? post.content_ar : post.content_en ?? post.content_ar;

  const related = await getRelatedPosts({
    excludeId: post.id,
    tags: post.tags,
    limit: 3,
  });

  const articleUrl = `${APP_URL}/${locale}/blog/${post.slug}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link
        href="/blog"
        className="text-sm text-[var(--color-action-blue)] hover:underline"
      >
        {t('backToBlog')}
      </Link>

      <article className="mt-6">
        <p className="text-xs text-[var(--color-stone-600)]">
          {post.published_at ? fmt.format(new Date(post.published_at)) : ''}
          {post.reading_time_minutes
            ? ` · ${t('minutes', { n: post.reading_time_minutes })}`
            : ''}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--color-midnight-green)]">
          {title}
        </h1>
        {excerpt ? (
          <p className="mt-3 text-lg text-[var(--color-stone-600)]">{excerpt}</p>
        ) : null}

        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt=""
            className="mt-8 aspect-video w-full rounded-2xl object-cover"
          />
        ) : null}

        <div
          className="prose prose-base prose-stone mt-10 max-w-none leading-relaxed text-[var(--color-charcoal)] prose-headings:text-[var(--color-midnight-green)] prose-a:text-[var(--color-action-blue)]"
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {post.tags.length > 0 ? (
          <div className="mt-10 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[var(--color-stone-600)]">الوسوم:</span>
            {post.tags.map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${tag}`}
                className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5 hover:bg-[var(--color-stone-300)]"
              >
                #{tag}
              </Link>
            ))}
          </div>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-4 border-y border-[var(--color-stone-300)] py-4">
          <span className="text-xs text-[var(--color-stone-600)]">شارك المقال</span>
          <ShareButtons url={articleUrl} title={title} />
        </div>
      </article>

      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            مقالات قد تعجبك
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/blog/${r.slug}`}
                  className="block h-full rounded-xl border border-[var(--color-stone-300)] bg-white p-4 hover:border-[var(--color-action-blue)]"
                >
                  <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
                    {isAr ? r.title_ar : r.title_en ?? r.title_ar}
                  </h3>
                  {(isAr ? r.excerpt_ar : r.excerpt_en) ? (
                    <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                      {isAr ? r.excerpt_ar : r.excerpt_en}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
