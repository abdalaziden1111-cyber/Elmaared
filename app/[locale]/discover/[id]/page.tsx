import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

interface SupplierProfile {
  id: string;
  company_name: string;
  bio: string | null;
  specializations: string[];
  cities: string[];
  website: string | null;
  years_of_experience: number | null;
  team_size: number | null;
  average_rating: number | null;
  total_completed_orders: number | null;
}

export default async function PublicSupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: rowRaw } = await supabase
    .from('suppliers')
    .select(
      'id, company_name, bio, specializations, cities, website, years_of_experience, team_size, average_rating, total_completed_orders'
    )
    .eq('id', id)
    .eq('status', 'approved')
    .single();
  const s = rowRaw as unknown as SupplierProfile | null;
  if (!s) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-[var(--color-midnight-green)]">
        {s.company_name}
      </h1>
      {s.bio ? (
        <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]/80">
          {s.bio}
        </p>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {s.average_rating ? (
          <Stat label="التقييم" value={`★ ${s.average_rating}`} />
        ) : null}
        {s.total_completed_orders ? (
          <Stat label="مشاريع مكتملة" value={String(s.total_completed_orders)} />
        ) : null}
        {s.years_of_experience ? (
          <Stat label="سنوات خبرة" value={String(s.years_of_experience)} />
        ) : null}
        {s.team_size ? <Stat label="حجم الفريق" value={String(s.team_size)} /> : null}
      </div>

      <section className="mt-6">
        <h2 className="text-base font-semibold">التخصصات</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {s.specializations.map((sp) => (
            <span key={sp} className="rounded-full bg-[var(--color-stone-100)] px-3 py-1">
              {sp}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold">المدن</h2>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          {s.cities.map((c) => (
            <span key={c} className="rounded-full bg-[var(--color-stone-100)] px-3 py-1">
              {c}
            </span>
          ))}
        </div>
      </section>

      {s.website ? (
        <section className="mt-6 text-sm">
          <a
            href={s.website}
            target="_blank"
            rel="noopener"
            className="text-[var(--color-action-blue)]"
          >
            الموقع الإلكتروني ←
          </a>
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium num">{value}</div>
    </div>
  );
}
