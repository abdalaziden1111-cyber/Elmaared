import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { formatDateShort } from '@/lib/utils/format';

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  service_type: string;
  exhibition_city: string | null;
  budget_min: number | null;
  budget_max: number | null;
  proposals_deadline: string | null;
  created_at: string;
}

export default async function SupplierRfqsListPage() {
  await requireRole(['supplier']);
  const supabase = await createClient();

  // RLS already filters to RFQs that match this supplier's specializations
  const { data: rowsRaw } = await supabase
    .from('rfqs')
    .select(
      'id, rfq_number, title, service_type, exhibition_city, budget_min, budget_max, proposals_deadline, created_at'
    )
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as RfqRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        الطلبات المتاحة
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        طلبات جديدة تطابق تخصصاتك ومدنك. كلما تقدّمت أسرع زادت فرصك.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا توجد طلبات تطابقك حالياً. سنرسل لك إشعاراً فور وصول طلب جديد.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/supplier/rfqs/${r.id}`}
                className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-stone-600)] num">{r.rfq_number}</div>
                    <h2 className="mt-0.5 text-base font-semibold">{r.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                      <span>{r.service_type}</span>
                      {r.exhibition_city ? <span>· {r.exhibition_city}</span> : null}
                      {r.budget_max ? (
                        <span>· حتى {r.budget_max.toLocaleString('en')} ﷼</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="shrink-0 text-end text-xs text-[var(--color-stone-600)]">
                    {r.proposals_deadline ? (
                      <>آخر موعد:<br />{formatDateShort(r.proposals_deadline)}</>
                    ) : null}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
