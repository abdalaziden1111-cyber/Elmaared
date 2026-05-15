'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { updateClientCompanyAction } from '@/app/actions/client-profile';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/app/actions/auth';

const SIZE_OPTIONS = [
  { value: 'startup', label: 'شركة ناشئة (≤10)' },
  { value: 'mid', label: 'متوسطة (11–50)' },
  { value: 'enterprise', label: 'كبيرة (50+)' },
] as const;

const CITY_OPTIONS = [
  'الرياض',
  'جدة',
  'الدمام',
  'الخبر',
  'مكة المكرمة',
  'المدينة المنورة',
  'تبوك',
  'أبها',
  'حائل',
  'جازان',
];

interface Initial {
  companyName: string;
  legalName: string;
  crNumber: string;
  vatNumber: string;
  size: 'startup' | 'mid' | 'enterprise';
  industry: string;
  city: string;
  address: string;
}

export function CompanyForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updateClientCompanyAction,
    null
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const errors = !state?.ok ? state?.fieldErrors ?? {} : {};

  return (
    <form
      action={formAction}
      className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
    >
      <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
        بيانات الشركة
      </h2>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        هذه المعلومات تظهر للموردين على طلباتك وفي العقود.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="اسم الشركة (تجاري) *"
          name="companyName"
          defaultValue={initial.companyName}
          error={errors.companyName?.[0]}
        />
        <Field
          label="الاسم القانوني"
          name="legalName"
          defaultValue={initial.legalName}
          error={errors.legalName?.[0]}
        />
        <Field
          label="رقم السجل التجاري *"
          name="crNumber"
          defaultValue={initial.crNumber}
          placeholder="10 أرقام"
          error={errors.crNumber?.[0]}
          dir="ltr"
        />
        <Field
          label="الرقم الضريبي"
          name="vatNumber"
          defaultValue={initial.vatNumber}
          placeholder="3xxxxxxxxxxxxxx"
          error={errors.vatNumber?.[0]}
          dir="ltr"
        />
        <SelectField
          label="حجم الشركة *"
          name="size"
          defaultValue={initial.size}
          options={SIZE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          error={errors.size?.[0]}
        />
        <Field
          label="القطاع"
          name="industry"
          defaultValue={initial.industry}
          placeholder="مثال: تقنية، تجزئة، فندقة"
          error={errors.industry?.[0]}
        />
        <SelectField
          label="المدينة *"
          name="city"
          defaultValue={initial.city}
          options={CITY_OPTIONS.map((c) => ({ value: c, label: c }))}
          error={errors.city?.[0]}
        />
        <Field
          label="العنوان"
          name="address"
          defaultValue={initial.address}
          placeholder="حي، شارع، رقم"
          error={errors.address?.[0]}
        />
      </div>

      {!state?.ok && state?.error && state.error !== 'بيانات غير صحيحة. راجع الحقول المظللة.' ? (
        <p className="mt-3 text-xs text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      {state?.ok ? (
        <p className="mt-3 text-xs text-[var(--color-success)]">تم الحفظ.</p>
      ) : null}

      <div className="mt-5">
        <SubmitButton>احفظ التعديلات</SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  defaultValue,
  placeholder,
  error,
  dir,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  error?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="block text-xs font-medium text-[var(--color-stone-600)]">
      {label}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        dir={dir}
        className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
      />
      {error ? (
        <span className="mt-1 block text-[var(--color-danger)]">{error}</span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  error?: string;
}) {
  return (
    <label className="block text-xs font-medium text-[var(--color-stone-600)]">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-1 block h-10 w-full rounded-lg border border-[var(--color-stone-300)] bg-[var(--color-cream)] px-3 text-sm text-[var(--color-charcoal)] focus:border-[var(--color-action-blue)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? (
        <span className="mt-1 block text-[var(--color-danger)]">{error}</span>
      ) : null}
    </label>
  );
}
