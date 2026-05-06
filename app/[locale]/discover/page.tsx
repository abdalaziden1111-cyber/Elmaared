import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

interface SupplierRow {
  id: string;
  company_name: string;
  bio: string | null;
  specializations: string[];
  cities: string[];
  average_rating: number | null;
  total_completed_orders: number | null;
}

export default async function DiscoverPage() {
  const supabase = await createClient();

  // Public read works because of approved_suppliers_public_read RLS policy
  const { data: rowsRaw } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, bio, specializations, cities, average_rating, total_completed_orders'
    )
    .eq('status', 'approved')
    .order('average_rating', { ascending: false, nullsFirst: false })
    .limit(60);

  const suppliers = (rowsRaw ?? []) as unknown as SupplierRow[];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
        استكشف موردي المنصة
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        موردون معتمدون لكافة احتياجات معارضك وفعالياتك في السعودية.
      </p>

      {suppliers.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            قريباً — نقوم باعتماد دفعتنا الأولى من الموردين.
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((s) => (
            <li key={s.id}>
              <Link
                href={`/discover/${s.id}`}
                className="block h-full rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition-colors hover:border-[var(--color-action-blue)]"
              >
                <h2 className="text-base font-semibold">{s.company_name}</h2>
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
                      {sp}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-stone-600)]">
                  {s.average_rating ? (
                    <span className="num">★ {s.average_rating}</span>
                  ) : (
                    <span>جديد</span>
                  )}
                  {s.total_completed_orders ? (
                    <span>· {s.total_completed_orders} مشروع</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
