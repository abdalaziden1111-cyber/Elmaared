import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { BLOG_ARTICLES, getArticle } from '../articles';

export function generateStaticParams() {
  return BLOG_ARTICLES.map((a) => ({ slug: a.slug }));
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const article = getArticle(slug);
  if (!article) notFound();

  const t = await getTranslations('marketing.blog');
  const isAr = locale === 'ar';
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const body = isAr ? article.bodyAr : article.bodyEn;
  const title = isAr ? article.titleAr : article.titleEn;
  const excerpt = isAr ? article.excerptAr : article.excerptEn;

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
          {fmt.format(new Date(article.date))} · {t('minutes', { n: article.minutes })}
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-[var(--color-midnight-green)]">
          {title}
        </h1>
        <p className="mt-3 text-lg text-[var(--color-stone-600)]">{excerpt}</p>

        <div className="mt-10 space-y-5 text-base leading-relaxed text-[var(--color-charcoal)]">
          {body.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>
    </main>
  );
}
