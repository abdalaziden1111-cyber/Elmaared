import { setRequestLocale, getTranslations } from 'next-intl/server';
import '@/components/marketing/landing/landing.css';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  SERVICE_LABEL_LONG as SERVICE_LABEL_AR,
  CITY_LABEL as CITY_LABEL_AR,
  CITY_LABEL_EN,
} from '@/lib/constants/labels';
import { AnnouncementBar } from '@/components/marketing/landing/announcement-bar';
import { LandingNav } from '@/components/marketing/landing/landing-nav';
import { Hero } from '@/components/marketing/landing/hero';
import { StatsStrip } from '@/components/marketing/landing/stats-strip';
import { ProductDemo } from '@/components/marketing/landing/product-demo';
import { Journey } from '@/components/marketing/landing/journey';
import { BentoValueProps } from '@/components/marketing/landing/bento';
import { Industries } from '@/components/marketing/landing/industries';
import { Suppliers } from '@/components/marketing/landing/suppliers';
import { AnalyticsPreview } from '@/components/marketing/landing/analytics';
import { Testimonials } from '@/components/marketing/landing/testimonials';
import { Pricing } from '@/components/marketing/landing/pricing';
import { Faq } from '@/components/marketing/landing/faq';
import { FinalCta } from '@/components/marketing/landing/final-cta';
import { LandingFooter } from '@/components/marketing/landing/landing-footer';
import { RevealObserver } from '@/components/marketing/landing/reveal-observer';

const SERVICE_LABEL_EN: Record<string, string> = {
  booth: 'Booth design',
  gifts: 'Promo gifts',
  event: 'Event production',
  printing: 'Print collateral',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const t = await getTranslations('landing.meta');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LandingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  const isAr = locale === 'ar';
  const tSup = await getTranslations('landing.suppliers');

  // Live featured suppliers — same query as the previous homepage.
  // Falls back to four named cards inside the Suppliers component when
  // the directory is still empty.
  const admin = createAdminClient();
  const { data: supRaw } = await admin
    .from('suppliers')
    .select(
      'id, company_name, specializations, cities, total_completed_orders, years_of_experience, average_rating'
    )
    .eq('status', 'approved')
    .order('total_completed_orders', { ascending: false, nullsFirst: false })
    .limit(4);

  const suppliers = (supRaw ?? []).map((s) => {
    const services = (s.specializations ?? [])
      .map((sp: string) =>
        isAr
          ? SERVICE_LABEL_AR[sp as keyof typeof SERVICE_LABEL_AR] ?? sp
          : SERVICE_LABEL_EN[sp] ?? sp
      )
      .slice(0, 2)
      .join(' · ');
    const cities = (s.cities ?? [])
      .map((c: string) =>
        isAr
          ? CITY_LABEL_AR[c as keyof typeof CITY_LABEL_AR] ?? c
          : CITY_LABEL_EN[c as keyof typeof CITY_LABEL_EN] ?? c
      )
      .slice(0, 2)
      .join(' · ');
    const ratingRaw = s.average_rating;
    return {
      name: s.company_name,
      sub: services || tSup('fallbackCard1Cat'),
      cities,
      deals: s.total_completed_orders,
      onTimePct: 95,
      years: s.years_of_experience,
      rating: typeof ratingRaw === 'number' ? ratingRaw : 4.7,
      mono: s.company_name.slice(0, 1).toUpperCase(),
    };
  });

  return (
    <div className="landing-root">
      <RevealObserver />
      <AnnouncementBar locale={locale as 'ar' | 'en'} />
      <LandingNav />
      <main>
        <Hero locale={locale as 'ar' | 'en'} />
        <StatsStrip />
        <ProductDemo />
        <Journey locale={locale as 'ar' | 'en'} />
        <BentoValueProps />
        <Industries locale={locale as 'ar' | 'en'} />
        <Suppliers locale={locale as 'ar' | 'en'} suppliers={suppliers} />
        <AnalyticsPreview />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta locale={locale as 'ar' | 'en'} />
      </main>
      <LandingFooter locale={locale as 'ar' | 'en'} />
    </div>
  );
}
