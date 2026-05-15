import { getTranslations, setRequestLocale } from 'next-intl/server';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('marketing.contact');

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-center text-4xl font-semibold text-[var(--color-midnight-green)] sm:text-5xl">
        {t('title')}
      </h1>
      <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-[var(--color-stone-600)]">
        {t('subtitle')}
      </p>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <aside className="space-y-6">
          <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-midnight-green)]">
              {t('emailTitle')}
            </h2>
            <a
              href={`mailto:${t('emailAddress')}`}
              className="mt-2 inline-block text-lg font-semibold text-[var(--color-action-blue)] hover:underline"
            >
              {t('emailAddress')}
            </a>
          </div>
          <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-midnight-green)]">
              {t('hoursTitle')}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-charcoal)]">{t('hoursBody')}</p>
          </div>
        </aside>

        <form
          className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-6"
          action={`mailto:${t('emailAddress')}`}
          method="post"
          encType="text/plain"
        >
          <h2 className="text-xl font-semibold text-[var(--color-midnight-green)]">
            {t('formTitle')}
          </h2>

          <label className="mt-5 block text-xs font-medium text-[var(--color-stone-600)]">
            {t('formName')}
            <input
              type="text"
              name="name"
              required
              className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-[var(--color-stone-600)]">
            {t('formEmail')}
            <input
              type="email"
              name="email"
              required
              className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-[var(--color-stone-600)]">
            {t('formSubject')}
            <input
              type="text"
              name="subject"
              className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
            />
          </label>

          <label className="mt-4 block text-xs font-medium text-[var(--color-stone-600)]">
            {t('formMessage')}
            <textarea
              name="message"
              required
              rows={5}
              className="mt-1 block w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
            />
          </label>

          <button
            type="submit"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
          >
            {t('formSubmit')}
          </button>

          <p className="mt-4 text-xs text-[var(--color-stone-600)]">{t('formNotice')}</p>
        </form>
      </div>
    </main>
  );
}
