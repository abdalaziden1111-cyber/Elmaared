import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { listPublishedPosts } from '@/lib/blog/queries';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; tag?: string }>;
}

export default async function BlogIndexPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { page: pageParam, tag } = await searchParams;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.blog');
  const isAr = locale === 'ar';

  const pageNum = Math.max(1, Number(pageParam) || 1);
  const { posts, hasMore } = await listPublishedPosts({
    page: pageNum,
    pageSize: 12,
    tag: tag ?? null,
  });

  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--color-stone-600)]">{t('subtitle')}</p>

      {tag ? (
        <p className="mt-4 text-sm text-[var(--color-stone-600)]">
          عرض المقالات الموسومة بـ:{' '}
          <strong className="text-[var(--color-charcoal)]">#{tag}</strong>{' '}
          <Link href="/blog" className="ms-2 text-[var(--color-action-blue)] hover:underline">
            مسح الفلتر
          </Link>
        </p>
      ) : null}

      {posts.length === 0 ? (
        <p className="mt-12 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-10 text-center text-sm text-[var(--color-stone-600)]">
          لا توجد مقالات في هذه الفئة بعد.
        </p>
      ) : (
        <ul className="mt-12 grid gap-5 md:grid-cols-2">
          {posts.map((a) => (
            <li key={a.id}>
              <Link
                href={`/blog/${a.slug}`}
                className="block h-full rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition hover:border-[var(--color-action-blue)]"
              >
                {a.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.cover_image}
                    alt=""
                    className="mb-3 aspect-video w-full rounded-lg object-cover"
                  />
                ) : null}
                <span className="text-xs text-[var(--color-stone-600)]">
                  {a.published_at ? fmt.format(new Date(a.published_at)) : ''}
                  {a.reading_time_minutes
                    ? ` · ${t('minutes', { n: a.reading_time_minutes })}`
                    : ''}
                </span>
                <h2 className="mt-2 text-lg font-semibold text-[var(--color-midnight-green)]">
                  {isAr ? a.title_ar : a.title_en ?? a.title_ar}
                </h2>
                {(isAr ? a.excerpt_ar : a.excerpt_en) ? (
                  <p className="mt-2 text-sm text-[var(--color-stone-600)]">
                    {isAr ? a.excerpt_ar : a.excerpt_en}
                  </p>
                ) : null}
                <span className="mt-4 inline-block text-xs font-medium text-[var(--color-action-blue)]">
                  {t('readMore')} ←
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <nav className="mt-10 flex items-center justify-between text-sm">
        {pageNum > 1 ? (
          <Link
            href={`/blog?page=${pageNum - 1}${tag ? `&tag=${tag}` : ''}`}
            className="text-[var(--color-action-blue)] hover:underline"
          >
            ← الصفحة السابقة
          </Link>
        ) : (
          <span />
        )}
        <span className="text-xs text-[var(--color-stone-600)]">صفحة {pageNum}</span>
        {hasMore ? (
          <Link
            href={`/blog?page=${pageNum + 1}${tag ? `&tag=${tag}` : ''}`}
            className="text-[var(--color-action-blue)] hover:underline"
          >
            الصفحة التالية →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
