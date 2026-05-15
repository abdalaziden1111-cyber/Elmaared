import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

// Sample directory data — kept in-file as placeholder content. Once the
// suppliers table grows real production data, swap this for a Supabase fetch
// of `status='approved'` rows filtered by `is_public_listed = true`.
const PLACEHOLDER_SUPPLIERS = [
  {
    nameAr: 'شركة الإبداع للمعارض',
    nameEn: 'Al-Ibdaa Exhibitions',
    serviceAr: 'تصميم وتنفيذ أجنحة',
    serviceEn: 'Booth Design & Build',
    citiesAr: 'الرياض · جدة',
    citiesEn: 'Riyadh · Jeddah',
    orders: 47,
    years: 11,
  },
  {
    nameAr: 'هدايا ترويجية برو',
    nameEn: 'Promo Gifts Pro',
    serviceAr: 'هدايا ترويجية',
    serviceEn: 'Promotional Gifts',
    citiesAr: 'الدمام · الخبر',
    citiesEn: 'Dammam · Khobar',
    orders: 28,
    years: 7,
  },
  {
    nameAr: 'فعاليات الأفق',
    nameEn: 'Al-Ofoq Events',
    serviceAr: 'تنظيم فعاليات',
    serviceEn: 'Event Management',
    citiesAr: 'الرياض · جدة · الدمام',
    citiesEn: 'Riyadh · Jeddah · Dammam',
    orders: 34,
    years: 9,
  },
  {
    nameAr: 'مطبوعات الواحة',
    nameEn: 'Oasis Prints',
    serviceAr: 'مطبوعات',
    serviceEn: 'Print Materials',
    citiesAr: 'الرياض',
    citiesEn: 'Riyadh',
    orders: 51,
    years: 14,
  },
  {
    nameAr: 'ركن المعارض',
    nameEn: 'Booth Corner',
    serviceAr: 'تصميم وتنفيذ أجنحة',
    serviceEn: 'Booth Design & Build',
    citiesAr: 'جدة',
    citiesEn: 'Jeddah',
    orders: 19,
    years: 5,
  },
  {
    nameAr: 'إنجاز للفعاليات',
    nameEn: 'Injaz Events',
    serviceAr: 'تنظيم فعاليات',
    serviceEn: 'Event Management',
    citiesAr: 'الرياض',
    citiesEn: 'Riyadh',
    orders: 41,
    years: 12,
  },
];

export default async function PublicSuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.suppliersDirectory');
  const isAr = locale === 'ar';

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--color-stone-600)]">{t('subtitle')}</p>

      {/* Static filter chips — placeholder, just visual until backed by Supabase */}
      <div className="mt-8 flex flex-wrap gap-2">
        <span className="inline-flex h-9 items-center rounded-full bg-[var(--color-midnight-green)] px-4 text-xs font-semibold text-[var(--color-cream)]">
          {t('filterCity')}
        </span>
        <span className="inline-flex h-9 items-center rounded-full border border-[var(--color-stone-300)] bg-white px-4 text-xs font-semibold text-[var(--color-midnight-green)]">
          {t('filterService')}
        </span>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PLACEHOLDER_SUPPLIERS.map((s) => (
          <li
            key={s.nameEn}
            className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-base font-semibold text-[var(--color-midnight-green)]">
              {(isAr ? s.nameAr : s.nameEn).slice(0, 1)}
            </div>
            <h2 className="mt-4 font-semibold text-[var(--color-midnight-green)]">
              {isAr ? s.nameAr : s.nameEn}
            </h2>
            <p className="mt-1 text-xs text-[var(--color-stone-600)]">
              {isAr ? s.serviceAr : s.serviceEn}
            </p>
            <p className="mt-1 text-xs text-[var(--color-stone-600)]">
              {isAr ? s.citiesAr : s.citiesEn}
            </p>
            <p className="mt-3 text-xs text-[var(--color-stone-600)]">
              {t('cardOrders', { count: s.orders })} · {t('cardYears', { years: s.years })}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-12 rounded-2xl bg-[var(--color-midnight-green)] p-8 text-center text-[var(--color-cream)]">
        <p className="text-sm">{t('loginPrompt')}</p>
        <Link
          href="/signup/client/account"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-[var(--color-dune-gold)] px-6 text-sm font-semibold text-[var(--color-midnight-green)] hover:bg-[var(--color-dune-gold-100)]"
        >
          {t('ctaSignup')}
        </Link>
      </div>
    </main>
  );
}
