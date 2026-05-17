'use client';

import { useRouter } from '@/lib/i18n/routing';
import { useSignupSupplierStore } from '@/stores/signup-supplier-store';
import { FormField } from '@/components/ui/form-field';
import { WizardStepper } from '@/components/ui/wizard-stepper';

export default function SupplierCompanyStepPage() {
  const router = useRouter();
  const { data, setField } = useSignupSupplierStore();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push('/signup/supplier/specializations');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'past' },
          { label: 'الشركة', state: 'current' },
          { label: 'التخصصات', state: 'future' },
          { label: 'البنك', state: 'future' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        بيانات الشركة
      </h1>
      <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <FormField
          label="اسم الشركة التجاري"
          name="companyName"
          required
          value={data.companyName}
          onChange={(e) => setField('companyName', e.target.value)}
        />
        <FormField
          label="الاسم القانوني (اختياري)"
          name="legalName"
          value={data.legalName ?? ''}
          onChange={(e) => setField('legalName', e.target.value)}
        />
        <FormField
          label="رقم السجل التجاري"
          name="crNumber"
          maxLength={10}
          inputMode="numeric"
          required
          value={data.crNumber}
          onChange={(e) => setField('crNumber', e.target.value)}
        />
        <FormField
          label="الرقم الضريبي (اختياري)"
          name="vatNumber"
          value={data.vatNumber ?? ''}
          onChange={(e) => setField('vatNumber', e.target.value)}
        />
        <FormField
          label="نبذة عن الشركة (اختياري)"
          name="bio"
          value={data.bio ?? ''}
          onChange={(e) => setField('bio', e.target.value)}
        />
        <FormField
          label="الموقع الإلكتروني (اختياري)"
          name="website"
          type="url"
          placeholder="https://example.sa"
          value={data.website ?? ''}
          onChange={(e) => setField('website', e.target.value)}
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/signup/supplier/account')}
            className="text-sm text-[var(--color-stone-600)]"
          >
            ← السابق
          </button>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
          >
            التالي
          </button>
        </div>
      </form>
    </main>
  );
}
