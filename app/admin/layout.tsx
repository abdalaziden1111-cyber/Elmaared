import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { requireRole } from '@/lib/auth/require-role';
import { logoutAction } from '@/app/actions/auth';
import { MobileMenu } from '@/components/layout/mobile-menu';
import { SidebarNav, type SidebarNavGroup } from '@/components/layout/sidebar-nav';
import { HeaderBar } from '@/components/header/header-bar';
import { plexArabic, inter } from '@/app/fonts';
import '@/app/globals.css';

// Admin should never be indexed by search engines.
export const metadata: Metadata = {
  title: 'Admin · تطبيق المعارض',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

const NAV_GROUPS: SidebarNavGroup[] = [
  {
    title: 'عام',
    links: [
      { href: '/admin', label: 'نظرة عامة' },
      { href: '/admin/analytics', label: 'التحليلات' },
    ],
  },
  {
    title: 'المستخدمون',
    links: [
      { href: '/admin/users', label: 'كل المستخدمين' },
      { href: '/admin/leads', label: 'اللقاءات (Leads)' },
    ],
  },
  {
    title: 'الموردون',
    links: [
      { href: '/admin/suppliers', label: 'كل الموردين' },
      { href: '/admin/suppliers/pending', label: 'موردون قيد المراجعة' },
    ],
  },
  {
    title: 'العمليات',
    links: [
      { href: '/admin/rfqs', label: 'الطلبات' },
      { href: '/admin/agreements/pending', label: 'الاتفاقيات المعلّقة' },
      { href: '/admin/chats', label: 'المحادثات' },
    ],
  },
  {
    title: 'الضمان والمدفوعات',
    links: [
      { href: '/admin/escrow/pending-deposits', label: 'الإيداعات المعلّقة' },
      { href: '/admin/escrow/pending-releases', label: 'تحرير دفعات الموردين' },
      { href: '/admin/escrow/transactions', label: 'دفتر الضمان' },
    ],
  },
  {
    title: 'النزاعات والتصعيدات',
    links: [
      { href: '/admin/panics', label: '🚨 التصعيدات' },
      { href: '/admin/disputes', label: 'النزاعات' },
    ],
  },
  {
    title: 'المحتوى',
    links: [{ href: '/admin/blog', label: 'المدوّنة' }],
  },
  {
    title: 'النظام',
    links: [
      { href: '/admin/activity', label: 'سجل النشاط' },
      { href: '/admin/admins', label: 'فريق Admin' },
      { href: '/admin/settings', label: 'إعدادات المنصة' },
    ],
  },
];

function NavLinks() {
  return (
    <SidebarNav
      groups={NAV_GROUPS}
      tone="dark"
      ariaLabel="قائمة لوحة Admin"
      unlocalized
    />
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
    <html
      lang="ar"
      dir="rtl"
      className={`${plexArabic.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      {/* B-005 mirror — same browser-extension hydration noise mitigation
          as in app/[locale]/layout.tsx. Silences only the body/html-level
          mismatch caused by extensions; component-level hydration bugs
          still surface. */}
      <body
        className="min-h-screen bg-cream font-arabic text-charcoal antialiased"
        suppressHydrationWarning
      >
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
