import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { CITIES } from '@/lib/constants/cities';
import { getSignedSupplierDocUrl } from '@/lib/storage/supplier-docs';
import { EditProfileForm } from './edit-profile-form';
import { UploadDoc } from './upload-doc';

interface SupplierEditRow {
  id: string;
  company_name: string;
  legal_name: string | null;
  vat_number: string | null;
  status: string;
  specializations: string[] | null;
  cities: string[] | null;
  bio: string | null;
  website: string | null;
  team_size: number | null;
  years_of_experience: number | null;
  min_order_value: number | null;
  bank_name: string | null;
  iban: string | null;
  account_holder_name: string | null;
  cr_document_url: string | null;
  vat_document_url: string | null;
  portfolio_pdf_url: string | null;
}

export default async function SupplierProfileEditPage() {
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, legal_name, vat_number, status, specializations, cities, bio, website, team_size, years_of_experience, min_order_value, bank_name, iban, account_holder_name, cr_document_url, vat_document_url, portfolio_pdf_url'
    )
    .eq('owner_id', user.id)
    .single();

  const s = supplierRaw as SupplierEditRow | null;
  if (!s) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          تعديل الملف
        </h1>
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لم نجد ملف المورد الخاص بك.
        </p>
      </div>
    );
  }

  // Mint signed URLs in parallel for each doc field that's set.
  const [crUrl, vatUrl, portfolioUrl] = await Promise.all([
    getSignedSupplierDocUrl(s.cr_document_url),
    getSignedSupplierDocUrl(s.vat_document_url),
    getSignedSupplierDocUrl(s.portfolio_pdf_url),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            تعديل الملف
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            عدّل بياناتك. تغيير المعلومات البنكية سيرسل ملفك لمراجعة Admin مرة أخرى.
          </p>
        </div>
        <Link
          href="/supplier/profile/portfolio"
          className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          ← العودة للعرض
        </Link>
      </div>

      <EditProfileForm
        initial={{
          companyName: s.company_name,
          legalName: s.legal_name ?? '',
          vatNumber: s.vat_number ?? '',
          bio: s.bio ?? '',
          website: s.website ?? '',
          teamSize: s.team_size ?? null,
          yearsOfExperience: s.years_of_experience ?? null,
          minOrderValue: s.min_order_value ?? null,
          specializations: Array.isArray(s.specializations) ? s.specializations : [],
          cities: Array.isArray(s.cities) ? s.cities : [],
          bankName: s.bank_name ?? '',
          iban: s.iban ?? '',
          accountHolderName: s.account_holder_name ?? '',
        }}
        cityOptions={CITIES.map((c) => ({ value: c.value, label: c.labelAr }))}
      />

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المستندات
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          الملفات تُخزَّن بشكل خاص ولا تظهر إلا لك ولـ Admin.
        </p>
        <div className="mt-4 grid gap-3">
          <UploadDoc
            field="cr"
            label="السجل التجاري"
            helper="صورة من السجل التجاري ساري المفعول."
            currentUrl={crUrl}
            uploaded={Boolean(s.cr_document_url)}
          />
          <UploadDoc
            field="vat"
            label="الشهادة الضريبية"
            helper="رقم وشهادة التسجيل الضريبي (VAT)."
            currentUrl={vatUrl}
            uploaded={Boolean(s.vat_document_url)}
          />
          <UploadDoc
            field="portfolio"
            label="ملف الأعمال السابقة"
            helper="عيّنات من مشاريعك السابقة (PDF واحد بحد أقصى 10 ميغابايت)."
            currentUrl={portfolioUrl}
            uploaded={Boolean(s.portfolio_pdf_url)}
          />
        </div>
      </section>
    </div>
  );
}
