'use client';

import { useRouter } from 'next/navigation';
import { useSignupClientStore } from '@/stores/signup-client-store';
import { FormField } from '@/components/ui/form-field';
import { WizardStepper } from '@/components/ui/wizard-stepper';

export default function ClientAccountStepPage() {
  const router = useRouter();
  const { data, setField } = useSignupClientStore();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push('/signup/client/company');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'current' },
          { label: 'الشركة', state: 'future' },
          { label: 'تأكيد', state: 'future' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        أنشئ حسابك
      </h1>
      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <FormField
          label="الاسم الكامل"
          name="fullName"
          autoComplete="name"
          required
          minLength={3}
          value={data.fullName}
          onChange={(e) => setField('fullName', e.target.value)}
        />
        <FormField
          type="email"
          label="البريد الإلكتروني"
          name="email"
          autoComplete="email"
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
          hint="يبدأ بـ +966 ويتبعه 9 أرقام"
        />
        <FormField
          type="password"
          label="كلمة المرور"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={data.password}
          onChange={(e) => setField('password', e.target.value)}
          hint="8 أحرف على الأقل"
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
