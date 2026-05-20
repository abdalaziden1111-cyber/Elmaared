import { redirect } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

export default async function SupplierHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();
  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select('status')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as { status: string } | null;

  if (supplier?.status === 'approved') {
    // V6.1 — approved suppliers land on the KPI dashboard instead of
    // the raw RFQs list. The dashboard exposes quick-actions back to RFQs.
    redirect({ href: '/supplier/dashboard', locale: locale as 'ar' | 'en' });
  }
  redirect({ href: '/supplier/pending', locale: locale as 'ar' | 'en' });
}
