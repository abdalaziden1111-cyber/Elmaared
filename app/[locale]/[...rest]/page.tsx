import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

// Catch-all under [locale] for any unmatched path under /ar/* or /en/*.
//
// We render the 404 UI directly here (status 200) rather than calling
// notFound() (status 404 but stripped layout). Next.js 16's notFound()
// re-renders through the global _not-found shell which lacks our
// locale's <html lang dir> + font setup. Rendering inline keeps the
// user inside [locale]/layout.tsx so RTL/LTR + Plex/Inter fonts work.
//
// Trade-off accepted: SEO crawlers see 200 on a missing page. Mitigated
// by the noindex meta on every protected/marketing layout via Next's
// default. For a true 404 status with localized layout we'd need a
// Route Handler returning Response with status:404 + a hand-built HTML
// string — out of scope for the MVP.
export default async function CatchAllNotFound({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('notFound');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
        {t('title')}
      </h1>
      <p className="mt-2 text-[var(--color-stone-600)]">{t('body')}</p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[var(--color-action-blue)] px-6 py-3 text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
      >
        {t('backHome')}
      </Link>
    </main>
  );
}
