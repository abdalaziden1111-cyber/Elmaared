'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSignupSupplierStore } from '@/stores/signup-supplier-store';
import { signupSupplierAction, type ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { WizardStepper } from '@/components/ui/wizard-stepper';

export default function SupplierDocumentsStepPage() {
  const router = useRouter();
  const { data, setField, reset } = useSignupSupplierStore();

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signupSupplierAction,
    null
  );

  useEffect(() => {
    if (state?.ok && (state.data as { redirectTo?: string } | undefined)?.redirectTo) {
      reset();
      router.push((state.data as { redirectTo: string }).redirectTo);
    }
  }, [state, reset, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'past' },
          { label: 'الشركة', state: 'past' },
          { label: 'التخصصات', state: 'past' },
          { label: 'البنك', state: 'current' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        البيانات البنكية
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        نستخدم هذه البيانات لتحويل أرباحك بعد إكمال كل مشروع.
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        {/* All collected data goes through */}
        <input type="hidden" name="email" value={data.email} />
        <input type="hidden" name="password" value={data.password} />
        <input type="hidden" name="fullName" value={data.fullName} />
        <input type="hidden" name="phone" value={data.phone} />
        <input type="hidden" name="companyName" value={data.companyName} />
        <input type="hidden" name="legalName" value={data.legalName ?? ''} />
        <input type="hidden" name="crNumber" value={data.crNumber} />
        <input type="hidden" name="vatNumber" value={data.vatNumber ?? ''} />
        <input type="hidden" name="bio" value={data.bio ?? ''} />
        <input type="hidden" name="website" value={data.website ?? ''} />
        <input
          type="hidden"
          name="specializations"
          value={JSON.stringify(data.specializations)}
        />
        <input type="hidden" name="cities" value={JSON.stringify(data.cities)} />

        <FormField
          label="اسم البنك (اختياري)"
          name="bankName"
          value={data.bankName ?? ''}
          onChange={(e) => setField('bankName', e.target.value)}
        />
        <FormField
          label="IBAN السعودي (اختياري — يمكن تحديثه لاحقاً)"
          name="iban"
          placeholder="SA0000000000000000000000"
          value={data.iban ?? ''}
          onChange={(e) => setField('iban', e.target.value)}
          hint="يبدأ بـ SA ويتبعه 22 رقم"
          error={state && !state.ok ? state.fieldErrors?.iban?.[0] : undefined}
        />
        <FormField
          label="اسم صاحب الحساب (اختياري)"
          name="accountHolderName"
          value={data.accountHolderName ?? ''}
          onChange={(e) => setField('accountHolderName', e.target.value)}
        />

        {state && !state.ok && !state.fieldErrors ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/signup/supplier/specializations')}
            className="text-sm text-[var(--color-stone-600)]"
          >
            ← السابق
          </button>
          <SubmitButton>إنشاء الحساب</SubmitButton>
        </div>
      </form>
    </main>
  );
}
