import { Link } from '@/lib/i18n/routing';
import { Calendar } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { Stepper } from '../welcome/page';

const EXHIBITIONS = [
  { slug: 'leap-2027', name: 'LEAP 2027', city: 'الرياض', date: '2027-02-08' },
  { slug: 'cityscape-2026', name: 'Cityscape Global 2026', city: 'الرياض', date: '2026-11-10' },
  { slug: 'gitex-saudi-2026', name: 'GITEX Saudi Arabia 2026', city: 'الرياض', date: '2026-10-05' },
];

export default async function OnboardingExhibitionPage() {
  await requireRole(['client']);
  const fmt = new Intl.DateTimeFormat('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Stepper current={2} />

      <h1 className="mt-8 text-3xl font-semibold text-[var(--color-midnight-green)]">
        ما المعرض الذي تجهّز له؟
      </h1>
      <p className="mt-3 text-sm text-[var(--color-stone-600)]">
        نستخدم تاريخ المعرض لاقتراح المهلة المناسبة لطلباتك. (يمكنك التغيير لاحقاً.)
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-3">
        {EXHIBITIONS.map((ex) => (
          <li
            key={ex.slug}
            className="overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white"
          >
            <div className="bg-[var(--color-midnight-green)] px-4 py-3 text-[var(--color-cream)]">
              <p className="text-sm font-semibold">{ex.name}</p>
              <p className="mt-1 text-xs opacity-90 flex items-center gap-1">
                <Calendar className="size-3" aria-hidden /> {fmt.format(new Date(ex.date))}
              </p>
            </div>
            <div className="p-4">
              <p className="text-xs text-[var(--color-stone-600)]">المدينة: {ex.city}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-6 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white px-4 py-3 text-center text-xs text-[var(--color-stone-600)]">
        ربط الاختيار بحساب العميل قادم في مرحلة لاحقة.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/onboarding/welcome"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-6 text-sm font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
        >
          → السابق
        </Link>
        <Link
          href="/dashboard/onboarding/recommendations"
          className="inline-flex h-11 items-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          التالي ←
        </Link>
      </div>
    </div>
  );
}
