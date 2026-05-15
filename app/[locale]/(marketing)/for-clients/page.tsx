import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

export default async function ForClientsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.forClients');

  const scenarios = [
    {
      key: 'booth',
      title: t('scenarios.boothTitle'),
      pain: t('scenarios.boothPain'),
      solution: t('scenarios.boothSolution'),
      result: t('scenarios.boothResult'),
    },
    {
      key: 'gifts',
      title: t('scenarios.giftsTitle'),
      pain: t('scenarios.giftsPain'),
      solution: t('scenarios.giftsSolution'),
      result: t('scenarios.giftsResult'),
    },
    {
      key: 'event',
      title: t('scenarios.eventTitle'),
      pain: t('scenarios.eventPain'),
      solution: t('scenarios.eventSolution'),
      result: t('scenarios.eventResult'),
    },
  ];

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="text-center text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--color-stone-600)]">
        {t('subtitle')}
      </p>

      {/* pain → solution → result per scenario */}
      <section className="mt-16 space-y-10">
        {scenarios.map((s) => (
          <article
            key={s.key}
            className="overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white"
          >
            <header className="border-b border-[var(--color-stone-300)] bg-[var(--color-cream)] px-6 py-4">
              <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
                {s.title}
              </h2>
            </header>
            <div className="grid divide-y divide-[var(--color-stone-300)] md:grid-cols-3 md:divide-x md:divide-y-0 rtl:md:divide-x-reverse">
              <Cell label={t('tabs.painTitle')} body={s.pain} tone="pain" />
              <Cell label={t('tabs.solutionTitle')} body={s.solution} tone="solution" />
              <Cell label={t('tabs.resultTitle')} body={s.result} tone="result" />
            </div>
          </article>
        ))}
      </section>

      {/* Feature bullets */}
      <section className="mt-16">
        <ul className="grid gap-5 sm:grid-cols-2">
          <Feature title={t('features.feeTitle')} body={t('features.feeBody')} />
          <Feature title={t('features.escrowTitle')} body={t('features.escrowBody')} />
          <Feature title={t('features.verifiedTitle')} body={t('features.verifiedBody')} />
          <Feature title={t('features.aiTitle')} body={t('features.aiBody')} />
        </ul>
      </section>

      <div className="mt-16 flex justify-center">
        <Link
          href="/signup/client/account"
          className="inline-flex h-12 items-center rounded-xl bg-[var(--color-action-blue)] px-8 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          {t('cta')}
        </Link>
      </div>
    </main>
  );
}

function Cell({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: 'pain' | 'solution' | 'result';
}) {
  const toneMap = {
    pain: 'text-[var(--color-danger)]',
    solution: 'text-[var(--color-action-blue)]',
    result: 'text-[var(--color-success)]',
  } as const;
  return (
    <div className="p-6">
      <span className={`text-xs font-semibold uppercase tracking-wider ${toneMap[tone]}`}>
        {label}
      </span>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-charcoal)]">{body}</p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
      <h3 className="text-base font-semibold text-[var(--color-midnight-green)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">{body}</p>
    </li>
  );
}
