'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { loginAction, type ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

// Full-page overlay shown while the login form is pending. Without it,
// the post-303 navigation gap (route-group chunk download + parse) can
// stretch to ~9s on the supplier side because the supplier bundle is
// cold on first visit. The in-button spinner is too easy to miss and the
// page otherwise looks frozen until /supplier/loading.tsx finally renders.
function PendingOverlay() {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-midnight-green)]/70 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-8 py-6 shadow-lg">
        <Loader2 className="size-8 animate-spin text-[var(--color-action-blue)]" />
        <p className="text-sm font-medium text-[var(--color-midnight-green)]">
          نُحضّر لوحتك...
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-2xl bg-white p-8 shadow-sm has-grain">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          سجّل دخولك
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          أدخل بريدك وكلمة المرور للوصول إلى حسابك.
        </p>

        <form noValidate action={formAction} className="mt-6 flex flex-col gap-4">
          <FormField
            type="email"
            name="email"
            label="البريد الإلكتروني"
            placeholder="name@company.sa"
            autoComplete="email"
            required
            error={state && !state.ok ? state.fieldErrors?.email?.[0] : undefined}
          />
          <FormField
            type="password"
            name="password"
            label="كلمة المرور"
            autoComplete="current-password"
            required
            error={state && !state.ok ? state.fieldErrors?.password?.[0] : undefined}
          />

          {state && !state.ok && !state.fieldErrors ? (
            <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
          ) : null}

          <SubmitButton>تسجيل الدخول</SubmitButton>
          <PendingOverlay />
        </form>

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link href="/forgot-password" className="text-[var(--color-action-blue)]">
            نسيت كلمة المرور؟
          </Link>
          <Link href="/signup" className="text-[var(--color-action-blue)]">
            ليس لديك حساب؟ أنشئ واحداً
          </Link>
        </div>
      </div>
    </main>
  );
}
