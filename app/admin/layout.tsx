import { requireRole } from '@/lib/auth/require-role';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['admin']);

  return (
    <div className="flex min-h-screen" dir="rtl">
      <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-[var(--color-midnight-green)] p-6 lg:flex">
        <div className="text-lg font-semibold text-[var(--color-cream)]">
          Admin · تطبيق المعارض
        </div>
        <nav className="mt-8 flex flex-col gap-1 text-sm text-[var(--color-cream)]/80">
          <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-white/10">
            نظرة عامة
          </Link>
          <Link href="/admin/suppliers/pending" className="rounded-lg px-3 py-2 hover:bg-white/10">
            موردون قيد المراجعة
          </Link>
          <Link href="/admin/rfqs" className="rounded-lg px-3 py-2 hover:bg-white/10">
            الطلبات
          </Link>
          <Link href="/admin/chats" className="rounded-lg px-3 py-2 hover:bg-white/10">
            المحادثات
          </Link>
          <Link href="/admin/escrow/pending-deposits" className="rounded-lg px-3 py-2 hover:bg-white/10">
            الإيداعات المعلّقة
          </Link>
          <Link href="/admin/disputes" className="rounded-lg px-3 py-2 hover:bg-white/10">
            النزاعات
          </Link>
        </nav>
        <form action={logoutAction} className="mt-auto">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-cream)]/70 hover:bg-white/10"
          >
            تسجيل الخروج
          </button>
        </form>
      </aside>
      <main className="flex-1 bg-[var(--color-cream)] p-6 lg:p-10">{children}</main>
    </div>
  );
}
