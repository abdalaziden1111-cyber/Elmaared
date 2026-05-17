import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { Mail } from 'lucide-react';

export default async function VerifyEmailPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('auth.verifyEmail');
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <Mail className="size-12 text-[var(--color-action-blue)]" />
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-midnight-green)]">
        {t('title')}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">{t('body')}</p>
      <Link
        href="/login"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
      >
        {t('backToLogin')}
      </Link>
    </main>
  );
}
