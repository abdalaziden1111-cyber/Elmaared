import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export async function SiteFooter() {
  const t = await getTranslations('siteFooter');

  const groups: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: t('productTitle'),
      links: [
        { href: '/for-clients', label: t('links.forClients') },
        { href: '/for-suppliers', label: t('links.forSuppliers') },
        { href: '/how-it-works', label: t('links.howItWorks') },
        { href: '/pricing', label: t('links.pricing') },
      ],
    },
    {
      title: t('companyTitle'),
      links: [
        { href: '/about', label: t('links.about') },
        { href: '/blog', label: t('links.blog') },
        { href: '/discover', label: t('links.suppliers') },
        { href: '/exhibitions', label: t('links.exhibitions') },
      ],
    },
    {
      title: t('legalTitle'),
      links: [
        { href: '/legal/terms', label: t('links.terms') },
        { href: '/legal/privacy', label: t('links.privacy') },
      ],
    },
    {
      title: t('contactTitle'),
      links: [{ href: '/contact', label: t('links.contact') }],
    },
  ];

  return (
    <footer className="mt-24 border-t border-[var(--color-stone-300)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-midnight-green)]">
              <span
                aria-hidden
                className="inline-flex size-8 items-center justify-center rounded-lg bg-[var(--color-midnight-green)] text-[var(--color-cream)]"
              >
                ت
              </span>
              <span>App Exhibition</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-stone-600)]">
              {t('tagline')}
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-midnight-green)]">
                {g.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-[var(--color-stone-600)]">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="hover:text-[var(--color-action-blue)]"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-10 border-t border-[var(--color-stone-300)] pt-6 text-xs text-[var(--color-stone-600)]">
          {t('copyright')}
        </p>
      </div>
    </footer>
  );
}
