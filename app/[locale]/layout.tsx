import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { plexArabic, inter } from '../fonts';
import '../globals.css';
import { PDPLConsentBanner } from '@/components/legal/pdpl-consent';
import { PosthogProvider } from '@/components/analytics/posthog-provider';
import { createClient } from '@/lib/supabase/server';

const SUPPORTED_LOCALES = ['ar', 'en'] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const metadata: Metadata = {
  title: 'تطبيق المعارض',
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as SupportedLocale)) {
    notFound();
  }
  // Tells next-intl's server-side <Link>, redirect, etc. which locale to
  // use when generating URLs. Without this, server-rendered Links default
  // to the routing.defaultLocale (ar) on every page, including /en/*.
  setRequestLocale(locale as SupportedLocale);

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = await getMessages();

  // V3.1 — pull the authed user id (if any) so PosthogProvider can call
  // identify() right away. Anonymous visitors get a posthog-managed
  // distinct_id and remain unidentified until they sign in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang={locale} dir={dir} className={`${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-arabic text-charcoal antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {/* PostHog browser init + identify(). Self-no-ops without an API key. */}
          <PosthogProvider userId={user?.id ?? null} />
          {children}
          {/* PDPL consent banner — self-gates on flags.PDPL_CONSENT +
              localStorage. Renders only on first visit when flag is on. */}
          <PDPLConsentBanner />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
