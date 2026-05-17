import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.pricing');

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        {t('title')}
      </h1>
      <p className="mt-4 text-lg text-[var(--color-stone-600)]">{t('subtitle')}</p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <Card
          title={t('clientTitle')}
          rate={t('clientRate')}
          body={t('clientBody')}
        />
        <Card
          title={t('supplierTitle')}
          rate={t('supplierRate')}
          body={t('supplierBody')}
        />
      </div>

      <p className="mt-10 rounded-xl bg-white p-5 text-sm">
        {t('footnoteIntro')} <strong>{t('footnotePercent')}</strong>
        {t('footnoteOutro')}
      </p>
    </main>
  );
}

function Card({ title, rate, body }: { title: string; rate: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
      <h2 className="text-sm font-medium text-[var(--color-stone-600)]">{title}</h2>
      <div className="mt-2 text-4xl font-semibold text-[var(--color-midnight-green)] num">
        {rate}
      </div>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">{body}</p>
    </div>
  );
}
