import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LocaleToggle } from '@/components/marketing/locale-toggle';

export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const tHome = await getTranslations('home');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-[var(--color-stone-300)] bg-[var(--color-cream)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-semibold text-[var(--color-midnight-green)]"
          >
            <span
              aria-hidden
              className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-midnight-green)] text-[var(--color-cream)]"
            >
              ت
            </span>
            <span className="hidden sm:inline">{tHome('title')}</span>
          </Link>
          <LocaleToggle />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
