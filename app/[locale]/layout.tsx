import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { plexArabic, inter } from '../fonts';
import '../globals.css';

const SUPPORTED_LOCALES = ['ar', 'en'] as const;

export const metadata: Metadata = {
  title: 'تطبيق المعارض',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!SUPPORTED_LOCALES.includes(locale as 'ar' | 'en')) {
    notFound();
  }
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir} className={`${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-arabic text-charcoal antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
