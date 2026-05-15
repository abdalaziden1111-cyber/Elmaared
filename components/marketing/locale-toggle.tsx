'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/i18n/routing';

export function LocaleToggle() {
  const t = useTranslations('siteHeader');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const target = locale === 'ar' ? 'en' : 'ar';

  return (
    <button
      type="button"
      onClick={() => router.replace(pathname, { locale: target })}
      className="inline-flex h-9 items-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
      aria-label={t('switchLocale')}
    >
      {t('switchLocale')}
    </button>
  );
}
