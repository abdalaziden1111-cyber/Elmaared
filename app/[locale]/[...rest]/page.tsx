import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

// Catch-all under [locale] for any unmatched path under /ar/* or /en/*.
// Triggers the locale-aware not-found.tsx (RTL/LTR-correct, translated copy).
export default async function CatchAllNotFound({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as 'ar' | 'en');
  notFound();
}
