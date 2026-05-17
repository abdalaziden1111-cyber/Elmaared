import { Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { LocaleToggle } from './locale-toggle';
import { MobileMenu } from '@/components/layout/mobile-menu';

export async function SiteHeader() {
  const t = await getTranslations('siteFooter.links');
  const tAuth = await getTranslations('auth');
  const tHome = await getTranslations('home');

  const navLinks: { href: string; label: string }[] = [
    { href: '/for-clients', label: t('forClients') },
    { href: '/for-suppliers', label: t('forSuppliers') },
    { href: '/how-it-works', label: t('howItWorks') },
    { href: '/pricing', label: t('pricing') },
    { href: '/discover', label: t('suppliers') },
    { href: '/exhibitions', label: t('exhibitions') },
    { href: '/blog', label: t('blog') },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-stone-300)] bg-[var(--color-cream)]/95 backdrop-blur">
      {/* Mobile bar + slide-in drawer (< lg) */}
      <MobileMenu title={tHome('title')}>
        <nav
          className="flex flex-col gap-1 text-sm"
          aria-label={tHome('title')}
        >
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--color-stone-300)] pt-4">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-sm font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
            >
              {tAuth('login')}
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--color-action-blue)] px-3 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
            >
              {tAuth('signup')}
            </Link>
            <div className="mt-2">
              <LocaleToggle />
            </div>
          </div>
        </nav>
      </MobileMenu>

      {/* Desktop layout (lg+) */}
      <div className="mx-auto hidden max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:flex">
        <Link
          href="/"
          aria-label={tHome('title')}
          className="flex items-center gap-2 text-base font-semibold text-[var(--color-midnight-green)]"
        >
          <span
            aria-hidden
            className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-midnight-green)] text-[var(--color-cream)]"
          >
            <Building2 className="size-4" />
          </span>
          <span>{tHome('title')}</span>
        </Link>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--color-stone-600)]">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="hover:text-[var(--color-action-blue)]"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LocaleToggle />
          <Link
            href="/login"
            className="inline-flex h-9 items-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
          >
            {tAuth('login')}
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-lg bg-[var(--color-action-blue)] px-3 text-xs font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
          >
            {tAuth('signup')}
          </Link>
        </div>
      </div>
    </header>
  );
}
