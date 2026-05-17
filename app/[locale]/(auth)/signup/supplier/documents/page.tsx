'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
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

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  type SupplierStep =
    | '/signup/supplier/account'
    | '/signup/supplier/company'
    | '/signup/supplier/specializations';
  const priorStepFieldLabels: Record<string, { label: string; step: SupplierStep }> = {
    email: { label: 'البريد الإلكتروني', step: '/signup/supplier/account' },
    password: { label: 'كلمة المرور', step: '/signup/supplier/account' },
    fullName: { label: 'الاسم الكامل', step: '/signup/supplier/account' },
    phone: { label: 'رقم الهاتف', step: '/signup/supplier/account' },
    companyName: { label: 'اسم الشركة', step: '/signup/supplier/company' },
    crNumber: { label: 'رقم السجل التجاري', step: '/signup/supplier/company' },
    specializations: { label: 'التخصصات', step: '/signup/supplier/specializations' },
    cities: { label: 'مدن الخدمة', step: '/signup/supplier/specializations' },
  };
  const priorStepErrors = fieldErrors
    ? Object.entries(priorStepFieldLabels).flatMap(([name, info]) => {
        const msg = fieldErrors[name]?.[0];
        return msg ? [{ name, label: info.label, step: info.step, msg }] : [];
      })
    : [];
  const firstBrokenStep: SupplierStep | undefined = priorStepErrors[0]?.step;

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

      <form noValidate action={formAction} className="mt-6 flex flex-col gap-4">
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

        {priorStepErrors.length > 0 ? (
          <div
            role="alert"
            className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger)]/10 p-3 text-sm text-[var(--color-danger)]"
          >
            <p className="font-medium">يوجد خطأ في بيانات الخطوات السابقة:</p>
            <ul className="mt-1 list-disc ps-5">
              {priorStepErrors.map((e) => (
                <li key={e.name}>
                  <span className="font-medium">{e.label}:</span> {e.msg}
                </li>
              ))}
            </ul>
            {firstBrokenStep ? (
              <button
                type="button"
                onClick={() => router.push(firstBrokenStep)}
                className="mt-2 text-xs underline"
              >
                ← العودة لتعديل البيانات
              </button>
            ) : null}
          </div>
        ) : null}

        <FormField
          label="اسم البنك (اختياري)"
          name="bankName"
          value={data.bankName ?? ''}
          onChange={(e) => setField('bankName', e.target.value)}
          error={fieldErrors?.bankName?.[0]}
        />
        <FormField
          label="IBAN السعودي (اختياري — يمكن تحديثه لاحقاً)"
          name="iban"
          placeholder="SA0000000000000000000000"
          value={data.iban ?? ''}
          onChange={(e) => setField('iban', e.target.value)}
          hint="يبدأ بـ SA ويتبعه 22 رقم"
          error={fieldErrors?.iban?.[0]}
        />
        <FormField
          label="اسم صاحب الحساب (اختياري)"
          name="accountHolderName"
          value={data.accountHolderName ?? ''}
          onChange={(e) => setField('accountHolderName', e.target.value)}
          error={fieldErrors?.accountHolderName?.[0]}
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
