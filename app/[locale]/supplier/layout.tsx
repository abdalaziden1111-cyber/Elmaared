import { requireRole } from '@/lib/auth/require-role';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();
  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select('status')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as { status: string } | null;
  const isApproved = supplier?.status === 'approved';

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-white p-6 lg:flex">
        <div className="text-lg font-semibold text-[var(--color-midnight-green)]">
          تطبيق المعارض
        </div>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          {isApproved ? (
            <>
              <Link href="/supplier/rfqs" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
                الطلبات المتاحة
              </Link>
              <Link href="/supplier/proposals" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
                عروضي
              </Link>
              <Link href="/supplier/projects" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
                مشاريعي
              </Link>
              <Link href="/supplier/earnings" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
                أرباحي
              </Link>
              <Link href="/supplier/profile/portfolio" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
                ملفي
              </Link>
            </>
          ) : (
            <span className="rounded-lg bg-[var(--color-warning-100)] px-3 py-2 text-xs text-[var(--color-warning)]">
              حسابك قيد المراجعة من Admin
            </span>
          )}
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)]"
          >
            تسجيل الخروج
          </button>
        </form>
      </aside>
      <main className="flex-1 bg-[var(--color-cream)] p-6 lg:p-10">{children}</main>
    </div>
  );
}
