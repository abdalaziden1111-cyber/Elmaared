import Link from 'next/link';
import { Building2, Hammer } from 'lucide-react';

export default function SignupRoleChooserPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
        اختر نوع حسابك
      </h1>
      <p className="mt-2 text-[var(--color-stone-600)]">
        تطبيق المعارض يخدم نوعين من المستخدمين. اختر ما يناسبك.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/signup/client/account"
          className="group rounded-2xl border border-[var(--color-stone-300)] bg-white p-6 transition-colors hover:border-[var(--color-action-blue)]"
        >
          <Building2 className="size-8 text-[var(--color-midnight-green)]" />
          <h2 className="mt-4 text-lg font-semibold text-[var(--color-charcoal)]">
            شركة (عميل)
          </h2>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            أبحث عن موردين لمعارضي وفعالياتي. أدير طلباتي من مكان واحد.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-[var(--color-action-blue)]">
            ابدأ كعميل ←
          </span>
        </Link>

        <Link
          href="/signup/supplier/account"
          className="group rounded-2xl border border-[var(--color-stone-300)] bg-white p-6 transition-colors hover:border-[var(--color-action-blue)]"
        >
          <Hammer className="size-8 text-[var(--color-midnight-green)]" />
          <h2 className="mt-4 text-lg font-semibold text-[var(--color-charcoal)]">
            مورد
          </h2>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            أقدم خدمات للمعارض والفعاليات. أوصل عروضي للشركات بدون عمولة وسيط.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-[var(--color-action-blue)]">
            ابدأ كمورد ←
          </span>
        </Link>
      </div>

      <p className="mt-8 text-center text-sm text-[var(--color-stone-600)]">
        لديك حساب بالفعل؟{' '}
        <Link href="/login" className="text-[var(--color-action-blue)]">
          سجّل دخولك
        </Link>
      </p>
    </main>
  );
}
