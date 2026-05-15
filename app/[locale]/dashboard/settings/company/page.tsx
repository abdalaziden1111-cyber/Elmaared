import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { CompanyForm } from './company-form';

export default async function ClientCompanySettingsPage() {
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  const { data: companyRaw } = await admin
    .from('companies')
    .select('name, legal_name, cr_number, vat_number, size, industry, city, address')
    .eq('owner_id', user.id)
    .single();
  const company = companyRaw as {
    name: string;
    legal_name: string | null;
    cr_number: string;
    vat_number: string | null;
    size: 'startup' | 'mid' | 'enterprise';
    industry: string | null;
    city: string;
    address: string | null;
  } | null;

  if (!company) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          بيانات الشركة
        </h1>
        <p className="mt-4 text-sm text-[var(--color-stone-600)]">
          لم نجد سجل شركة مرتبط بحسابك. تواصل مع الدعم.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        بيانات الشركة
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        إدارة معلومات الشركة، السجل التجاري، والرقم الضريبي.{' '}
        <Link
          href="/dashboard/settings/profile"
          className="text-[var(--color-action-blue)] hover:underline"
        >
          البيانات الشخصية ←
        </Link>
      </p>

      <CompanyForm
        initial={{
          companyName: company.name,
          legalName: company.legal_name ?? '',
          crNumber: company.cr_number,
          vatNumber: company.vat_number ?? '',
          size: company.size,
          industry: company.industry ?? '',
          city: company.city,
          address: company.address ?? '',
        }}
      />
    </div>
  );
}
