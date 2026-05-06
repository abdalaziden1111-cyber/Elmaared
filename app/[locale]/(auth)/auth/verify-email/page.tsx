import Link from 'next/link';
import { Mail } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      <Mail className="size-12 text-[var(--color-action-blue)]" />
      <h1 className="mt-4 text-2xl font-semibold text-[var(--color-midnight-green)]">
        تحقق من بريدك الإلكتروني
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        أرسلنا لك رابط تأكيد. افتحه لتفعيل حسابك. إذا لم يصلك خلال دقيقتين، تحقق
        من مجلد البريد المزعج (Spam).
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
      >
        العودة لتسجيل الدخول
      </Link>
    </main>
  );
}
