import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">404</h1>
      <p className="mt-2 text-[var(--color-stone-600)]">
        الصفحة غير موجودة. ربما تم نقلها أو حذفها.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[var(--color-action-blue)] px-6 py-3 text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
      >
        العودة للرئيسية
      </Link>
    </main>
  );
}
