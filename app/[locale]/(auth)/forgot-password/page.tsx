'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction, type ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    forgotPasswordAction,
    null
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm has-grain">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          نسيت كلمة المرور؟
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          أدخل بريدك المسجّل وسنرسل لك رابط إعادة تعيين كلمة المرور.
        </p>

        {state?.ok ? (
          <div className="mt-6 rounded-xl border border-[var(--color-success-100)] bg-[var(--color-success-100)] p-4 text-sm text-[var(--color-success)]">
            إذا كان هذا البريد مسجلاً، ستجد رابط الإعادة في صندوقك خلال دقائق.
          </div>
        ) : (
          <form action={formAction} className="mt-6 flex flex-col gap-4">
            <FormField
              type="email"
              label="البريد الإلكتروني"
              name="email"
              required
              error={state && !state.ok ? state.fieldErrors?.email?.[0] : undefined}
            />
            <SubmitButton>أرسل رابط الإعادة</SubmitButton>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-[var(--color-action-blue)]">
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
