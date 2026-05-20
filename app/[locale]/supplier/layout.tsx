import { requireRole } from '@/lib/auth/require-role';
import { logoutAction } from '@/app/actions/auth';
import { createClient } from '@/lib/supabase/server';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { HeaderBar } from '@/components/header/header-bar';

const SUPPLIER_NAV: { href: string; label: string }[] = [
  { href: '/supplier/dashboard', label: 'لوحة الأداء' },
  { href: '/supplier/rfqs', label: 'الطلبات المتاحة' },
  { href: '/supplier/proposals', label: 'عروضي' },
  { href: '/supplier/projects', label: 'مشاريعي' },
  { href: '/supplier/chats', label: 'المحادثات' },
  { href: '/supplier/earnings', label: 'أرباحي' },
  { href: '/supplier/notifications', label: 'الإشعارات' },
  { href: '/supplier/profile/portfolio', label: 'ملفي' },
];

function NavLinks({ isApproved }: { isApproved: boolean }) {
  if (!isApproved) {
    return (
      <span className="rounded-lg bg-[var(--color-warning-100)] px-3 py-2 text-xs text-[var(--color-warning)]">
        حسابك قيد المراجعة من Admin
      </span>
    );
  }
  return <SidebarNav links={SUPPLIER_NAV} ariaLabel="القائمة الرئيسية" />;
}

function LogoutForm() {
  return (
    <form action={logoutAction} className="mt-6">
      <button
        type="submit"
        className="w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        تسجيل الخروج
      </button>
    </form>
  );
}

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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileMenu title="تطبيق المعارض">
        <NavLinks isApproved={isApproved} />
        <LogoutForm />
      </MobileMenu>
      <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-white p-6 lg:flex">
        <div className="text-lg font-semibold text-[var(--color-midnight-green)]">
          تطبيق المعارض
        </div>
        <div className="mt-8 flex-1">
          <NavLinks isApproved={isApproved} />
        </div>
        <LogoutForm />
      </aside>
      <div className="flex flex-1 flex-col">
        <HeaderBar userId={user.id} />
        <main className="flex-1 bg-[var(--color-cream)] p-4 sm:p-6 lg:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
