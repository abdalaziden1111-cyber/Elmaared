'use client';

import NextLink from 'next/link';
import { usePathname as useNextPathname } from 'next/navigation';
import { Link as I18nLink, usePathname as useI18nPathname } from '@/lib/i18n/routing';

export interface SidebarNavItem {
  href: string;
  label: string;
}

export interface SidebarNavGroup {
  title?: string;
  links: SidebarNavItem[];
}

// Shared sidebar nav with active-route highlighting. Used by dashboard,
// supplier, and admin layouts.
//
// `unlocalized` is set by the admin layout (which lives outside the
// [locale] segment) so we use plain next/link + next/navigation. Locale-
// aware layouts (dashboard, supplier) leave it false and we use next-intl's
// Link + usePathname, which strips/prefixes the current locale automatically.
export function SidebarNav({
  links,
  groups,
  tone = 'light',
  ariaLabel,
  unlocalized = false,
}: {
  links?: SidebarNavItem[];
  groups?: SidebarNavGroup[];
  tone?: 'light' | 'dark';
  ariaLabel: string;
  unlocalized?: boolean;
}) {
  // Conditionally call hooks at the top level. Both `usePathname`
  // implementations behave the same in client components; we pick the one
  // matching the layout's routing model.
  const i18nPath = useI18nPathname();
  const nextPath = useNextPathname();
  const pathname = unlocalized ? nextPath : i18nPath;

  // Most-specific match wins. We pick the link whose href is the longest
  // prefix of the current pathname so a parent like `/dashboard` does not
  // light up when we're really on `/dashboard/rfqs`.
  const allHrefs = (groups ?? []).flatMap((g) => g.links).map((l) => l.href)
    .concat((links ?? []).map((l) => l.href));
  const activeHref = allHrefs
    .filter((href) => href === pathname || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  const isActive = (href: string) => href === activeHref;

  const baseCls =
    'rounded-lg px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]';
  const inactiveCls =
    tone === 'dark' ? 'hover:bg-white/10' : 'hover:bg-[var(--color-stone-100)]';
  const activeCls =
    tone === 'dark'
      ? 'bg-white/10 font-semibold text-[var(--color-cream)]'
      : 'bg-[var(--color-stone-100)] font-semibold text-[var(--color-midnight-green)]';

  function renderLink(l: SidebarNavItem) {
    const active = isActive(l.href);
    const cls = `${baseCls} ${active ? activeCls : inactiveCls}`;
    if (unlocalized) {
      return (
        <NextLink
          key={l.href}
          href={l.href}
          aria-current={active ? 'page' : undefined}
          className={cls}
        >
          {l.label}
        </NextLink>
      );
    }
    return (
      <I18nLink
        key={l.href}
        href={l.href}
        aria-current={active ? 'page' : undefined}
        className={cls}
      >
        {l.label}
      </I18nLink>
    );
  }

  if (groups) {
    const captionCls =
      tone === 'dark'
        ? 'text-[var(--color-cream)]/40'
        : 'text-[var(--color-stone-600)]/60';
    return (
      <nav
        className={`flex flex-col gap-5 text-sm ${
          tone === 'dark' ? 'text-[var(--color-cream)]/80' : ''
        }`}
        aria-label={ariaLabel}
      >
        {groups.map((g, i) => (
          <div key={g.title ?? i} className="flex flex-col gap-1">
            {g.title ? (
              <p
                className={`px-3 text-[10px] font-semibold uppercase tracking-wider ${captionCls}`}
              >
                {g.title}
              </p>
            ) : null}
            {g.links.map(renderLink)}
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex flex-col gap-1 text-sm" aria-label={ariaLabel}>
      {(links ?? []).map(renderLink)}
    </nav>
  );
}
