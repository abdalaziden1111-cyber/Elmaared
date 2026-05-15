import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.about');

  const values = [
    { title: t('value1Title'), body: t('value1Body') },
    { title: t('value2Title'), body: t('value2Body') },
    { title: t('value3Title'), body: t('value3Body') },
    { title: t('value4Title'), body: t('value4Body') },
  ];

  const team = [
    { name: t('team1Name'), role: t('team1Role'), bio: t('team1Bio') },
    { name: t('team2Name'), role: t('team2Role'), bio: t('team2Bio') },
    { name: t('team3Name'), role: t('team3Role'), bio: t('team3Bio') },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--color-stone-600)]">
        {t('subtitle')}
      </p>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            {t('missionTitle')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]">
            {t('missionBody')}
          </p>
        </article>
        <article className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            {t('visionTitle')}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-charcoal)]">
            {t('visionBody')}
          </p>
        </article>
      </section>

      <section className="mt-16">
        <h2 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
          {t('valuesTitle')}
        </h2>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {values.map((v) => (
            <li
              key={v.title}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <h3 className="font-semibold text-[var(--color-midnight-green)]">{v.title}</h3>
              <p className="mt-2 text-sm text-[var(--color-stone-600)]">{v.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
          {t('teamTitle')}
        </h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          {team.map((m) => (
            <li
              key={m.name}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <div className="size-16 rounded-full bg-[var(--color-midnight-green-100)]" aria-hidden />
              <h3 className="mt-4 font-semibold text-[var(--color-midnight-green)]">{m.name}</h3>
              <p className="text-xs text-[var(--color-action-blue)]">{m.role}</p>
              <p className="mt-2 text-sm text-[var(--color-stone-600)]">{m.bio}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
