import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { ProfileSettingsForms } from './profile-form';

export default async function ClientProfileSettingsPage() {
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  const { data: profRaw } = await admin
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single();
  const profile = profRaw as { full_name: string | null; phone: string | null } | null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        إعدادات الحساب
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        إدارة بياناتك الشخصية وكلمة المرور.{' '}
        <Link
          href="/dashboard/settings/company"
          className="text-[var(--color-action-blue)] hover:underline"
        >
          بيانات الشركة ←
        </Link>
      </p>

      <ProfileSettingsForms
        initial={{
          fullName: profile?.full_name ?? '',
          phone: profile?.phone ?? '',
          email: user.email ?? '',
        }}
      />
    </div>
  );
}
