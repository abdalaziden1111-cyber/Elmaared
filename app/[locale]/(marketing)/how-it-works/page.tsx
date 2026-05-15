import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function HowItWorksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.howItWorks');

  const steps = [
    { n: 1, title: t('step1Title'), body: t('step1Body') },
    { n: 2, title: t('step2Title'), body: t('step2Body') },
    { n: 3, title: t('step3Title'), body: t('step3Body') },
    { n: 4, title: t('step4Title'), body: t('step4Body') },
    { n: 5, title: t('step5Title'), body: t('step5Body') },
    { n: 6, title: t('step6Title'), body: t('step6Body') },
    { n: 7, title: t('step7Title'), body: t('step7Body') },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold text-[var(--color-midnight-green)]">
        {t('title')}
      </h1>
      <p className="mt-3 text-[var(--color-stone-600)]">{t('videoCaption')}</p>

      {/* Video slot — placeholder until real video is recorded */}
      <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-midnight-green-100)] text-sm text-[var(--color-midnight-green)]">
        <span>▶ {t('videoPlaceholder')}</span>
      </div>

      <ol className="mt-10 grid gap-6">
        {steps.map((s) => (
          <li
            key={s.n}
            className="flex gap-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-midnight-green)] text-sm font-semibold text-[var(--color-cream)]">
              {s.n}
            </span>
            <div>
              <h2 className="text-base font-semibold">{s.title}</h2>
              <p className="mt-1 text-sm text-[var(--color-stone-600)]">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
