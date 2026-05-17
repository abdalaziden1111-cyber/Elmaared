import { requireRole } from '@/lib/auth/require-role';
import { logoutAction } from '@/app/actions/auth';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { HeaderBar } from '@/components/header/header-bar';

const CLIENT_NAV: { href: string; label: string }[] = [
  { href: '/dashboard', label: 'لوحة التحكم' },
  { href: '/dashboard/rfqs', label: 'طلباتي' },
  { href: '/discover', label: 'استكشف الموردين' },
  { href: '/dashboard/notifications', label: 'الإشعارات' },
  { href: '/dashboard/settings/profile', label: 'الإعدادات الشخصية' },
  { href: '/dashboard/settings/company', label: 'بيانات الشركة' },
];

function NavLinks({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  return (
    <SidebarNav links={CLIENT_NAV} tone={tone} ariaLabel="القائمة الرئيسية" />
  );
}

function LogoutForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const cls =
    tone === 'dark'
      ? 'w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-cream)]/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]'
      : 'w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]';
  return (
    <form action={logoutAction} className="mt-6">
      <button type="submit" className={cls}>
        تسجيل الخروج
      </button>
    </form>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(['client']);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MobileMenu title="تطبيق المعارض">
        <NavLinks />
        <LogoutForm />
      </MobileMenu>
      <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-white p-6 lg:flex">
        <div className="text-lg font-semibold text-[var(--color-midnight-green)]">
          تطبيق المعارض
        </div>
        <div className="mt-8 flex-1">
          <NavLinks />
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
