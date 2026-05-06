import { requireRole } from '@/lib/auth/require-role';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['client']);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-white p-6 lg:flex">
        <div className="text-lg font-semibold text-[var(--color-midnight-green)]">
          تطبيق المعارض
        </div>
        <nav className="mt-8 flex flex-col gap-1 text-sm">
          <Link href="/dashboard" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
            لوحة التحكم
          </Link>
          <Link href="/dashboard/rfqs" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
            طلباتي
          </Link>
          <Link href="/dashboard/discover" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
            استكشف الموردين
          </Link>
          <Link href="/dashboard/notifications" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
            الإشعارات
          </Link>
          <Link href="/dashboard/settings/profile" className="rounded-lg px-3 py-2 hover:bg-[var(--color-stone-100)]">
            الإعدادات
          </Link>
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
