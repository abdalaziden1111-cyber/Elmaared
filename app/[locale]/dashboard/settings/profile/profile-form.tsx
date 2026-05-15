'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { updateClientProfileAction } from '@/app/actions/client-profile';
import { updatePasswordAction } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import type { ActionResult } from '@/app/actions/auth';

export function ProfileSettingsForms({
  initial,
}: {
  initial: { fullName: string; phone: string; email: string };
}) {
  const router = useRouter();
  const [profState, profAction] = useActionState<ActionResult | null, FormData>(
    updateClientProfileAction,
    null
  );
  const [pwState, pwAction] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null
  );

  useEffect(() => {
    if (profState?.ok) router.refresh();
  }, [profState, router]);

  const profErrors = !profState?.ok ? profState?.fieldErrors ?? {} : {};
  const pwErrors = !pwState?.ok ? pwState?.fieldErrors ?? {} : {};

  return (
    <div className="mt-6 grid gap-6">
      {/* Profile basics */}
      <form
        action={profAction}
        className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
      >
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          البيانات الشخصية
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          البريد الإلكتروني <span className="font-mono">{initial.email}</span> لا يمكن تغييره من هنا.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="الاسم الكامل *"
            name="fullName"
            defaultValue={initial.fullName}
            error={profErrors.fullName?.[0]}
          />
          <Field
            label="رقم الجوال *"
            name="phone"
            defaultValue={initial.phone}
            placeholder="+966 5x xxx xxxx"
            error={profErrors.phone?.[0]}
            dir="ltr"
          />
        </div>
        {!profState?.ok && profState?.error && profState.error !== 'بيانات غير صحيحة. راجع الحقول المظللة.' ? (
          <p className="mt-3 text-xs text-[var(--color-danger)]">{profState.error}</p>
        ) : null}
        {profState?.ok ? (
          <p className="mt-3 text-xs text-[var(--color-success)]">تم الحفظ.</p>
        ) : null}
        <div className="mt-4">
          <SubmitButton>احفظ التعديلات</SubmitButton>
        </div>
      </form>

      {/* Password change */}
      <form
        action={pwAction}
        className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
      >
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          كلمة المرور
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          غيّر كلمة المرور بانتظام للحفاظ على أمان حسابك.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field
            label="كلمة المرور الجديدة *"
            name="password"
            type="password"
            error={pwErrors.password?.[0]}
          />
          <Field
            label="تأكيد كلمة المرور *"
            name="confirmPassword"
            type="password"
            error={pwErrors.confirmPassword?.[0]}
          />
        </div>
        {!pwState?.ok && pwState?.error && pwState.error !== 'Validation failed' ? (
          <p className="mt-3 text-xs text-[var(--color-danger)]">{pwState.error}</p>
        ) : null}
        {pwState?.ok ? (
          <p className="mt-3 text-xs text-[var(--color-success)]">تم تحديث كلمة المرور.</p>
        ) : null}
        <div className="mt-4">
          <SubmitButton>غيّر كلمة المرور</SubmitButton>
        </div>
      </form>
    </div>
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
