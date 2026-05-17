import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SERVICE_LABEL_LONG as SERVICE_LABEL_AR,
  CITY_LABEL as CITY_LABEL_AR,
  CITY_LABEL_EN,
} from '@/lib/constants/labels';

// English variant lives only here for the public marketing surface.
const SERVICE_LABEL_EN: Record<string, string> = {
  booth: 'Booth Design & Build',
  gifts: 'Promotional Gifts',
  event: 'Event Management',
  printing: 'Print Materials',
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('home');
  const tDir = await getTranslations('marketing.suppliersDirectory');
  const isAr = locale === 'ar';

  // Live featured suppliers (top 4 approved by completed orders).
  // Falls back to a "coming soon" notice when the directory is still empty —
  // we deliberately never show hardcoded sample names in production.
  const admin = createAdminClient();
  const { data: supRaw } = await admin
    .from('suppliers')
    .select(
      'id, company_name, specializations, cities, total_completed_orders, years_of_experience'
    )
    .eq('status', 'approved')
    .order('total_completed_orders', { ascending: false, nullsFirst: false })
    .limit(4);
  const featuredSuppliers = (supRaw ?? []) as Array<{
    id: string;
    company_name: string;
    specializations: string[] | null;
    cities: string[] | null;
    total_completed_orders: number | null;
    years_of_experience: number | null;
  }>;

  return (
    <main>
      {/* Hero */}
      <section className="bg-gradient-to-b from-[var(--color-cream)] to-white">
        <div className="mx-auto max-w-5xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <span className="inline-block rounded-full bg-[var(--color-dune-gold-100)] px-3 py-1 text-xs font-medium text-[var(--color-midnight-green)]">
            {t('tagline')}
          </span>
          <h1 className="mt-6 text-4xl font-bold text-[var(--color-midnight-green)] sm:text-5xl md:text-6xl">
            {t('title')}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--color-stone-600)]">
            {t('heroLead')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center rounded-xl bg-[var(--color-action-blue)] px-8 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
            >
              {t('ctaPrimary')}
            </Link>
            <Link
              href="/how-it-works"
              className="inline-flex h-12 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-8 text-sm font-semibold text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
            >
              {t('ctaSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ICP tabs (3 audiences) */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: t('icpTabs.clientsTitle'),
              body: t('icpTabs.clientsBody'),
              cta: t('icpTabs.clientsCta'),
              href: '/for-clients',
              tone: 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]',
            },
            {
              title: t('icpTabs.suppliersTitle'),
              body: t('icpTabs.suppliersBody'),
              cta: t('icpTabs.suppliersCta'),
              href: '/for-suppliers',
              tone: 'bg-[var(--color-dune-gold)] text-[var(--color-midnight-green)]',
            },
            {
              title: t('icpTabs.organizersTitle'),
              body: t('icpTabs.organizersBody'),
              cta: t('icpTabs.organizersCta'),
              href: '/contact',
              tone: 'bg-white text-[var(--color-midnight-green)] border border-[var(--color-stone-300)]',
            },
          ].map((card) => (
            <div
              key={card.title}
              className={`rounded-2xl ${card.tone} p-7`}
            >
              <h2 className="text-xl font-semibold">{card.title}</h2>
              <p className="mt-3 text-sm leading-relaxed">{card.body}</p>
              <Link
                href={card.href}
                className="mt-6 inline-flex items-center text-sm font-semibold underline-offset-4 hover:underline"
              >
                {card.cta} ←
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Value props grid */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold text-[var(--color-midnight-green)]">
            {t('valueProps.title')}
          </h2>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: t('valueProps.items.verifiedTitle'), body: t('valueProps.items.verifiedBody') },
              { title: t('valueProps.items.aiTitle'), body: t('valueProps.items.aiBody') },
              { title: t('valueProps.items.escrowTitle'), body: t('valueProps.items.escrowBody') },
              { title: t('valueProps.items.panicTitle'), body: t('valueProps.items.panicBody') },
              { title: t('valueProps.items.feesTitle'), body: t('valueProps.items.feesBody') },
              { title: t('valueProps.items.speedTitle'), body: t('valueProps.items.speedBody') },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-[var(--color-cream)] p-5"
              >
                <h3 className="font-semibold text-[var(--color-midnight-green)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-stone-600)]">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured suppliers */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
              {t('featuredSuppliers.title')}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-stone-600)]">
              {t('featuredSuppliers.subtitle')}
            </p>
          </div>
          {featuredSuppliers.length > 0 ? (
            <Link
              href="/discover"
              className="text-sm font-medium text-[var(--color-action-blue)] hover:underline"
            >
              {t('featuredSuppliers.ctaAll')} ←
            </Link>
          ) : null}
        </div>
        {featuredSuppliers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-10 text-center text-sm text-[var(--color-stone-600)]">
            {isAr
              ? 'قريباً — نقوم باعتماد دفعتنا الأولى من الموردين. سجّل لتُخطر فور افتتاح الدليل.'
              : 'Coming soon — we’re approving our first batch of suppliers. Sign up to be notified when the directory opens.'}
          </p>
        ) : (
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredSuppliers.map((s) => {
              const name = s.company_name;
              const services = (s.specializations ?? [])
                .map((sp) =>
                  isAr
                    ? SERVICE_LABEL_AR[sp] ?? sp
                    : SERVICE_LABEL_EN[sp] ?? sp
                )
                .slice(0, 2)
                .join(' · ');
              const citiesText = (s.cities ?? [])
                .map((c) =>
                  isAr ? CITY_LABEL_AR[c] ?? c : CITY_LABEL_EN[c] ?? c
                )
                .slice(0, 3)
                .join(' · ');
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-base font-semibold text-[var(--color-midnight-green)]">
                    {name.slice(0, 1)}
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--color-midnight-green)]">
                    {name}
                  </h3>
                  <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                    {services}
                    {services && citiesText ? ' · ' : ''}
                    {citiesText}
                  </p>
                  {s.total_completed_orders || s.years_of_experience ? (
                    <p className="mt-3 text-xs text-[var(--color-stone-600)]">
                      {s.total_completed_orders
                        ? tDir('cardOrders', {
                            count: s.total_completed_orders,
                          })
                        : ''}
                      {s.total_completed_orders && s.years_of_experience
                        ? ' · '
                        : ''}
                      {s.years_of_experience
                        ? tDir('cardYears', { years: s.years_of_experience })
                        : ''}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-[var(--color-midnight-green)] py-20 text-[var(--color-cream)]">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-3xl font-semibold">{t('testimonials.title')}</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              { name: t('testimonials.t1Name'), role: t('testimonials.t1Role'), body: t('testimonials.t1Body') },
              { name: t('testimonials.t2Name'), role: t('testimonials.t2Role'), body: t('testimonials.t2Body') },
              { name: t('testimonials.t3Name'), role: t('testimonials.t3Role'), body: t('testimonials.t3Body') },
            ].map((tm) => (
              <figure
                key={tm.name}
                className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10 backdrop-blur"
              >
                <blockquote className="text-sm leading-relaxed">"{tm.body}"</blockquote>
                <figcaption className="mt-4 text-xs text-[var(--color-dune-gold)]">
                  <span className="font-semibold">{tm.name}</span>
                  <span className="text-[var(--color-cream)]/80"> · {tm.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
          {t('ctaSection.title')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[var(--color-stone-600)]">
          {t('ctaSection.body')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex h-12 items-center rounded-xl bg-[var(--color-action-blue)] px-8 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
          >
            {t('ctaSection.primary')}
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-12 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-8 text-sm font-semibold text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
          >
            {t('ctaSection.secondary')}
          </Link>
        </div>
      </section>
    </main>
  );
}
