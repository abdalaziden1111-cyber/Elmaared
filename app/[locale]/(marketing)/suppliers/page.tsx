import { redirect } from '@/lib/i18n/routing';

// The old marketing /suppliers route used a hardcoded sample directory. It has
// been replaced by the live /discover directory (backed by Supabase). We keep
// this redirect so any external links / SEO indexes still resolve correctly.
export default async function SuppliersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/discover', locale: locale as 'ar' | 'en' });
}
