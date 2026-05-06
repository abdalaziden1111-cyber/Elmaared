import type { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    '/ar',
    '/en',
    '/ar/for-clients',
    '/ar/for-suppliers',
    '/ar/how-it-works',
    '/ar/pricing',
    '/ar/discover',
  ];

  const base: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: p === '/ar' ? 1 : 0.7,
  }));

  // Approved supplier profiles — public
  try {
    const admin = createAdminClient();
    const { data: rowsRaw } = await admin
      .from('suppliers')
      .select('id, updated_at')
      .eq('status', 'approved')
      .limit(1000);
    const rows = (rowsRaw ?? []) as Array<{ id: string; updated_at: string }>;
    const supplierEntries: MetadataRoute.Sitemap = rows.map((s) => ({
      url: `${BASE}/ar/discover/${s.id}`,
      lastModified: new Date(s.updated_at),
      changeFrequency: 'monthly',
      priority: 0.5,
    }));
    return [...base, ...supplierEntries];
  } catch {
    return base;
  }
}
