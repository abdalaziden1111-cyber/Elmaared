'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { updateSupplierProfileAction } from '@/app/actions/supplier-profile';
import type { ActionResult } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';

const SPECIALIZATIONS = [
  { value: 'booth', label: 'بوث' },
  { value: 'gifts', label: 'هدايا' },
  { value: 'event', label: 'فعالية' },
  { value: 'printing', label: 'طباعة' },
] as const;

interface Initial {
  companyName: string;
  legalName: string;
  vatNumber: string;
  bio: string;
  website: string;
  teamSize: number | null;
  yearsOfExperience: number | null;
  minOrderValue: number | null;
  specializations: string[];
  cities: string[];
  bankName: string;
  iban: string;
  accountHolderName: string;
}

export function EditProfileForm({
  initial,
  cityOptions,
}: {
  initial: Initial;
  cityOptions: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateSupplierProfileAction,
    null
  );

  const [specs, setSpecs] = useState<string[]>(initial.specializations);
  const [cities, setCities] = useState<string[]>(initial.cities);

  useEffect(() => {
    if (state?.ok) {
      const d = state.data as { statusFlipped?: boolean } | undefined;
      if (d?.statusFlipped) {
        // After bank change, user has been demoted to pending_review.
        // Refresh the layout so the sidebar reflects the new state.
        router.refresh();
      } else {
        router.refresh();
      }
    }
  }, [state, router]);

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  const fieldErrors = !state?.ok ? state?.fieldErrors ?? {} : {};

  return (
    <form noValidate action={formAction} className="mt-6 grid gap-4">
      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المعلومات الأساسية
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم الشركة *" name="companyName" defaultValue={initial.companyName} error={fieldErrors.companyName?.[0]} />
          <Field label="الاسم القانوني" name="legalName" defaultValue={initial.legalName} error={fieldErrors.legalName?.[0]} />
          <Field
            label="الرقم الضريبي"
            name="vatNumber"
            defaultValue={initial.vatNumber}
            placeholder="3xxxxxxxxxxxxxx"
            error={fieldErrors.vatNumber?.[0]}
          />
          <Field
            label="سنوات الخبرة"
            name="yearsOfExperience"
            type="number"
            defaultValue={initial.yearsOfExperience?.toString() ?? ''}
            error={fieldErrors.yearsOfExperience?.[0]}
          />
          <Field
            label="حجم الفريق"
            name="teamSize"
            type="number"
            defaultValue={initial.teamSize?.toString() ?? ''}
            error={fieldErrors.teamSize?.[0]}
          />
          <Field
            label="الحد الأدنى لقيمة الطلب (ر.س)"
            name="minOrderValue"
            type="number"
            defaultValue={initial.minOrderValue?.toString() ?? ''}
            error={fieldErrors.minOrderValue?.[0]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          التخصصات والمدن
        </h2>
        <fieldset className="mt-4">
          <legend className="text-xs text-[var(--color-stone-600)]">التخصصات *</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {SPECIALIZATIONS.map((s) => {
              const on = specs.includes(s.value);
              return (
                <label key={s.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="specializations"
                    value={s.value}
                    checked={on}
                    onChange={() => setSpecs(toggle(specs, s.value))}
                    className="peer sr-only"
                  />
                  <span
                    aria-pressed={on}
                    className={`inline-block rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${
                      on
                        ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)] ring-[var(--color-midnight-green)]'
                        : 'bg-white text-[var(--color-stone-600)] ring-[var(--color-stone-300)]'
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-action-blue)]`}
                  >
                    {s.label}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.specializations ? (
            <p className="mt-2 text-xs text-[var(--color-danger)]">
              {fieldErrors.specializations[0]}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="text-xs text-[var(--color-stone-600)]">المدن *</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {cityOptions.map((c) => {
              const on = cities.includes(c.value);
              return (
                <label key={c.value} className="cursor-pointer">
                  <input
                    type="checkbox"
                    name="cities"
                    value={c.value}
                    checked={on}
                    onChange={() => setCities(toggle(cities, c.value))}
                    className="peer sr-only"
                  />
                  <span
                    aria-pressed={on}
                    className={`inline-block rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${
                      on
                        ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)] ring-[var(--color-midnight-green)]'
                        : 'bg-white text-[var(--color-stone-600)] ring-[var(--color-stone-300)]'
                    } peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-action-blue)]`}
                  >
                    {c.label}
                  </span>
                </label>
              );
            })}
          </div>
          {fieldErrors.cities ? (
            <p className="mt-2 text-xs text-[var(--color-danger)]">
              {fieldErrors.cities[0]}
            </p>
          ) : null}
        </fieldset>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          نبذة وموقع
        </h2>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="text-xs text-[var(--color-stone-600)]" htmlFor="bio">
              نبذة (حتى 2000 حرف)
            </label>
            <textarea
              id="bio"
              name="bio"
              defaultValue={initial.bio}
              rows={5}
              maxLength={2000}
              className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            />
            {fieldErrors.bio ? (
              <p className="mt-1 text-xs text-[var(--color-danger)]">{fieldErrors.bio[0]}</p>
            ) : null}
          </div>
          <Field
            label="الموقع الإلكتروني"
            name="website"
            type="url"
            defaultValue={initial.website}
            placeholder="https://example.com"
            error={fieldErrors.website?.[0]}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-warning)] bg-[var(--color-warning-100)]/40 p-5">
        <h2 className="text-base font-semibold text-[var(--color-warning)]">
          معلومات البنك
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          أي تغيير في هذه المعلومات سيُعيد ملفك لمراجعة Admin قبل تحرير أي دفعة جديدة.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="اسم البنك" name="bankName" defaultValue={initial.bankName} error={fieldErrors.bankName?.[0]} />
          <Field
            label="اسم صاحب الحساب"
            name="accountHolderName"
            defaultValue={initial.accountHolderName}
            error={fieldErrors.accountHolderName?.[0]}
          />
          <div className="sm:col-span-2">
            <Field
              label="IBAN"
              name="iban"
              defaultValue={initial.iban}
              placeholder="SA0000000000000000000000"
              error={fieldErrors.iban?.[0]}
              mono
            />
          </div>
        </div>
      </section>

      {state && !state.ok ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-100)] p-3 text-sm text-[var(--color-success)]"
        >
          {(state.data as { statusFlipped?: boolean } | undefined)?.statusFlipped
            ? 'تم الحفظ. ملفك الآن قيد إعادة المراجعة بعد تغيير المعلومات البنكية.'
            : 'تم الحفظ.'}
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton>حفظ التعديلات</SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue = '',
  placeholder,
  type = 'text',
  error,
  mono,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  error?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-[var(--color-stone-600)]" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className={`mt-1 h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${mono ? 'num' : ''}`}
      />
      {error ? (
        <p className="mt-1 text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}
    </div>
  );
}
