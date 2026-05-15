import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export default async function ForSuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.forSuppliers');

  const benefits = [
    { title: t('features.matchTitle'), body: t('features.matchBody') },
    { title: t('features.guaranteedTitle'), body: t('features.guaranteedBody') },
    { title: t('features.feeTitle'), body: t('features.feeBody') },
    { title: t('features.portfolioTitle'), body: t('features.portfolioBody') },
    { title: t('features.aiAssistTitle'), body: t('features.aiAssistBody') },
    { title: t('features.fairTitle'), body: t('features.fairBody') },
    { title: t('features.supportTitle'), body: t('features.supportBody') },
    { title: t('features.growthTitle'), body: t('features.growthBody') },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--color-stone-600)]">
        {t('subtitle')}
      </p>

      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <li
            key={b.title}
            className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          >
            <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
              {b.title}
            </h2>
            <p className="mt-1 text-sm text-[var(--color-stone-600)]">{b.body}</p>
          </li>
        ))}
      </ul>

      <section className="mt-20">
        <h2 className="text-center text-3xl font-semibold text-[var(--color-midnight-green)]">
          {t('testimonialsTitle')}
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { name: t('t1Name'), body: t('t1Body') },
            { name: t('t2Name'), body: t('t2Body') },
            { name: t('t3Name'), body: t('t3Body') },
          ].map((tm) => (
            <figure
              key={tm.name}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6"
            >
              <blockquote className="text-sm leading-relaxed text-[var(--color-charcoal)]">
                "{tm.body}"
              </blockquote>
              <figcaption className="mt-4 text-xs font-semibold text-[var(--color-midnight-green)]">
                {tm.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <div className="mt-16 flex justify-center">
        <Link
          href="/signup/supplier/account"
          className="inline-flex h-12 items-center rounded-xl bg-[var(--color-action-blue)] px-8 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          {t('cta')}
        </Link>
      </div>
    </main>
  );
}
