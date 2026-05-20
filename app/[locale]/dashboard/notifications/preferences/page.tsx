import { requireRole } from '@/lib/auth/require-role';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { getPreferencesAction } from '@/app/actions/notification-preferences';
import { PreferencesForm } from './preferences-form';

export default async function NotificationPreferencesPage() {
  await requireRole(['client']);
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
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/notifications', label: 'الإشعارات' },
          { label: 'التفضيلات' },
        ]}
      />
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          تفضيلات الإشعارات
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          تحكّم في ما يصلك من إشعارات داخل التطبيق وعبر البريد، ومتى يصلك.
        </p>
      </header>
      <PreferencesForm initial={initial} />
    </div>
  );
}
