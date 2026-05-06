import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

export default async function SupplierHomePage() {
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();
  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select('status')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as { status: string } | null;

  if (supplier?.status === 'approved') {
    redirect('/supplier/rfqs');
  }
  redirect('/supplier/pending');
}
