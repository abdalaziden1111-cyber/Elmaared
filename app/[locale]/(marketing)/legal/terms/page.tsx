import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.legal');

  const sections = [
    { title: t('section1Title'), body: t('section1Body') },
    { title: t('section2Title'), body: t('section2Body') },
    { title: t('section3Title'), body: t('section3Body') },
    { title: t('section4Title'), body: t('section4Body') },
    { title: t('section5Title'), body: t('section5Body') },
    { title: t('section6Title'), body: t('section6Body') },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        {t('termsTitle')}
      </h1>
      <p className="mt-2 text-xs text-[var(--color-stone-600)]">{t('lastUpdated')}</p>

      <p className="mt-6 rounded-2xl border border-dashed border-[var(--color-warning)] bg-[var(--color-warning-100)] px-5 py-3 text-sm text-[var(--color-charcoal)]">
        {t('termsLead')}
      </p>

      <div className="mt-10 space-y-8">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
              {s.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-charcoal)]">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
