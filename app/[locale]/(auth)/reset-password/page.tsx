'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordAction, type ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    updatePasswordAction,
    null
  );

  useEffect(() => {
    if (state?.ok && (state.data as { redirectTo?: string } | undefined)?.redirectTo) {
      router.push((state.data as { redirectTo: string }).redirectTo);
    }
  }, [state, router]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm has-grain">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          عيّن كلمة مرور جديدة
        </h1>
        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <FormField
            type="password"
            label="كلمة المرور الجديدة"
            name="password"
            minLength={8}
            required
            error={state && !state.ok ? state.fieldErrors?.password?.[0] : undefined}
          />
          <FormField
            type="password"
            label="تأكيد كلمة المرور"
            name="confirmPassword"
            minLength={8}
            required
            error={
              state && !state.ok ? state.fieldErrors?.confirmPassword?.[0] : undefined
            }
          />
          {state && !state.ok && !state.fieldErrors ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}
          <SubmitButton>حفظ كلمة المرور</SubmitButton>
        </form>
      </div>
    </main>
  );
}
