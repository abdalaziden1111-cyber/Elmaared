import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { BLOG_ARTICLES } from './articles';

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.blog');
  const isAr = locale === 'ar';
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

      <ul className="mt-12 grid gap-5 md:grid-cols-2">
        {BLOG_ARTICLES.map((a) => (
          <li key={a.slug}>
            <Link
              href={`/blog/${a.slug}`}
              className="block h-full rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition hover:border-[var(--color-action-blue)]"
            >
              <span className="text-xs text-[var(--color-stone-600)]">
                {fmt.format(new Date(a.date))} · {t('minutes', { n: a.minutes })}
              </span>
              <h2 className="mt-2 text-lg font-semibold text-[var(--color-midnight-green)]">
                {isAr ? a.titleAr : a.titleEn}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-stone-600)]">
                {isAr ? a.excerptAr : a.excerptEn}
              </p>
              <span className="mt-4 inline-block text-xs font-medium text-[var(--color-action-blue)]">
                {t('readMore')} ←
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
