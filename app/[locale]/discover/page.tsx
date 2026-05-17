import { Link } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_LABEL_LONG as SERVICE_LABEL, CITY_LABEL } from '@/lib/constants/labels';

interface SupplierRow {
  id: string;
  company_name: string;
  bio: string | null;
  specializations: string[];
  cities: string[];
  average_rating: number | null;
  total_completed_orders: number | null;
  years_of_experience: number | null;
}
const SERVICE_OPTIONS = ['booth', 'gifts', 'event', 'printing'] as const;
const CITY_OPTIONS = [
  'الرياض',
  'جدة',
  'الدمام',
  'الخبر',
  'مكة المكرمة',
  'المدينة المنورة',
  'تبوك',
  'أبها',
  'حائل',
  'جازان',
];
const PAGE_SIZE = 12;

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{
    service?: string;
    city?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const serviceFilter =
    sp.service && SERVICE_OPTIONS.includes(sp.service as (typeof SERVICE_OPTIONS)[number])
      ? sp.service
      : undefined;
  const cityFilter = sp.city && CITY_OPTIONS.includes(sp.city) ? sp.city : undefined;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const supabase = await createClient();

  let q = supabase
    .from('suppliers')
    .select(
      'id, company_name, bio, specializations, cities, average_rating, total_completed_orders, years_of_experience',
      { count: 'exact' }
    )
    .eq('status', 'approved');

  if (serviceFilter) q = q.contains('specializations', [serviceFilter]);
  if (cityFilter) q = q.contains('cities', [cityFilter]);

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data: rowsRaw, count } = await q
    .order('average_rating', { ascending: false, nullsFirst: false })
    .range(from, to);
  const suppliers = (rowsRaw ?? []) as unknown as SupplierRow[];
  const total = count ?? suppliers.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function buildHref(overrides: Partial<{ service: string | null; city: string | null; page: number }>) {
    const next = new URLSearchParams();
    const s = 'service' in overrides ? overrides.service : serviceFilter ?? null;
    const c = 'city' in overrides ? overrides.city : cityFilter ?? null;
    const p = 'page' in overrides ? overrides.page : page;
    if (s) next.set('service', s);
    if (c) next.set('city', c);
    if (p && p > 1) next.set('page', String(p));
    const qs = next.toString();
    return qs ? `/discover?${qs}` : '/discover';
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
            استكشف موردي المنصة
          </h1>
          <p className="mt-2 text-sm text-[var(--color-stone-600)]">
            موردون معتمدون لكافة احتياجات معارضك وفعالياتك في السعودية.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-xs font-medium text-[var(--color-action-blue)] hover:underline"
        >
          → العودة للوحة التحكم
        </Link>
      </div>

      {/* Filters */}
      <section className="mt-8 space-y-3 rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone-600)]">
            الخدمة
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip
              label="كل الخدمات"
              active={!serviceFilter}
              href={buildHref({ service: null, page: 1 })}
            />
            {SERVICE_OPTIONS.map((s) => (
              <FilterChip
                key={s}
                label={SERVICE_LABEL[s]}
                active={serviceFilter === s}
                href={buildHref({ service: s, page: 1 })}
              />
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-stone-600)]">
            المدينة
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip
              label="كل المدن"
              active={!cityFilter}
              href={buildHref({ city: null, page: 1 })}
            />
            {CITY_OPTIONS.map((c) => (
              <FilterChip
                key={c}
                label={c}
                active={cityFilter === c}
                href={buildHref({ city: c, page: 1 })}
              />
            ))}
          </div>
        </div>
      </section>

      <p className="mt-6 text-xs text-[var(--color-stone-600)]">
        {total} مورد{(serviceFilter || cityFilter) ? ' مطابق' : ''}
      </p>

      {suppliers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {serviceFilter || cityFilter
              ? 'لا توجد نتائج بالفلاتر الحالية. جرّب تخفيفها.'
              : 'قريباً — نقوم باعتماد دفعتنا الأولى من الموردين.'}
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/discover/${s.id}`}
                className="block h-full rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition-colors hover:border-[var(--color-action-blue)]"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-base font-semibold text-[var(--color-midnight-green)]">
                  {s.company_name.slice(0, 1)}
                </div>
                <h2 className="mt-4 text-base font-semibold text-[var(--color-midnight-green)]">
                  {s.company_name}
                </h2>
                {s.bio ? (
                  <p className="mt-1 line-clamp-2 text-xs text-[var(--color-stone-600)]">
                    {s.bio}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                  {s.specializations.slice(0, 3).map((sp) => (
                    <span
                      key={sp}
                      className="rounded-full bg-[var(--color-stone-100)] px-2 py-0.5"
                    >
                      {SERVICE_LABEL[sp] ?? sp}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-[var(--color-stone-600)]">
                  {s.cities
                    .slice(0, 3)
                    .map((c) => CITY_LABEL[c] ?? c)
                    .join(' · ')}
                </p>
                <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-stone-600)]">
                  {s.average_rating ? (
                    <span className="num">★ {s.average_rating.toFixed(1)}</span>
                  ) : (
                    <span>جديد</span>
                  )}
                  {s.total_completed_orders ? (
                    <span>· {s.total_completed_orders} مشروع</span>
                  ) : null}
                  {s.years_of_experience ? (
                    <span>· {s.years_of_experience} سنوات</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="الصفحات">
          {page > 1 ? (
            <Link
              href={buildHref({ page: page - 1 })}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
            >
              → السابق
            </Link>
          ) : null}
          <span className="text-xs text-[var(--color-stone-600)] num">
            صفحة {page} من {pageCount}
          </span>
          {page < pageCount ? (
            <Link
              href={buildHref({ page: page + 1 })}
              className="inline-flex h-9 items-center rounded-lg border border-[var(--color-stone-300)] bg-white px-3 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
            >
              التالي ←
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}

function FilterChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={
        'inline-flex h-9 items-center rounded-full px-4 text-xs font-medium transition-colors ' +
        (active
          ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]'
          : 'border border-[var(--color-stone-300)] bg-white text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]')
      }
    >
      {label}
    </Link>
  );
}
