'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSignupClientStore } from '@/stores/signup-client-store';
import { signupClientAction, type ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { CITIES } from '@/lib/constants/cities';

export default function ClientCompanyStepPage() {
  const router = useRouter();
  const { data, setField, reset } = useSignupClientStore();

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    signupClientAction,
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
          { label: 'الشركة', state: 'current' },
          { label: 'تأكيد', state: 'future' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        بيانات الشركة
      </h1>
      <form action={formAction} className="mt-6 flex flex-col gap-4">
        {/* Hidden fields from previous step */}
        <input type="hidden" name="email" value={data.email} />
        <input type="hidden" name="password" value={data.password} />
        <input type="hidden" name="fullName" value={data.fullName} />
        <input type="hidden" name="phone" value={data.phone} />

        <FormField
          label="اسم الشركة التجاري"
          name="companyName"
          required
          value={data.companyName}
          onChange={(e) => setField('companyName', e.target.value)}
          error={state && !state.ok ? state.fieldErrors?.companyName?.[0] : undefined}
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
          required
          maxLength={10}
          inputMode="numeric"
          value={data.crNumber}
          onChange={(e) => setField('crNumber', e.target.value)}
          hint="10 أرقام بالضبط"
          error={state && !state.ok ? state.fieldErrors?.crNumber?.[0] : undefined}
        />
        <FormField
          label="الرقم الضريبي (اختياري)"
          name="vatNumber"
          value={data.vatNumber ?? ''}
          onChange={(e) => setField('vatNumber', e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="size">حجم الشركة</label>
          <select
            id="size"
            name="size"
            required
            value={data.size}
            onChange={(e) => setField('size', e.target.value as 'enterprise' | 'mid' | 'startup' | '')}
            className="h-11 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm"
          >
            <option value="">اختر…</option>
            <option value="startup">شركة ناشئة</option>
            <option value="mid">شركة متوسطة</option>
            <option value="enterprise">شركة كبيرة</option>
          </select>
        </div>

        <FormField
          label="القطاع (اختياري)"
          name="industry"
          value={data.industry ?? ''}
          onChange={(e) => setField('industry', e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="city">المدينة</label>
          <select
            id="city"
            name="city"
            required
            value={data.city}
            onChange={(e) => setField('city', e.target.value)}
            className="h-11 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm"
          >
            <option value="">اختر…</option>
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.labelAr}
              </option>
            ))}
          </select>
        </div>

        {state && !state.ok && !state.fieldErrors ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/signup/client/account')}
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
