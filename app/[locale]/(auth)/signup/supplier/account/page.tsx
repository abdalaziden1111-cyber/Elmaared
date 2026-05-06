'use client';

import { useRouter } from 'next/navigation';
import { useSignupSupplierStore } from '@/stores/signup-supplier-store';
import { FormField } from '@/components/ui/form-field';
import { WizardStepper } from '@/components/ui/wizard-stepper';

export default function SupplierAccountStepPage() {
  const router = useRouter();
  const { data, setField } = useSignupSupplierStore();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push('/signup/supplier/company');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'current' },
          { label: 'الشركة', state: 'future' },
          { label: 'التخصصات', state: 'future' },
          { label: 'البنك', state: 'future' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        أنشئ حساب مورد
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <FormField
          label="الاسم الكامل"
          name="fullName"
          required
          minLength={3}
          value={data.fullName}
          onChange={(e) => setField('fullName', e.target.value)}
        />
        <FormField
          type="email"
          label="البريد الإلكتروني"
          name="email"
          required
          value={data.email}
          onChange={(e) => setField('email', e.target.value)}
        />
        <FormField
          label="رقم الهاتف"
          name="phone"
          placeholder="+966512345678"
          required
          value={data.phone}
          onChange={(e) => setField('phone', e.target.value)}
        />
        <FormField
          type="password"
          label="كلمة المرور"
          name="password"
          minLength={8}
          required
          value={data.password}
          onChange={(e) => setField('password', e.target.value)}
        />
        <button
          type="submit"
          className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          التالي
        </button>
      </form>
    </main>
  );
}
