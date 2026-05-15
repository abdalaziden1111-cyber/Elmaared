import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { Stepper } from '../welcome/page';

const SERVICE_LABEL: Record<string, string> = {
  booth: 'جناح',
  gifts: 'هدايا',
  event: 'فعالية',
  printing: 'مطبوعات',
};

export default async function OnboardingRecommendationsPage() {
  await requireRole(['client']);
  const admin = createAdminClient();
  const { data: supRaw } = await admin
    .from('suppliers')
    .select(
      'id, company_name, specializations, cities, total_completed_orders, average_rating, years_of_experience'
    )
    .eq('status', 'approved')
    .order('total_completed_orders', { ascending: false })
    .limit(5);
  const suppliers = (supRaw ?? []) as Array<{
    id: string;
    company_name: string;
    specializations: string[];
    cities: string[];
    total_completed_orders: number;
    average_rating: number | null;
    years_of_experience: number | null;
  }>;

  return (
    <div className="mx-auto max-w-4xl">
      <Stepper current={3} />

      <h1 className="mt-8 text-3xl font-semibold text-[var(--color-midnight-green)]">
        ٥ موردين معتمدين قد يناسبون احتياجك
      </h1>
      <p className="mt-3 text-sm text-[var(--color-stone-600)]">
        قائمة مبدئية لإعطائك فكرة عن جودة الموردين على المنصة. ستحصل على عروض مفصّلة بعد نشر طلبك الأول.
      </p>

      {suppliers.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-8 text-center text-sm text-[var(--color-stone-600)]">
          لا توجد موردون معتمدون بعد.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
            >
              <div className="flex size-14 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-lg font-semibold text-[var(--color-midnight-green)]">
                {s.company_name.slice(0, 1)}
              </div>
              <p className="mt-4 text-base font-semibold text-[var(--color-midnight-green)]">
                {s.company_name}
              </p>
              <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                {s.specializations
                  .map((sp) => SERVICE_LABEL[sp] ?? sp)
                  .slice(0, 3)
                  .join(' · ')}
              </p>
              <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                {s.cities.slice(0, 2).join(' · ')}
              </p>
              <p className="mt-4 text-xs text-[var(--color-stone-600)]">
                {s.total_completed_orders} مشروع منفّذ ·{' '}
                {s.years_of_experience ?? '—'} سنوات خبرة
              </p>
              <Link
                href={`/discover/${s.id}`}
                className="mt-4 inline-flex h-9 items-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
              >
                عرض الملف
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/dashboard/onboarding/exhibition"
          className="inline-flex h-11 items-center rounded-xl border border-[var(--color-stone-300)] bg-white px-6 text-sm font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
        >
          → السابق
        </Link>
        <Link
          href="/dashboard/rfqs/new"
          className="inline-flex h-11 items-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
        >
          أنشئ طلبك الأول ←
        </Link>
      </div>
    </div>
  );
}
