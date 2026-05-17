import { getLocale, getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

// not-found.tsx doesn't receive `params`, so we resolve the locale via
// getLocale() (which reads the cached request locale set by the parent
// layout) and immediately re-bind it for the nested Link to consume.
export default async function NotFound() {
  const locale = await getLocale();
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
