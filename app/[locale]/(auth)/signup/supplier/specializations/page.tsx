'use client';

import { useRouter } from '@/lib/i18n/routing';
import { useSignupSupplierStore } from '@/stores/signup-supplier-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { CITIES } from '@/lib/constants/cities';
import { cn } from '@/lib/utils/cn';

export default function SupplierSpecializationsStepPage() {
  const router = useRouter();
  const { data, toggleSpecialization, toggleCity } = useSignupSupplierStore();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (data.specializations.length === 0 || data.cities.length === 0) return;
    router.push('/signup/supplier/documents');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-12">
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'past' },
          { label: 'الشركة', state: 'past' },
          { label: 'التخصصات', state: 'current' },
          { label: 'البنك', state: 'future' },
        ]}
      />
      <h1 className="mt-6 text-2xl font-semibold text-[var(--color-midnight-green)]">
        ما الذي تقدمه؟
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        اختر تخصصاتك والمدن التي تخدمها لنوصلك بالطلبات المناسبة فقط.
      </p>

      <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-8">
        <div>
          <h2 className="text-base font-medium">التخصصات</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {SERVICE_TYPES.map((s) => {
              const active = data.specializations.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSpecialization(s.value)}
                  className={cn(
                    'rounded-xl border p-4 text-start transition-colors',
                    active
                      ? 'border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5'
                      : 'border-[var(--color-stone-300)] bg-white hover:border-[var(--color-action-blue)]'
                  )}
                  aria-pressed={active}
                >
                  <div className="text-sm font-medium">{s.labelAr}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-base font-medium">المدن التي تخدمها</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CITIES.map((c) => {
              const active = data.cities.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleCity(c.value)}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-[var(--color-action-blue)] bg-[var(--color-action-blue)] text-[var(--color-cream)]'
                      : 'border-[var(--color-stone-300)] bg-white'
                  )}
                  aria-pressed={active}
                >
                  {c.labelAr}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push('/signup/supplier/company')}
            className="text-sm text-[var(--color-stone-600)]"
          >
            ← السابق
          </button>
          <button
            type="submit"
            disabled={data.specializations.length === 0 || data.cities.length === 0}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-60"
          >
            التالي
          </button>
        </div>
      </form>
    </main>
  );
}
