import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.legal');

  const sections = [
    { title: t('privacy1Title'), body: t('privacy1Body') },
    { title: t('privacy2Title'), body: t('privacy2Body') },
    { title: t('privacy3Title'), body: t('privacy3Body') },
    { title: t('privacy4Title'), body: t('privacy4Body') },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        {t('privacyTitle')}
      </h1>
      <p className="mt-2 text-xs text-[var(--color-stone-600)]">{t('lastUpdated')}</p>

      <p className="mt-6 rounded-2xl border border-dashed border-[var(--color-warning)] bg-[var(--color-warning-100)] px-5 py-3 text-sm text-[var(--color-charcoal)]">
        {t('privacyLead')}
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
