# Phase 1 — Auth & Onboarding (Weeks 3-4)

> **Goal**: A user can sign up as Client OR Supplier, verify email, log in, and land in the correct dashboard. Admin can approve pending suppliers.

> **Prerequisite**: Phase 0 complete. All schemas, migrations, Supabase clients, proxy.ts, i18n setup, design tokens are in place.

---

## What this phase delivers

By end of Week 4:

1. A real homepage at `/[locale]` that is not the placeholder.
2. `/[locale]/login` — email + password login.
3. `/[locale]/signup` — role chooser (Client | Supplier).
4. `/[locale]/signup/client/{step}` — 3-step client wizard (account → company → done).
5. `/[locale]/signup/supplier/{step}` — 4-step supplier wizard (account → company → specializations → portfolio → done).
6. `/[locale]/verify-email` — verification waiting screen.
7. `/[locale]/forgot-password` + `/[locale]/reset-password` flow.
8. `/[locale]/dashboard` — placeholder client dashboard (no RFQs yet).
9. `/[locale]/supplier/pending` — supplier waiting-for-admin-approval screen.
10. `/admin/login` + `/admin/suppliers/pending` — admin approves suppliers, triggers activation email.
11. Logout from any authenticated screen.
12. ~25 new unit + integration tests.

**At the end, you can demo**: a real human signs up as a client, verifies, logs in, sees an empty dashboard. Another signs up as a supplier, verifies, sees "pending review", admin clicks approve, supplier receives email and can log in.

---

## Step 1.1 — Server Actions skeleton

Create `app/actions/` directory and the auth server-actions file. Server Actions are how all mutations happen in this project (no REST API calls from the browser).

### File: `app/actions/auth.ts`

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loginSchema,
  signupClientSchema,
  signupSupplierSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '@/schemas/auth';
import { getDashboardPath } from '@/lib/auth/permissions';
import type { UserRole } from '@/lib/supabase/types';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ───────────────────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────────────────
export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: 'بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.' };
  }

  // Look up role to redirect to correct dashboard
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'فشل في جلب بيانات المستخدم.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي. تواصل مع Admin.' };

  redirect(getDashboardPath(profile.role as UserRole));
}

// ───────────────────────────────────────────────────────────
// SIGN UP CLIENT
// ───────────────────────────────────────────────────────────
export async function signupClientAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = signupClientSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    companyName: formData.get('companyName'),
    crNumber: formData.get('crNumber'),
    city: formData.get('city'),
    industry: formData.get('industry'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: {
        full_name: parsed.data.fullName,
        role: 'client',
      },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message.includes('already registered')) {
      return { ok: false, error: 'هذا البريد مسجّل بالفعل. سجّل دخولك أو استخدم بريداً آخر.' };
    }
    return { ok: false, error: 'حدث خطأ في إنشاء الحساب. حاول مرة أخرى.' };
  }

  // 2. Create company first (we need company_id for profile)
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      name: parsed.data.companyName,
      cr_number: parsed.data.crNumber,
      city: parsed.data.city,
      industry: parsed.data.industry,
      created_by: authData.user.id,
    })
    .select('id')
    .single();

  if (companyError || !company) {
    // Roll back the auth user — orphan accounts are bad.
    await admin.auth.admin.deleteUser(authData.user.id);
    if (companyError?.code === '23505') {
      return { ok: false, error: 'رقم السجل التجاري مسجّل بالفعل لشركة أخرى.' };
    }
    return { ok: false, error: 'حدث خطأ في تسجيل بيانات الشركة. حاول مرة أخرى.' };
  }

  // 3. Create profile
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    role: 'client',
    company_id: company.id,
  });

  if (profileError) {
    await admin.from('companies').delete().eq('id', company.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: 'فشل في إنشاء الملف الشخصي. حاول مرة أخرى.' };
  }

  // Audit log
  await admin.from('audit_logs').insert({
    user_id: authData.user.id,
    action: 'signup_client',
    resource_type: 'profile',
    resource_id: authData.user.id,
    metadata: { company_id: company.id },
  });

  return { ok: true, data: { redirectTo: '/verify-email' } };
}

// ───────────────────────────────────────────────────────────
// SIGN UP SUPPLIER
// ───────────────────────────────────────────────────────────
export async function signupSupplierAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // FormData arrays come through as strings; specializations + cities are JSON-encoded
  const specializationsRaw = formData.get('specializations');
  const citiesRaw = formData.get('cities');

  let specializations: string[] = [];
  let cities: string[] = [];
  try {
    specializations = specializationsRaw ? JSON.parse(specializationsRaw as string) : [];
    cities = citiesRaw ? JSON.parse(citiesRaw as string) : [];
  } catch {
    return { ok: false, error: 'بيانات التخصصات أو المدن غير صحيحة.' };
  }

  const parsed = signupSupplierSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    companyName: formData.get('companyName'),
    crNumber: formData.get('crNumber'),
    city: formData.get('city'),
    specializations,
    cities,
    bankName: formData.get('bankName'),
    iban: formData.get('iban'),
    accountHolder: formData.get('accountHolder'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: { full_name: parsed.data.fullName, role: 'supplier' },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message.includes('already registered')) {
      return { ok: false, error: 'هذا البريد مسجّل بالفعل.' };
    }
    return { ok: false, error: 'حدث خطأ في إنشاء الحساب.' };
  }

  // Companies (legal entity) for the supplier
  const { data: company, error: companyError } = await admin
    .from('companies')
    .insert({
      name: parsed.data.companyName,
      cr_number: parsed.data.crNumber,
      city: parsed.data.city,
      created_by: authData.user.id,
    })
    .select('id')
    .single();

  if (companyError || !company) {
    await admin.auth.admin.deleteUser(authData.user.id);
    if (companyError?.code === '23505') {
      return { ok: false, error: 'رقم السجل التجاري مسجّل بالفعل.' };
    }
    return { ok: false, error: 'حدث خطأ في تسجيل بيانات الشركة.' };
  }

  // Profile (role: supplier)
  await admin.from('profiles').insert({
    id: authData.user.id,
    email: parsed.data.email,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    role: 'supplier',
    company_id: company.id,
  });

  // Suppliers row (status: pending) — the table that controls supplier-only data
  const { error: supplierError } = await admin.from('suppliers').insert({
    id: authData.user.id,
    company_id: company.id,
    specializations: parsed.data.specializations,
    cities: parsed.data.cities,
    bank_name: parsed.data.bankName,
    iban: parsed.data.iban,
    account_holder: parsed.data.accountHolder,
    status: 'pending',
  });

  if (supplierError) {
    await admin.from('profiles').delete().eq('id', authData.user.id);
    await admin.from('companies').delete().eq('id', company.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: 'فشل في تسجيل بيانات المورد.' };
  }

  await admin.from('audit_logs').insert({
    user_id: authData.user.id,
    action: 'signup_supplier',
    resource_type: 'supplier',
    resource_id: authData.user.id,
    metadata: { company_id: company.id, specializations: parsed.data.specializations },
  });

  return { ok: true, data: { redirectTo: '/verify-email' } };
}

// ───────────────────────────────────────────────────────────
// LOGOUT
// ───────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

// ───────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ───────────────────────────────────────────────────────────
export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  // Note: Supabase always returns success here for security (don't leak which emails exist)
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// UPDATE PASSWORD
// ───────────────────────────────────────────────────────────
export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, error: 'فشل في تحديث كلمة المرور. حاول مرة أخرى.' };

  return { ok: true, data: { redirectTo: '/login' } };
}
```

---

## Step 1.2 — Form components and shared UI

### File: `components/ui/form-field.tsx`

A reusable form field that handles label, input, and error message. Used by every auth form so error styling stays consistent.

```tsx
'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const fieldId = id || props.name;
    return (
      <div className="space-y-1.5">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-charcoal"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            'w-full h-10 px-3 rounded-md bg-cream border border-stone-300',
            'text-charcoal placeholder:text-stone-600 text-sm',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue focus-visible:ring-offset-2 focus-visible:ring-offset-cream',
            error && 'border-danger focus-visible:ring-danger',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={`${fieldId}-hint`} className="text-xs text-stone-600">{hint}</p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="text-xs text-danger">{error}</p>
        )}
      </div>
    );
  }
);
FormField.displayName = 'FormField';
```

### File: `components/ui/submit-button.tsx`

```tsx
'use client';

import { useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ComponentProps, ReactNode } from 'react';

interface Props extends ComponentProps<typeof Button> {
  pendingText?: string;
  children: ReactNode;
}

export function SubmitButton({ children, pendingText, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          {pendingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
```

### File: `components/ui/wizard-stepper.tsx`

```tsx
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface Step {
  label: string;
  href?: string;
}

interface Props {
  steps: Step[];
  currentStep: number; // 1-indexed
}

export function WizardStepper({ steps, currentStep }: Props) {
  return (
    <ol className="flex items-center w-full gap-2">
      {steps.map((step, idx) => {
        const num = idx + 1;
        const status = num < currentStep ? 'done' : num === currentStep ? 'active' : 'pending';
        return (
          <li key={step.label} className="flex-1 flex items-center gap-2">
            <div
              className={cn(
                'flex items-center justify-center size-8 rounded-full border-2 text-sm font-medium shrink-0',
                status === 'done' && 'bg-midnight-green border-midnight-green text-cream',
                status === 'active' && 'bg-action-blue border-action-blue text-cream',
                status === 'pending' && 'bg-stone-100 border-stone-300 text-stone-600'
              )}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              {status === 'done' ? <Check className="size-4" /> : num}
            </div>
            <span
              className={cn(
                'text-xs hidden sm:inline',
                status === 'pending' && 'text-stone-600'
              )}
            >
              {step.label}
            </span>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 rounded',
                  num < currentStep ? 'bg-midnight-green' : 'bg-stone-300'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
```

Run `npx shadcn@latest add button card alert toast` if you haven't already (add them in Phase 0 step 0.7 if missing — should already exist).

---

## Step 1.3 — Marketing layout and homepage

### File: `app/[locale]/(marketing)/layout.tsx`

```tsx
import type { ReactNode } from 'react';
import { MarketingHeader } from '@/components/marketing/header';
import { MarketingFooter } from '@/components/marketing/footer';

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
```

### File: `components/marketing/header.tsx`

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function MarketingHeader() {
  const t = useTranslations('nav');
  return (
    <header className="border-b border-stone-300 bg-cream/95 backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-midnight-green">
          تطبيق المعارض
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{t('login')}</Link>
          </Button>
          <Button asChild variant="brand" size="sm">
            <Link href="/signup">{t('signup')}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
```

### File: `components/marketing/footer.tsx`

```tsx
export function MarketingFooter() {
  return (
    <footer className="border-t border-stone-300 py-6 mt-12">
      <div className="container mx-auto px-4 text-sm text-stone-600 flex flex-col sm:flex-row justify-between gap-2">
        <span>© 2026 تطبيق المعارض. جميع الحقوق محفوظة.</span>
        <span className="font-mono" dir="ltr">v0.1.0</span>
      </div>
    </footer>
  );
}
```

### File: `app/[locale]/(marketing)/page.tsx` — replace Phase 0 placeholder

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const t = useTranslations('home');
  return (
    <div>
      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-12 text-center max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-midnight-green leading-tight mb-4">
          {t('hero.title')}
        </h1>
        <p className="text-lg text-stone-600 mb-8 leading-relaxed">
          {t('hero.subtitle')}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" variant="brand">
            <Link href="/signup">{t('hero.ctaPrimary')}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link href="/how-it-works">{t('hero.ctaSecondary')}</Link>
          </Button>
        </div>
      </section>

      {/* Trust strip */}
      <section className="container mx-auto px-4 py-8 border-y border-stone-300">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat num="5%" label={t('stats.commission')} />
          <Stat num="200+" label={t('stats.suppliers')} />
          <Stat num="24h" label={t('stats.firstProposals')} />
          <Stat num="100%" label={t('stats.escrow')} />
        </div>
      </section>
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-midnight-green num">{num}</div>
      <div className="text-xs text-stone-600 mt-1">{label}</div>
    </div>
  );
}
```

### Update `lib/i18n/messages/ar.json` — add `home` and `nav` keys

```json
{
  "common": { "loading": "جارٍ التحميل…", "error": "حدث خطأ", "retry": "حاول مرة أخرى" },
  "nav": {
    "login": "تسجيل الدخول",
    "signup": "إنشاء حساب",
    "logout": "تسجيل الخروج",
    "dashboard": "لوحة التحكم"
  },
  "home": {
    "hero": {
      "title": "منصة B2B واحدة لكل احتياجات معرضك",
      "subtitle": "RFQ، عروض من 200+ مورد معتمد، ضمان مالي، فاتورة موحدة. كل ذلك بعمولة 5% فقط.",
      "ctaPrimary": "أنشئ طلباً مجاناً",
      "ctaSecondary": "كيف نعمل"
    },
    "stats": {
      "commission": "عمولة فقط",
      "suppliers": "مورد معتمد",
      "firstProposals": "أول العروض",
      "escrow": "حماية مالية"
    }
  },
  "auth": {
    "login": {
      "title": "تسجيل الدخول",
      "subtitle": "ادخل لإدارة طلباتك ومحادثاتك",
      "email": "البريد الإلكتروني",
      "password": "كلمة المرور",
      "submit": "ادخل",
      "forgotPassword": "نسيت كلمة المرور؟",
      "noAccount": "ليس لديك حساب؟",
      "createAccount": "أنشئ حساباً جديداً"
    },
    "signup": {
      "title": "إنشاء حساب جديد",
      "chooseRole": "اختر نوع حسابك للبدء",
      "client": {
        "title": "أنا شركة تبحث عن موردين",
        "desc": "أنشئ RFQ، استقبل عروض، ادفع بأمان"
      },
      "supplier": {
        "title": "أنا مورد خدمات معارض",
        "desc": "استقبل طلبات RFQ، قدّم عروضاً، احصل على دفعات مضمونة"
      }
    },
    "verifyEmail": {
      "title": "تحقق من بريدك الإلكتروني",
      "body": "أرسلنا رسالة تحقق إلى {email}. اضغط الرابط للتفعيل.",
      "resend": "أعد الإرسال",
      "checkSpam": "لا تجد الرسالة؟ تحقق من مجلد البريد المزعج (Spam)."
    },
    "errors": {
      "invalidCredentials": "بيانات الدخول غير صحيحة",
      "emailTaken": "هذا البريد مسجّل بالفعل",
      "weakPassword": "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل."
    }
  }
}
```

(English `en.json` translations added in Step 1.10 — focus on Arabic first.)

---

## Step 1.4 — Login page

### File: `app/[locale]/(auth)/login/page.tsx`

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LoginForm } from './login-form';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-midnight-green">{t('title')}</h1>
          <p className="text-sm text-stone-600">{t('subtitle')}</p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-stone-600">
          {t('noAccount')}{' '}
          <Link href="/signup" className="text-action-blue hover:underline font-medium">
            {t('createAccount')}
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### File: `app/[locale]/(auth)/login/login-form.tsx`

```tsx
'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { loginAction } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export function LoginForm() {
  const t = useTranslations('auth.login');
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <FormField
        name="email"
        type="email"
        label={t('email')}
        autoComplete="email"
        required
        error={state?.fieldErrors?.email?.[0]}
      />
      <FormField
        name="password"
        type="password"
        label={t('password')}
        autoComplete="current-password"
        required
        error={state?.fieldErrors?.password?.[0]}
      />
      {state && !state.ok && !state.fieldErrors && (
        <p className="text-sm text-danger" role="alert">{state.error}</p>
      )}
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs text-action-blue hover:underline"
        >
          {t('forgotPassword')}
        </Link>
      </div>
      <SubmitButton variant="brand" size="lg" className="w-full">
        {t('submit')}
      </SubmitButton>
    </form>
  );
}
```

---

## Step 1.5 — Signup role chooser

### File: `app/[locale]/(auth)/signup/page.tsx`

```tsx
import Link from 'next/link';
import { Building2, Wrench } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function SignupPage() {
  const t = useTranslations('auth.signup');
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-midnight-green">{t('title')}</h1>
          <p className="text-sm text-stone-600">{t('chooseRole')}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <RoleCard
            href="/signup/client/account"
            icon={Building2}
            title={t('client.title')}
            desc={t('client.desc')}
          />
          <RoleCard
            href="/signup/supplier/account"
            icon={Wrench}
            title={t('supplier.title')}
            desc={t('supplier.desc')}
          />
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 rounded-xl bg-stone-100 border border-stone-300 hover:border-midnight-green hover:bg-stone-200 transition-colors space-y-3"
    >
      <Icon className="size-8 text-midnight-green" />
      <h3 className="font-semibold text-charcoal">{title}</h3>
      <p className="text-sm text-stone-600 leading-relaxed">{desc}</p>
    </Link>
  );
}
```

---

## Step 1.6 — Client signup wizard (3 steps)

The client wizard uses **client-side state** (zustand) to hold values between steps, then submits everything in one Server Action call at the end. This keeps the URL clean (no draft IDs in the URL for unauthenticated users) and means we never persist partial signups.

### File: `lib/stores/signup-client-store.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ClientSignupState {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
  crNumber: string;
  city: string;
  industry: string;
  setField: <K extends keyof ClientSignupState>(
    key: K,
    value: ClientSignupState[K]
  ) => void;
  reset: () => void;
}

export const useClientSignupStore = create<ClientSignupState>()(
  persist(
    (set) => ({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      companyName: '',
      crNumber: '',
      city: '',
      industry: '',
      setField: (key, value) => set({ [key]: value } as never),
      reset: () =>
        set({
          email: '',
          password: '',
          fullName: '',
          phone: '',
          companyName: '',
          crNumber: '',
          city: '',
          industry: '',
        }),
    }),
    { name: 'signup-client-draft' }
  )
);
```

### File: `app/[locale]/(auth)/signup/client/layout.tsx`

```tsx
import type { ReactNode } from 'react';

export default function ClientSignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex items-start sm:items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  );
}
```

### File: `app/[locale]/(auth)/signup/client/account/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useClientSignupStore } from '@/lib/stores/signup-client-store';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { signupClientSchema } from '@/schemas/auth';

const STEPS = [{ label: 'حسابك' }, { label: 'شركتك' }, { label: 'تأكيد' }];

export default function AccountStep() {
  const router = useRouter();
  const store = useClientSignupStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validate just the account fields locally (subset of full schema)
    const subset = signupClientSchema.pick({
      email: true,
      password: true,
      fullName: true,
      phone: true,
    });
    const parsed = subset.safeParse({
      email: store.email,
      password: store.password,
      fullName: store.fullName,
      phone: store.phone,
    });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) fieldErrors[k] = v[0];
      }
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    router.push('/signup/client/company');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={1} />
      <h2 className="text-xl font-semibold text-midnight-green">معلومات الحساب</h2>
      <form onSubmit={onNext} className="space-y-4">
        <FormField
          label="الاسم الكامل"
          value={store.fullName}
          onChange={(e) => store.setField('fullName', e.target.value)}
          error={errors.fullName}
          required
        />
        <FormField
          label="البريد الإلكتروني"
          type="email"
          value={store.email}
          onChange={(e) => store.setField('email', e.target.value)}
          autoComplete="email"
          error={errors.email}
          required
        />
        <FormField
          label="رقم الجوال"
          value={store.phone}
          onChange={(e) => store.setField('phone', e.target.value)}
          dir="ltr"
          placeholder="+9665XXXXXXXX"
          hint="اكتبه بالصيغة الدولية: +9665XXXXXXXX"
          error={errors.phone}
          required
        />
        <FormField
          label="كلمة المرور"
          type="password"
          value={store.password}
          onChange={(e) => store.setField('password', e.target.value)}
          autoComplete="new-password"
          hint="8 أحرف على الأقل"
          error={errors.password}
          required
        />
        <Button type="submit" variant="brand" size="lg" className="w-full">
          التالي ←
        </Button>
      </form>
    </>
  );
}
```

### File: `app/[locale]/(auth)/signup/client/company/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useClientSignupStore } from '@/lib/stores/signup-client-store';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { signupClientSchema } from '@/schemas/auth';
import { CITIES } from '@/lib/constants/cities';

const STEPS = [{ label: 'حسابك' }, { label: 'شركتك' }, { label: 'تأكيد' }];

export default function CompanyStep() {
  const router = useRouter();
  const store = useClientSignupStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subset = signupClientSchema.pick({
      companyName: true,
      crNumber: true,
      city: true,
      industry: true,
    });
    const parsed = subset.safeParse({
      companyName: store.companyName,
      crNumber: store.crNumber,
      city: store.city,
      industry: store.industry,
    });
    if (!parsed.success) {
      const f: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) f[k] = v[0];
      }
      setErrors(f);
      return;
    }
    router.push('/signup/client/confirm');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={2} />
      <h2 className="text-xl font-semibold text-midnight-green">معلومات الشركة</h2>
      <form onSubmit={onNext} className="space-y-4">
        <FormField
          label="اسم الشركة"
          value={store.companyName}
          onChange={(e) => store.setField('companyName', e.target.value)}
          error={errors.companyName}
          required
        />
        <FormField
          label="رقم السجل التجاري (CR)"
          value={store.crNumber}
          onChange={(e) => store.setField('crNumber', e.target.value)}
          dir="ltr"
          placeholder="1010234567"
          hint="10 أرقام بالضبط"
          error={errors.crNumber}
          required
        />
        <div className="space-y-1.5">
          <label htmlFor="city" className="block text-sm font-medium text-charcoal">
            المدينة
          </label>
          <select
            id="city"
            value={store.city}
            onChange={(e) => store.setField('city', e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300 text-charcoal text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
            required
          >
            <option value="">اختر المدينة</option>
            {CITIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.ar}
              </option>
            ))}
          </select>
          {errors.city && <p className="text-xs text-danger">{errors.city}</p>}
        </div>
        <FormField
          label="القطاع / النشاط"
          value={store.industry}
          onChange={(e) => store.setField('industry', e.target.value)}
          placeholder="مثال: تكنولوجيا، عقارات، تجارة"
          error={errors.industry}
          required
        />
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
            ← السابق
          </Button>
          <Button type="submit" variant="brand" size="lg" className="flex-1">
            التالي ←
          </Button>
        </div>
      </form>
    </>
  );
}
```

### File: `app/[locale]/(auth)/signup/client/confirm/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useClientSignupStore } from '@/lib/stores/signup-client-store';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { signupClientAction } from '@/app/actions/auth';

const STEPS = [{ label: 'حسابك' }, { label: 'شركتك' }, { label: 'تأكيد' }];

export default function ConfirmStep() {
  const router = useRouter();
  const store = useClientSignupStore();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set('email', store.email);
      fd.set('password', store.password);
      fd.set('fullName', store.fullName);
      fd.set('phone', store.phone);
      fd.set('companyName', store.companyName);
      fd.set('crNumber', store.crNumber);
      fd.set('city', store.city);
      fd.set('industry', store.industry);
      const res = await signupClientAction(null, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      store.reset();
      router.push('/verify-email?email=' + encodeURIComponent(store.email));
    });
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={3} />
      <h2 className="text-xl font-semibold text-midnight-green">راجع وأكّد</h2>
      <div className="bg-stone-100 rounded-lg p-4 space-y-3 text-sm">
        <Row label="الاسم" value={store.fullName} />
        <Row label="البريد" value={store.email} />
        <Row label="الجوال" value={store.phone} dir="ltr" />
        <Row label="الشركة" value={store.companyName} />
        <Row label="السجل التجاري" value={store.crNumber} dir="ltr" />
        <Row label="المدينة" value={store.city} />
        <Row label="القطاع" value={store.industry} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <p className="text-xs text-stone-600">
        بإنشاء حساب، توافق على{' '}
        <a href="/terms" className="text-action-blue hover:underline">الشروط</a> و
        <a href="/privacy" className="text-action-blue hover:underline">سياسة الخصوصية</a>.
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
          ← السابق
        </Button>
        <Button onClick={onSubmit} disabled={pending} variant="brand" size="lg" className="flex-1">
          {pending ? 'جارٍ الإنشاء…' : 'أنشئ الحساب'}
        </Button>
      </div>
    </>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone-600">{label}</span>
      <span className="font-medium text-charcoal text-end" dir={dir}>{value}</span>
    </div>
  );
}
```

---

## Step 1.7 — Supplier signup wizard (4 steps)

Same pattern as client but with one extra step for specializations + bank info.

### File: `lib/stores/signup-supplier-store.ts`

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SupplierSignupState {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  companyName: string;
  crNumber: string;
  city: string;
  specializations: string[];
  cities: string[];
  bankName: string;
  iban: string;
  accountHolder: string;
  setField: <K extends keyof SupplierSignupState>(key: K, value: SupplierSignupState[K]) => void;
  reset: () => void;
}

const initial = {
  email: '', password: '', fullName: '', phone: '',
  companyName: '', crNumber: '', city: '',
  specializations: [], cities: [],
  bankName: '', iban: '', accountHolder: '',
};

export const useSupplierSignupStore = create<SupplierSignupState>()(
  persist(
    (set) => ({
      ...initial,
      setField: (key, value) => set({ [key]: value } as never),
      reset: () => set(initial),
    }),
    { name: 'signup-supplier-draft' }
  )
);
```

### File: `app/[locale]/(auth)/signup/supplier/layout.tsx`

```tsx
import type { ReactNode } from 'react';
export default function SupplierSignupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex items-start sm:items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">{children}</div>
    </div>
  );
}
```

### File: `app/[locale]/(auth)/signup/supplier/account/page.tsx`

(Identical to client account step, but uses `useSupplierSignupStore` and routes to `/signup/supplier/company` next. Copy the client account page and swap the store + step labels.)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSupplierSignupStore } from '@/lib/stores/signup-supplier-store';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { signupSupplierSchema } from '@/schemas/auth';

const STEPS = [
  { label: 'حسابك' },
  { label: 'شركتك' },
  { label: 'تخصصاتك' },
  { label: 'البنك' },
];

export default function AccountStep() {
  const router = useRouter();
  const store = useSupplierSignupStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const subset = signupSupplierSchema.pick({
      email: true, password: true, fullName: true, phone: true,
    });
    const parsed = subset.safeParse({
      email: store.email, password: store.password,
      fullName: store.fullName, phone: store.phone,
    });
    if (!parsed.success) {
      const f: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) f[k] = v[0];
      }
      setErrors(f);
      return;
    }
    router.push('/signup/supplier/company');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={1} />
      <h2 className="text-xl font-semibold text-midnight-green">معلومات الحساب</h2>
      <form onSubmit={onNext} className="space-y-4">
        <FormField label="الاسم الكامل" value={store.fullName} onChange={(e) => store.setField('fullName', e.target.value)} error={errors.fullName} required />
        <FormField label="البريد الإلكتروني" type="email" value={store.email} onChange={(e) => store.setField('email', e.target.value)} autoComplete="email" error={errors.email} required />
        <FormField label="رقم الجوال" value={store.phone} onChange={(e) => store.setField('phone', e.target.value)} dir="ltr" placeholder="+9665XXXXXXXX" error={errors.phone} required />
        <FormField label="كلمة المرور" type="password" value={store.password} onChange={(e) => store.setField('password', e.target.value)} autoComplete="new-password" hint="8 أحرف على الأقل" error={errors.password} required />
        <Button type="submit" variant="brand" size="lg" className="w-full">التالي ←</Button>
      </form>
    </>
  );
}
```

### File: `app/[locale]/(auth)/signup/supplier/company/page.tsx`

(Same as client company step but uses supplier store and routes to `/signup/supplier/specializations`.)

### File: `app/[locale]/(auth)/signup/supplier/specializations/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useSupplierSignupStore } from '@/lib/stores/signup-supplier-store';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { CITIES } from '@/lib/constants/cities';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  { label: 'حسابك' }, { label: 'شركتك' }, { label: 'تخصصاتك' }, { label: 'البنك' },
];

export default function SpecializationsStep() {
  const router = useRouter();
  const store = useSupplierSignupStore();
  const [error, setError] = useState<string | null>(null);

  const toggleSpec = (s: string) => {
    const next = store.specializations.includes(s)
      ? store.specializations.filter((x) => x !== s)
      : [...store.specializations, s];
    store.setField('specializations', next);
  };

  const toggleCity = (c: string) => {
    const next = store.cities.includes(c)
      ? store.cities.filter((x) => x !== c)
      : [...store.cities, c];
    store.setField('cities', next);
  };

  const onNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (store.specializations.length === 0) {
      setError('اختر تخصصاً واحداً على الأقل.');
      return;
    }
    if (store.cities.length === 0) {
      setError('اختر مدينة واحدة على الأقل تخدم بها.');
      return;
    }
    router.push('/signup/supplier/bank');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={3} />
      <h2 className="text-xl font-semibold text-midnight-green">تخصصاتك ومناطق الخدمة</h2>
      <form onSubmit={onNext} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">
            ماذا تقدّم؟ (اختر واحداً أو أكثر)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SERVICE_TYPES.map((s) => {
              const active = store.specializations.includes(s.value);
              return (
                <button
                  type="button"
                  key={s.value}
                  onClick={() => toggleSpec(s.value)}
                  className={cn(
                    'p-3 text-sm rounded-lg border-2 transition-colors text-start',
                    active
                      ? 'border-midnight-green bg-midnight-green-100 text-midnight-green'
                      : 'border-stone-300 bg-cream text-stone-600 hover:border-stone-600'
                  )}
                >
                  {s.ar}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">
            في أي مدن تستطيع التنفيذ؟
          </label>
          <div className="flex flex-wrap gap-2">
            {CITIES.map((c) => {
              const active = store.cities.includes(c.value);
              return (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => toggleCity(c.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full border transition-colors',
                    active
                      ? 'border-action-blue bg-action-blue text-cream'
                      : 'border-stone-300 bg-cream text-stone-600 hover:border-stone-600'
                  )}
                >
                  {c.ar}
                </button>
              );
            })}
          </div>
        </div>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>← السابق</Button>
          <Button type="submit" variant="brand" size="lg" className="flex-1">التالي ←</Button>
        </div>
      </form>
    </>
  );
}
```

### File: `app/[locale]/(auth)/signup/supplier/bank/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useSupplierSignupStore } from '@/lib/stores/signup-supplier-store';
import { FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { signupSupplierAction } from '@/app/actions/auth';
import { signupSupplierSchema } from '@/schemas/auth';

const STEPS = [
  { label: 'حسابك' }, { label: 'شركتك' }, { label: 'تخصصاتك' }, { label: 'البنك' },
];

const SAUDI_BANKS = [
  { value: 'alrajhi', label: 'مصرف الراجحي' },
  { value: 'snb', label: 'البنك الأهلي السعودي (SNB)' },
  { value: 'riyad', label: 'بنك الرياض' },
  { value: 'sab', label: 'SAB' },
  { value: 'albilad', label: 'بنك البلاد' },
  { value: 'anb', label: 'البنك العربي الوطني' },
  { value: 'inma', label: 'مصرف الإنماء' },
  { value: 'other', label: 'بنك آخر' },
];

export default function BankStep() {
  const router = useRouter();
  const store = useSupplierSignupStore();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({}); setGlobalError(null);

    const parsed = signupSupplierSchema.safeParse({
      email: store.email, password: store.password, fullName: store.fullName, phone: store.phone,
      companyName: store.companyName, crNumber: store.crNumber, city: store.city,
      specializations: store.specializations, cities: store.cities,
      bankName: store.bankName, iban: store.iban, accountHolder: store.accountHolder,
    });

    if (!parsed.success) {
      const f: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed.error.flatten().fieldErrors)) {
        if (v?.[0]) f[k] = v[0];
      }
      setErrors(f);
      return;
    }

    start(async () => {
      const fd = new FormData();
      Object.entries(parsed.data).forEach(([k, v]) => {
        if (Array.isArray(v)) fd.set(k, JSON.stringify(v));
        else fd.set(k, String(v));
      });
      const res = await signupSupplierAction(null, fd);
      if (!res.ok) { setGlobalError(res.error); return; }
      store.reset();
      router.push('/verify-email?email=' + encodeURIComponent(store.email));
    });
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={4} />
      <h2 className="text-xl font-semibold text-midnight-green">حسابك البنكي للدفعات</h2>
      <p className="text-xs text-stone-600">
        نحتاج هذا لتحويل مستحقاتك بعد كل صفقة. لن نخصم منه أي مبلغ.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-charcoal">البنك</label>
          <select
            value={store.bankName}
            onChange={(e) => store.setField('bankName', e.target.value)}
            className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300 text-charcoal text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
            required
          >
            <option value="">اختر بنكك</option>
            {SAUDI_BANKS.map((b) => (
              <option key={b.value} value={b.label}>{b.label}</option>
            ))}
          </select>
          {errors.bankName && <p className="text-xs text-danger">{errors.bankName}</p>}
        </div>
        <FormField
          label="رقم الـ IBAN"
          value={store.iban}
          onChange={(e) => store.setField('iban', e.target.value.toUpperCase())}
          dir="ltr"
          placeholder="SA00 0000 0000 0000 0000 0000"
          hint="يبدأ بـ SA ويتكون من 24 حرفاً ورقماً"
          error={errors.iban}
          required
        />
        <FormField
          label="اسم صاحب الحساب (كما هو في البنك)"
          value={store.accountHolder}
          onChange={(e) => store.setField('accountHolder', e.target.value)}
          error={errors.accountHolder}
          required
        />
        {globalError && <p className="text-sm text-danger" role="alert">{globalError}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>← السابق</Button>
          <Button type="submit" variant="brand" size="lg" className="flex-1" disabled={pending}>
            {pending ? 'جارٍ الإنشاء…' : 'أنشئ الحساب'}
          </Button>
        </div>
      </form>
    </>
  );
}
```

---

## Step 1.8 — Verify email + forgot/reset password

### File: `app/[locale]/(auth)/verify-email/page.tsx`

```tsx
import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return <VerifyEmailInner searchParams={searchParams} />;
}

async function VerifyEmailInner({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return <Content email={email} />;
}

function Content({ email }: { email?: string }) {
  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-sm space-y-6 text-center">
        <Mail className="size-12 text-midnight-green mx-auto" />
        <h1 className="text-2xl font-bold text-midnight-green">تحقق من بريدك الإلكتروني</h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          أرسلنا رسالة تحقق إلى{' '}
          <span className="font-medium text-charcoal" dir="ltr">{email ?? 'بريدك'}</span>.
          اضغط الرابط داخل الرسالة للتفعيل.
        </p>
        <p className="text-xs text-stone-600">
          لا تجد الرسالة؟ تحقق من مجلد البريد المزعج (Spam).
        </p>
      </div>
    </div>
  );
}
```

### File: `app/[locale]/(auth)/forgot-password/page.tsx`

```tsx
'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPasswordAction } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, null);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-midnight-green">نسيت كلمة المرور؟</h1>
          <p className="text-sm text-stone-600">
            اكتب بريدك وسنرسل لك رابطاً لإعادة التعيين.
          </p>
        </div>
        {state?.ok ? (
          <div className="bg-success-100 border border-success/30 text-success p-4 rounded-md text-sm">
            تحقق من بريدك. أرسلنا رابطاً لإعادة تعيين كلمة المرور.
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <FormField
              name="email"
              type="email"
              label="البريد الإلكتروني"
              required
              error={state?.fieldErrors?.email?.[0]}
            />
            <SubmitButton variant="brand" size="lg" className="w-full">
              أرسل الرابط
            </SubmitButton>
          </form>
        )}
        <p className="text-center text-sm">
          <Link href="/login" className="text-action-blue hover:underline">
            ← العودة لتسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
```

### File: `app/[locale]/(auth)/reset-password/page.tsx`

```tsx
'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordAction } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [state, action] = useActionState(updatePasswordAction, null);

  useEffect(() => {
    if (state?.ok) router.push('/login');
  }, [state, router]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-midnight-green">كلمة مرور جديدة</h1>
          <p className="text-sm text-stone-600">اختر كلمة مرور قوية (8 أحرف على الأقل).</p>
        </div>
        <form action={action} className="space-y-4">
          <FormField
            name="password"
            type="password"
            label="كلمة المرور الجديدة"
            autoComplete="new-password"
            required
            error={state?.fieldErrors?.password?.[0]}
          />
          <FormField
            name="confirmPassword"
            type="password"
            label="تأكيد كلمة المرور"
            autoComplete="new-password"
            required
            error={state?.fieldErrors?.confirmPassword?.[0]}
          />
          {state && !state.ok && !state.fieldErrors && (
            <p className="text-sm text-danger">{state.error}</p>
          )}
          <SubmitButton variant="brand" size="lg" className="w-full">
            احفظ
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
```

### Update `schemas/auth.ts` — add resetPasswordSchema and updatePasswordSchema

(Should already exist from Phase 0 step 0.16. If not, add:)

```ts
export const resetPasswordSchema = z.object({
  email: z.string().email({ message: 'البريد غير صحيح' }),
});

export const updatePasswordSchema = z
  .object({
    password: z.string().min(8, { message: '8 أحرف على الأقل' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  });
```

---

## Step 1.9 — Authenticated layouts and dashboards

### File: `app/[locale]/(client)/layout.tsx`

```tsx
import type { ReactNode } from 'react';
import { requireRole } from '@/lib/auth/require-role';
import { ClientSidebar } from '@/components/client/sidebar';
import { ClientHeader } from '@/components/client/header';

export default async function ClientLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(['client']);

  return (
    <div className="min-h-screen bg-cream flex">
      <ClientSidebar />
      <div className="flex-1 flex flex-col">
        <ClientHeader user={user} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
```

### File: `components/client/sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, MessagesSquare, Wallet, Settings } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/dashboard/rfqs', icon: FileText, label: 'طلباتي' },
  { href: '/dashboard/chats', icon: MessagesSquare, label: 'المحادثات' },
  { href: '/dashboard/wallet', icon: Wallet, label: 'المحفظة' },
  { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
];

export function ClientSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 bg-stone-100 border-e border-stone-300 flex-col">
      <div className="p-4 border-b border-stone-300">
        <Link href="/dashboard" className="font-bold text-midnight-green">
          تطبيق المعارض
        </Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-midnight-green text-cream' : 'text-charcoal hover:bg-stone-200'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### File: `components/client/header.tsx`

```tsx
import { logoutAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';

interface Props {
  user: { id: string; email: string; full_name: string | null; role: string };
}

export function ClientHeader({ user }: Props) {
  return (
    <header className="h-14 border-b border-stone-300 bg-cream flex items-center justify-between px-4">
      <div className="text-sm text-stone-600">
        مرحباً، <span className="font-medium text-charcoal">{user.full_name ?? user.email}</span>
      </div>
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" size="sm">تسجيل الخروج</Button>
      </form>
    </header>
  );
}
```

### File: `app/[locale]/(client)/dashboard/page.tsx`

```tsx
import Link from 'next/link';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ClientDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-midnight-green">لوحة التحكم</h1>
        <p className="text-sm text-stone-600 mt-1">
          ابدأ بإنشاء أول طلب — ستصل العروض خلال 24 ساعة.
        </p>
      </div>
      {/* Empty state — Phase 2 will replace this with real data */}
      <div className="bg-stone-100 rounded-xl p-8 text-center space-y-4">
        <FileText className="size-12 text-stone-600 mx-auto" />
        <div className="space-y-1">
          <h2 className="font-semibold text-charcoal">لم تنشئ أي طلب بعد</h2>
          <p className="text-sm text-stone-600">
            أنشئ أول RFQ لتستقبل عروضاً من موردين معتمدين.
          </p>
        </div>
        <Button asChild variant="brand">
          <Link href="/dashboard/rfqs/new">أنشئ طلباً</Link>
        </Button>
      </div>
    </div>
  );
}
```

### File: `app/[locale]/(supplier)/layout.tsx`

```tsx
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { SupplierSidebar } from '@/components/supplier/sidebar';
import { SupplierHeader } from '@/components/supplier/header';

export default async function SupplierLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(['supplier']);

  // Check supplier status — pending suppliers go to /supplier/pending only
  const supabase = await createClient();
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!supplier) redirect('/login');

  return (
    <div className="min-h-screen bg-cream flex">
      <SupplierSidebar status={supplier.status} />
      <div className="flex-1 flex flex-col">
        <SupplierHeader user={user} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
```

### File: `components/supplier/sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Inbox, FileText, MessagesSquare, Wallet, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/supplier', icon: LayoutDashboard, label: 'لوحة التحكم' },
  { href: '/supplier/rfqs', icon: Inbox, label: 'الطلبات المتاحة' },
  { href: '/supplier/proposals', icon: FileText, label: 'عروضي' },
  { href: '/supplier/chats', icon: MessagesSquare, label: 'المحادثات' },
  { href: '/supplier/earnings', icon: Wallet, label: 'الأرباح' },
  { href: '/supplier/profile', icon: User, label: 'ملفي' },
];

export function SupplierSidebar({ status }: { status: string }) {
  const pathname = usePathname();
  // While pending, only Profile is accessible
  const items = status === 'approved' ? NAV : NAV.filter((n) => n.href === '/supplier' || n.href === '/supplier/profile');

  return (
    <aside className="hidden md:flex w-60 bg-stone-100 border-e border-stone-300 flex-col">
      <div className="p-4 border-b border-stone-300">
        <Link href="/supplier" className="font-bold text-midnight-green">
          تطبيق المعارض
        </Link>
        <p className="text-xs text-stone-600 mt-1">حساب مورد</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active ? 'bg-midnight-green text-cream' : 'text-charcoal hover:bg-stone-200'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### File: `components/supplier/header.tsx`

(Same as client header — copy and rename.)

### File: `app/[locale]/(supplier)/supplier/page.tsx` — pending or approved

```tsx
import { redirect } from 'next/navigation';
import { Clock, CheckCircle2 } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

export default async function SupplierHomePage() {
  const user = await requireRole(['supplier']);
  const supabase = await createClient();
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('status')
    .eq('id', user.id)
    .single();

  if (!supplier) redirect('/login');

  if (supplier.status === 'pending') {
    return (
      <div className="max-w-md mx-auto mt-12 space-y-6 text-center">
        <Clock className="size-16 text-warning mx-auto" />
        <h1 className="text-2xl font-bold text-midnight-green">حسابك قيد المراجعة</h1>
        <p className="text-sm text-stone-600 leading-relaxed">
          يقوم فريق Admin بمراجعة بياناتك. تستغرق العملية عادةً 24-48 ساعة.
          سنرسل بريداً عند الموافقة.
        </p>
        <div className="bg-warning-100 border border-warning/30 rounded-md p-4 text-xs text-warning text-start">
          <strong className="block mb-1">حتى يتم الاعتماد:</strong>
          لن تستطيع تقديم عروض أو الدخول للمحادثات. يمكنك تعديل ملفك من قائمة "ملفي".
        </div>
      </div>
    );
  }

  if (supplier.status === 'approved') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-5 text-success" />
          <h1 className="text-2xl font-bold text-midnight-green">أهلاً بك</h1>
        </div>
        <p className="text-sm text-stone-600">
          حسابك مفعّل. ابدأ بتصفّح الطلبات المتاحة لتقديم أول عرض.
        </p>
      </div>
    );
  }

  // suspended
  return (
    <div className="max-w-md mx-auto mt-12 space-y-4 text-center">
      <h1 className="text-2xl font-bold text-danger">حسابك موقوف</h1>
      <p className="text-sm text-stone-600">
        تواصل مع Admin لمزيد من المعلومات.
      </p>
    </div>
  );
}
```

---

## Step 1.10 — Admin: approve suppliers

### File: `app/admin/login/page.tsx`

(Admins do NOT have a locale prefix — they're an internal interface.)

```tsx
'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function AdminLoginPage() {
  const [state, action] = useActionState(loginAction, null);

  return (
    <div className="min-h-screen bg-charcoal flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 bg-cream p-8 rounded-xl">
        <h1 className="text-xl font-bold text-midnight-green text-center">Admin Login</h1>
        <form action={action} className="space-y-4">
          <FormField name="email" type="email" label="Email" required />
          <FormField name="password" type="password" label="Password" required />
          {state && !state.ok && <p className="text-sm text-danger">{state.error}</p>}
          <SubmitButton variant="brand" size="lg" className="w-full">Login</SubmitButton>
        </form>
      </div>
    </div>
  );
}
```

### File: `app/admin/layout.tsx`

```tsx
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth/require-role';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Bypass requireRole on /admin/login itself
  const h = await headers();
  const path = h.get('x-pathname') ?? '';
  if (path === '/admin/login') return <>{children}</>;

  const user = await requireRole(['admin']);

  return (
    <div className="min-h-screen bg-cream flex" dir="ltr">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader user={user} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
```

(Note: To make `x-pathname` available, set it in `app/proxy.ts` — already handled by the Phase 0 proxy. If not, add: `requestHeaders.set('x-pathname', request.nextUrl.pathname);` before returning.)

### File: `components/admin/sidebar.tsx`

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, FileText, MessagesSquare, ShieldAlert, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/admin/suppliers/pending', icon: Users, label: 'Pending Suppliers' },
  { href: '/admin/rfqs', icon: FileText, label: 'RFQs' },
  { href: '/admin/chats', icon: MessagesSquare, label: 'Active Chats' },
  { href: '/admin/panic', icon: ShieldAlert, label: 'Panic Alerts' },
  { href: '/admin/escrow', icon: Wallet, label: 'Escrow' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 bg-charcoal text-cream flex-col">
      <div className="p-4 border-b border-stone-600">
        <Link href="/admin" className="font-bold text-dune-gold">Admin Panel</Link>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm',
                active ? 'bg-midnight-green text-cream' : 'text-cream/80 hover:bg-stone-600/30'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### File: `app/admin/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const [
    { count: pendingSuppliers },
    { count: activeRfqs },
    { count: activeChats },
  ] = await Promise.all([
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('rfqs').select('*', { count: 'exact', head: true }).in('status', ['open', 'negotiating']),
    supabase.from('chats').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Pending Suppliers" value={pendingSuppliers ?? 0} href="/admin/suppliers/pending" />
        <Stat label="Active RFQs" value={activeRfqs ?? 0} href="/admin/rfqs" />
        <Stat label="Active Chats" value={activeChats ?? 0} href="/admin/chats" />
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} className="block p-6 bg-stone-100 rounded-xl border border-stone-300 hover:border-midnight-green">
      <div className="text-3xl font-bold text-midnight-green num">{value}</div>
      <div className="text-sm text-stone-600 mt-1">{label}</div>
    </a>
  );
}
```

### File: `app/admin/suppliers/pending/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';
import { ApproveSupplierButton, RejectSupplierButton } from './actions-client';

export default async function PendingSuppliersPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from('suppliers')
    .select(`
      id, status, specializations, cities, created_at,
      profiles!inner(email, full_name, phone),
      companies!inner(name, cr_number, city)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pending Suppliers ({pending?.length ?? 0})</h1>
      {(!pending || pending.length === 0) ? (
        <p className="text-stone-600 text-sm">No suppliers waiting for approval.</p>
      ) : (
        <div className="space-y-3">
          {pending.map((s: any) => (
            <div key={s.id} className="bg-stone-100 rounded-xl p-4 border border-stone-300">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-2 flex-1 min-w-0">
                  <div>
                    <h3 className="font-semibold">{s.companies.name}</h3>
                    <p className="text-xs text-stone-600">CR: <span className="num">{s.companies.cr_number}</span> · {s.companies.city}</p>
                  </div>
                  <div className="text-sm">
                    <strong>Contact:</strong> {s.profiles.full_name} ·{' '}
                    <span className="num">{s.profiles.email}</span> ·{' '}
                    <span className="num">{s.profiles.phone}</span>
                  </div>
                  <div className="text-sm">
                    <strong>Services:</strong> {s.specializations.join(', ')}
                  </div>
                  <div className="text-sm">
                    <strong>Service cities:</strong> {s.cities.join(', ')}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <ApproveSupplierButton supplierId={s.id} />
                  <RejectSupplierButton supplierId={s.id} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/admin/suppliers/pending/actions-client.tsx`

```tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { approveSupplierAction, rejectSupplierAction } from '@/app/actions/admin';

export function ApproveSupplierButton({ supplierId }: { supplierId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="brand"
      disabled={pending}
      onClick={() => start(async () => { await approveSupplierAction(supplierId); })}
    >
      {pending ? '…' : 'Approve'}
    </Button>
  );
}

export function RejectSupplierButton({ supplierId }: { supplierId: string }) {
  const [pending, start] = useTransition();
  const onClick = () => {
    const reason = window.prompt('Rejection reason (sent to supplier):');
    if (!reason || reason.trim().length < 10) return;
    start(async () => { await rejectSupplierAction(supplierId, reason); });
  };
  return (
    <Button size="sm" variant="destructive" disabled={pending} onClick={onClick}>
      {pending ? '…' : 'Reject'}
    </Button>
  );
}
```

### File: `app/actions/admin.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';

export async function approveSupplierAction(supplierId: string) {
  const admin = await requireRole(['admin']);
  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Update supplier
  const { error } = await supabase
    .from('suppliers')
    .update({ status: 'approved', approved_at: new Date().toISOString(), approved_by: admin.id })
    .eq('id', supplierId);

  if (error) throw new Error(error.message);

  // Audit log
  await adminClient.from('audit_logs').insert({
    user_id: admin.id,
    action: 'approve_supplier',
    resource_type: 'supplier',
    resource_id: supplierId,
  });

  // Notification (in-app)
  await adminClient.from('notifications').insert({
    user_id: supplierId,
    type: 'supplier_approved',
    title: 'حسابك مفعّل!',
    body: 'يمكنك الآن تصفح الطلبات وتقديم العروض.',
    link: '/supplier',
  });

  // Email — Phase 1 ships with placeholder; real Resend integration in Phase 2
  // TODO: send activation email via Resend

  revalidatePath('/admin/suppliers/pending');
}

export async function rejectSupplierAction(supplierId: string, reason: string) {
  const admin = await requireRole(['admin']);
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { error } = await supabase
    .from('suppliers')
    .update({ status: 'suspended', rejection_reason: reason })
    .eq('id', supplierId);

  if (error) throw new Error(error.message);

  await adminClient.from('audit_logs').insert({
    user_id: admin.id,
    action: 'reject_supplier',
    resource_type: 'supplier',
    resource_id: supplierId,
    metadata: { reason },
  });

  await adminClient.from('notifications').insert({
    user_id: supplierId,
    type: 'supplier_rejected',
    title: 'لم يتم اعتماد حسابك',
    body: reason,
  });

  revalidatePath('/admin/suppliers/pending');
}
```

> If the suppliers table is missing `rejection_reason` or `approved_at` / `approved_by` columns, add a migration `20260514000001_supplier_status_fields.sql`:
>
> ```sql
> ALTER TABLE suppliers
>   ADD COLUMN IF NOT EXISTS approved_at timestamptz,
>   ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES profiles(id),
>   ADD COLUMN IF NOT EXISTS rejection_reason text;
> ```

---

## Step 1.11 — Tests

### File: `tests/unit/actions/auth.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { loginSchema, signupClientSchema, signupSupplierSchema } from '@/schemas/auth';

describe('auth schemas (action contracts)', () => {
  it('login: rejects empty email', () => {
    const r = loginSchema.safeParse({ email: '', password: 'pass1234' });
    expect(r.success).toBe(false);
  });

  it('login: rejects short password', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'short' });
    expect(r.success).toBe(false);
  });

  it('login: accepts valid', () => {
    const r = loginSchema.safeParse({ email: 'a@b.com', password: 'longenough1' });
    expect(r.success).toBe(true);
  });

  it('client signup: rejects CR with letters', () => {
    const r = signupClientSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'محمد', phone: '+966500000000',
      companyName: 'الفجر', crNumber: 'ABC1234567', city: 'riyadh', industry: 'tech',
    });
    expect(r.success).toBe(false);
  });

  it('client signup: rejects 9-digit CR', () => {
    const r = signupClientSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'محمد', phone: '+966500000000',
      companyName: 'الفجر', crNumber: '123456789', city: 'riyadh', industry: 'tech',
    });
    expect(r.success).toBe(false);
  });

  it('client signup: accepts valid', () => {
    const r = signupClientSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'محمد', phone: '+966500000000',
      companyName: 'الفجر', crNumber: '1010234567', city: 'riyadh', industry: 'tech',
    });
    expect(r.success).toBe(true);
  });

  it('supplier signup: rejects empty specializations', () => {
    const r = signupSupplierSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'سعد', phone: '+966500000000',
      companyName: 'برج', crNumber: '1010234567', city: 'riyadh',
      specializations: [], cities: ['riyadh'],
      bankName: 'الراجحي', iban: 'SA0000000000000000000000', accountHolder: 'سعد',
    });
    expect(r.success).toBe(false);
  });

  it('supplier signup: rejects invalid IBAN', () => {
    const r = signupSupplierSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'سعد', phone: '+966500000000',
      companyName: 'برج', crNumber: '1010234567', city: 'riyadh',
      specializations: ['booth'], cities: ['riyadh'],
      bankName: 'الراجحي', iban: 'INVALID', accountHolder: 'سعد',
    });
    expect(r.success).toBe(false);
  });

  it('supplier signup: accepts valid IBAN', () => {
    const r = signupSupplierSchema.safeParse({
      email: 'a@b.com', password: 'longenough1',
      fullName: 'سعد', phone: '+966500000000',
      companyName: 'برج', crNumber: '1010234567', city: 'riyadh',
      specializations: ['booth'], cities: ['riyadh'],
      bankName: 'الراجحي', iban: 'SA0380000000608010167519', accountHolder: 'سعد',
    });
    expect(r.success).toBe(true);
  });
});
```

### File: `tests/integration/auth.test.ts`

This is an integration test that hits a local Supabase. Requires `supabase start` to be running and a test database isolation strategy.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Use anon key with the local Supabase instance — DO NOT run against staging/prod
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

describe.skipIf(!process.env.RUN_INTEGRATION)('auth integration', () => {
  beforeEach(async () => {
    // Clean test users — only those with @test.local
    const { data: users } = await admin.auth.admin.listUsers();
    for (const u of users.users) {
      if (u.email?.endsWith('@test.local')) {
        await admin.auth.admin.deleteUser(u.id);
      }
    }
  });

  it('signs up a new user', async () => {
    const email = `test-${Date.now()}@test.local`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password: 'longenough1',
    });
    expect(error).toBeNull();
    expect(data.user?.email).toBe(email);
  });

  it('cannot read profiles of other users without auth', async () => {
    // Create a user via admin
    const { data: u } = await admin.auth.admin.createUser({
      email: `victim-${Date.now()}@test.local`,
      password: 'longenough1',
      email_confirm: true,
    });

    // Insert a profile via admin
    await admin.from('profiles').insert({
      id: u.user!.id, email: u.user!.email!, full_name: 'Victim', role: 'client',
    });

    // Try anon read — should be 0 rows due to RLS
    const { data } = await supabase.from('profiles').select('*');
    expect(data?.length ?? 0).toBe(0);
  });
});
```

Run integration tests with:

```bash
RUN_INTEGRATION=1 pnpm vitest run tests/integration
```

Add to `package.json` scripts:

```json
{
  "test:integration": "RUN_INTEGRATION=1 vitest run tests/integration"
}
```

---

## Step 1.12 — E2E happy-path test (Playwright)

Add Playwright in this phase. (Not added in Phase 0 to keep that phase minimal.)

```bash
pnpm add -D @playwright/test
pnpm exec playwright install --with-deps chromium
```

### File: `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  fullyParallel: false, // signup tests share state — keep serial
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    locale: 'ar-SA',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

### File: `tests/e2e/signup-client.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test('client can complete signup wizard', async ({ page }) => {
  const email = `client-e2e-${Date.now()}@test.local`;

  await page.goto('/ar/signup');
  await page.getByText('أنا شركة تبحث عن موردين').click();

  // Step 1: account
  await page.getByLabel('الاسم الكامل').fill('محمد التميمي');
  await page.getByLabel('البريد الإلكتروني').fill(email);
  await page.getByLabel('رقم الجوال').fill('+966501234567');
  await page.getByLabel('كلمة المرور').fill('longenough1');
  await page.getByRole('button', { name: 'التالي' }).click();

  // Step 2: company
  await page.getByLabel('اسم الشركة').fill('شركة الفجر للتقنية');
  await page.getByLabel('رقم السجل التجاري (CR)').fill('1010234567');
  await page.getByLabel('المدينة').selectOption('riyadh');
  await page.getByLabel('القطاع / النشاط').fill('تقنية');
  await page.getByRole('button', { name: 'التالي' }).click();

  // Step 3: confirm
  await expect(page.getByText('محمد التميمي')).toBeVisible();
  await expect(page.getByText('شركة الفجر للتقنية')).toBeVisible();
  await page.getByRole('button', { name: 'أنشئ الحساب' }).click();

  // Should land on verify-email
  await expect(page).toHaveURL(/verify-email/);
  await expect(page.getByText('تحقق من بريدك الإلكتروني')).toBeVisible();
});
```

### Update `package.json`

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

---

## Step 1.13 — Acceptance checklist

Before marking Phase 1 done, verify:

- [ ] `pnpm dev` starts without errors
- [ ] `/ar` shows the marketing homepage with hero + stats
- [ ] `/ar/login` accepts a valid login → redirects to `/ar/dashboard` for clients, `/ar/supplier` for suppliers
- [ ] `/ar/signup` shows two role cards
- [ ] Client signup: 3 steps, end on `/ar/verify-email?email=...`, profile + company rows exist in DB
- [ ] Supplier signup: 4 steps, supplier row created with `status='pending'`
- [ ] `/ar/forgot-password` sends a Supabase-templated reset email
- [ ] `/admin/login` works (use a manually-seeded admin user)
- [ ] Admin can see pending suppliers and click Approve → supplier `status` becomes `approved` and `notifications` row created
- [ ] Logout from any dashboard returns to `/login`
- [ ] All RLS policies enforced: open an incognito window logged in as Client A, check that Client B's RFQs are not visible
- [ ] `pnpm test` passes (≥9 schema tests + the rest from Phase 0)
- [ ] `pnpm test:e2e` passes (signup happy path)
- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] Mobile (375px) check: signup wizards readable, no horizontal scroll
- [ ] RTL check: forms align right, button arrows point correctly

To seed an admin user manually (one-time):

```sql
-- In Supabase SQL editor on the local DB
-- After signing up an account via the regular flow, run:
UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
```

---

## Files created in Phase 1 (summary)

```
app/actions/auth.ts
app/actions/admin.ts
app/[locale]/(marketing)/layout.tsx
app/[locale]/(marketing)/page.tsx
app/[locale]/(auth)/login/page.tsx
app/[locale]/(auth)/login/login-form.tsx
app/[locale]/(auth)/signup/page.tsx
app/[locale]/(auth)/signup/client/layout.tsx
app/[locale]/(auth)/signup/client/account/page.tsx
app/[locale]/(auth)/signup/client/company/page.tsx
app/[locale]/(auth)/signup/client/confirm/page.tsx
app/[locale]/(auth)/signup/supplier/layout.tsx
app/[locale]/(auth)/signup/supplier/account/page.tsx
app/[locale]/(auth)/signup/supplier/company/page.tsx
app/[locale]/(auth)/signup/supplier/specializations/page.tsx
app/[locale]/(auth)/signup/supplier/bank/page.tsx
app/[locale]/(auth)/verify-email/page.tsx
app/[locale]/(auth)/forgot-password/page.tsx
app/[locale]/(auth)/reset-password/page.tsx
app/[locale]/(client)/layout.tsx
app/[locale]/(client)/dashboard/page.tsx
app/[locale]/(supplier)/layout.tsx
app/[locale]/(supplier)/supplier/page.tsx
app/admin/login/page.tsx
app/admin/layout.tsx
app/admin/page.tsx
app/admin/suppliers/pending/page.tsx
app/admin/suppliers/pending/actions-client.tsx
components/ui/form-field.tsx
components/ui/submit-button.tsx
components/ui/wizard-stepper.tsx
components/marketing/header.tsx
components/marketing/footer.tsx
components/client/sidebar.tsx
components/client/header.tsx
components/supplier/sidebar.tsx
components/supplier/header.tsx
components/admin/sidebar.tsx
components/admin/header.tsx
lib/stores/signup-client-store.ts
lib/stores/signup-supplier-store.ts
playwright.config.ts
supabase/migrations/20260514000001_supplier_status_fields.sql
tests/unit/actions/auth.test.ts
tests/integration/auth.test.ts
tests/e2e/signup-client.spec.ts
```

**Lines of code (estimate)**: ~2,200 implementation, ~400 tests.

**End of Phase 1.** The platform now has a working authentication boundary, role-based dashboards, and a manual supplier approval flow. Phase 2 builds the RFQ creation wizard on top of this foundation.
