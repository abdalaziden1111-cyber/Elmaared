import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

const PLACEHOLDER_EXHIBITIONS = [
  {
    slug: 'leap-2027',
    nameAr: 'LEAP 2027',
    nameEn: 'LEAP 2027',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    venueAr: 'مالهم',
    venueEn: 'Malham',
    date: '2027-02-08',
    durationDays: 4,
    blurbAr: 'أكبر تجمّع تقني عالمي. منصة استثنائية للشركات الناشئة والمؤسسات التقنية.',
    blurbEn: 'World‑largest tech gathering. Premier stage for startups and tech enterprises.',
  },
  {
    slug: 'cityscape-2026',
    nameAr: 'Cityscape Global 2026',
    nameEn: 'Cityscape Global 2026',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    venueAr: 'مركز الرياض الدولي للمعارض',
    venueEn: 'Riyadh International Convention Center',
    date: '2026-11-10',
    durationDays: 4,
    blurbAr: 'المعرض العالمي للعقارات والتطوير العمراني.',
    blurbEn: 'Global real‑estate and urban development show.',
  },
  {
    slug: 'gitex-saudi-2026',
    nameAr: 'GITEX Saudi Arabia 2026',
    nameEn: 'GITEX Saudi Arabia 2026',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    venueAr: 'مركز الرياض الدولي للمعارض',
    venueEn: 'Riyadh International Convention Center',
    date: '2026-10-05',
    durationDays: 4,
    blurbAr: 'الجناح السعودي من GITEX — أحد أكبر معارض التقنية في المنطقة.',
    blurbEn: 'The Saudi edition of GITEX — one of the region\'s largest tech expos.',
  },
];

export default async function ExhibitionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.exhibitions');
  const isAr = locale === 'ar';
  const fmt = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-[var(--color-stone-600)]">{t('subtitle')}</p>

      <ul className="mt-10 grid gap-5 md:grid-cols-2">
        {PLACEHOLDER_EXHIBITIONS.map((ex) => (
          <li
            key={ex.slug}
            className="overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white"
          >
            <div className="bg-[var(--color-midnight-green)] px-5 py-3 text-[var(--color-cream)]">
              <h2 className="text-lg font-semibold">{isAr ? ex.nameAr : ex.nameEn}</h2>
              <p className="mt-1 text-xs opacity-90">
                {fmt.format(new Date(ex.date))} · {ex.durationDays} {isAr ? 'أيام' : 'days'}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-[var(--color-stone-600)]">
                {isAr ? ex.venueAr : ex.venueEn} · {isAr ? ex.cityAr : ex.cityEn}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]">
                {isAr ? ex.blurbAr : ex.blurbEn}
              </p>
              <Link
                href="/dashboard/rfqs/new"
                className="mt-4 inline-flex h-10 items-center rounded-lg bg-[var(--color-action-blue)] px-4 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
              >
                {t('ctaPlan')}
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-12 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] px-6 py-5 text-center text-sm text-[var(--color-stone-600)]">
        {t('comingSoon')}
      </p>
    </main>
  );
}
