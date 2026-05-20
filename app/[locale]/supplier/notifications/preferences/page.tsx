import { requireRole } from '@/lib/auth/require-role';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getPreferencesAction } from '@/app/actions/notification-preferences';
import { PreferencesForm } from '@/app/[locale]/dashboard/notifications/preferences/preferences-form';

// Phase W4.2 — Supplier-side mirror of the client preferences page.
// Reuses the same PreferencesForm island + getPreferencesAction
// (action is role-agnostic; the row keys off auth.uid()).

export default async function SupplierNotificationPreferencesPage() {
  await requireRole(['supplier']);
  const result = await getPreferencesAction();
  const initial = result.ok
    ? result.data!
    : {
        emailDisabledTypes: [],
        inAppDisabledTypes: [],
        quietHoursStart: null,
        quietHoursEnd: null,
        digestFrequency: 'off' as const,
        soundEnabled: true,
      };

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs
        items={[
          { href: '/supplier/dashboard', label: 'لوحة الأداء' },
          { href: '/supplier/notifications', label: 'الإشعارات' },
          { label: 'التفضيلات' },
        ]}
      />
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          تفضيلات الإشعارات
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          تحكّم في ما يصلك من تنبيهات حول الطلبات والعروض والمحادثات.
        </p>
      </header>
      <PreferencesForm initial={initial} />
    </div>
  );
}
