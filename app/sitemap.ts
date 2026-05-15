import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import { locales } from '@/lib/i18n/config';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa';

const STATIC_SUFFIXES = [
  '', // root locale
  '/for-clients',
  '/for-suppliers',
  '/how-it-works',
  '/pricing',
  '/discover',
  '/suppliers',
  '/exhibitions',
  '/blog',
  '/about',
  '/contact',
  '/legal/terms',
  '/legal/privacy',
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Emit both /ar and /en variants for every public page so search engines
  // index the localized versions independently.
  const base: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    STATIC_SUFFIXES.map((suffix) => {
      const path = `/${locale}${suffix}`;
      return {
        url: `${BASE}${path}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: suffix === '' ? 1 : 0.7,
      };
    })
  );

  // Approved supplier profiles — public. Indexed under each locale.
  try {
    const admin = createAdminClient();
    const { data: rowsRaw } = await admin
      .from('suppliers')
      .select('id, updated_at')
      .eq('status', 'approved')
      .limit(1000);
    const rows = (rowsRaw ?? []) as Array<{ id: string; updated_at: string }>;
    const supplierEntries: MetadataRoute.Sitemap = rows.flatMap((s) =>
      locales.map((locale) => ({
        url: `${BASE}/${locale}/discover/${s.id}`,
        lastModified: new Date(s.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.5,
      }))
    );
    return [...base, ...supplierEntries];
  } catch {
    return base;
  }
}
