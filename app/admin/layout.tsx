import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { requireRole } from '@/lib/auth/require-role';
import { logoutAction } from '@/app/actions/auth';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { HeaderBar } from '@/components/header/header-bar';
import { plexArabic, inter } from '@/app/fonts';
import '@/app/globals.css';

function NavLinks() {
  const cls =
    'rounded-lg px-3 py-2 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]';
  return (
    <nav
      className="flex flex-col gap-1 text-sm text-[var(--color-cream)]/80"
      aria-label="قائمة لوحة Admin"
    >
      <Link href="/admin" className={cls}>
        نظرة عامة
      </Link>
      <Link href="/admin/suppliers/pending" className={cls}>
        موردون قيد المراجعة
      </Link>
      <Link href="/admin/rfqs" className={cls}>
        الطلبات
      </Link>
      <Link href="/admin/chats" className={cls}>
        المحادثات
      </Link>
      <Link href="/admin/escrow/pending-deposits" className={cls}>
        الإيداعات المعلّقة
      </Link>
      <Link href="/admin/escrow/pending-releases" className={cls}>
        تحرير دفعات الموردين
      </Link>
      <Link href="/admin/disputes" className={cls}>
        النزاعات
      </Link>
    </nav>
  );
}

function LogoutForm() {
  return (
    <form action={logoutAction} className="mt-6">
      <button
        type="submit"
        className="w-full rounded-lg px-3 py-2 text-start text-sm text-[var(--color-cream)]/70 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        تسجيل الخروج
      </button>
    </form>
  );
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireRole(['admin']);
  // Admin is Arabic-only by design — load the AR message bundle and pin
  // the intl provider so that next-intl-aware children (NotificationBell,
  // MobileMenu, etc.) work without a locale-prefixed URL.
  const messages = await getMessages({ locale: 'ar' });

  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream font-arabic text-charcoal antialiased">
        <NextIntlClientProvider locale="ar" messages={messages}>
          <div className="flex min-h-screen flex-col lg:flex-row">
            <MobileMenu title="Admin · تطبيق المعارض" variant="dark">
              <NavLinks />
              <LogoutForm />
            </MobileMenu>
            <aside className="hidden w-64 flex-col border-e border-[var(--color-stone-300)] bg-[var(--color-midnight-green)] p-6 lg:flex">
              <div className="text-lg font-semibold text-[var(--color-cream)]">
                Admin · تطبيق المعارض
              </div>
              <div className="mt-8 flex-1">
                <NavLinks />
              </div>
              <LogoutForm />
            </aside>
            <div className="flex flex-1 flex-col">
              <HeaderBar userId={user.id} variant="dark" />
              <main className="flex-1 bg-[var(--color-cream)] p-4 sm:p-6 lg:p-10">
                {children}
              </main>
            </div>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
