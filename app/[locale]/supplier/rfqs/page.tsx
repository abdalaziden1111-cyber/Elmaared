import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort } from '@/lib/utils/format';
import { SERVICE_LABEL, CITY_LABEL } from '@/lib/constants/labels';
import { SearchBar } from '@/components/ui/search-bar';
import { Pagination } from '@/components/ui/pagination';

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

const PAGE_SIZE = 20;

export default async function SupplierRfqsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { user } = await requireRole(['supplier']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const q = (params.q ?? '').trim();

  // Workaround for the recursive RLS pair (rfqs ↔ proposals via
  // selected_supplier_view_rfq). Read via admin and re-apply the
  // service_type ∈ specializations filter manually.
  const admin = createAdminClient();

  const { data: supplierRaw } = await admin
    .from('suppliers')
    .select('id, status, specializations')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as
    | { id: string; status: string; specializations: string[] | null }
    | null;
  const specializations =
    supplier?.status === 'approved' && Array.isArray(supplier.specializations)
      ? supplier.specializations
      : [];

  let totalCount = 0;
  let rows: RfqRow[] = [];

  if (specializations.length > 0) {
    let countQ = admin
      .from('rfqs')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .is('deleted_at', null)
      .in('service_type', specializations);
    if (q) countQ = countQ.ilike('title', `%${q}%`);
    const { count } = await countQ;
    totalCount = count ?? 0;

    const start = (page - 1) * PAGE_SIZE;
    let rowsQ = admin
      .from('rfqs')
      .select(
        'id, rfq_number, title, service_type, exhibition_city, budget_min, budget_max, proposals_deadline, created_at'
      )
      .eq('status', 'open')
      .is('deleted_at', null)
      .in('service_type', specializations);
    if (q) rowsQ = rowsQ.ilike('title', `%${q}%`);
    const { data: rowsRaw } = await rowsQ
      .order('created_at', { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    rows = (rowsRaw ?? []) as unknown as RfqRow[];
  }

  // Competitor counts per RFQ (Soft Urgency — Plan v2 decision #03).
  // "X competing suppliers" badge shown only on the supplier side, never on
  // the buyer side (the buyer-side version was rejected by the committee).
  // We exclude the current supplier's own proposals and withdrawn ones, then
  // count distinct supplier_ids per rfq_id.
  const competitorCount = new Map<string, number>();
  if (rows.length > 0 && supplier?.id) {
    const rfqIds = rows.map((r) => r.id);
    const { data: propsRaw } = await admin
      .from('proposals')
      .select('rfq_id, supplier_id, status')
      .in('rfq_id', rfqIds)
      .neq('supplier_id', supplier.id)
      .neq('status', 'withdrawn');
    const props = (propsRaw ?? []) as Array<{
      rfq_id: string;
      supplier_id: string;
    }>;
    const seen = new Map<string, Set<string>>();
    for (const p of props) {
      const set = seen.get(p.rfq_id) ?? new Set<string>();
      set.add(p.supplier_id);
      seen.set(p.rfq_id, set);
    }
    for (const [rfqId, suppliers] of seen) {
      competitorCount.set(rfqId, suppliers.size);
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        الطلبات المتاحة
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        طلبات جديدة تطابق تخصصاتك ومدنك. كلما تقدّمت أسرع زادت فرصك.
      </p>

      <div className="mt-6">
        <SearchBar placeholder="ابحث بعنوان الطلب…" />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {q
              ? 'ما فيش نتائج تطابق البحث.'
              : 'لا توجد طلبات تطابقك حالياً. سنرسل لك إشعاراً فور وصول طلب جديد.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((r) => {
              const competitors = competitorCount.get(r.id) ?? 0;
              return (
                <li key={r.id}>
                  <Link
                    href={`/supplier/rfqs/${r.id}`}
                    className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs text-[var(--color-stone-600)] num">{r.rfq_number}</div>
                        <h2 className="mt-0.5 text-base font-semibold">{r.title}</h2>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                          <span>{SERVICE_LABEL[r.service_type] ?? r.service_type}</span>
                          {r.exhibition_city ? (
                            <span>· {CITY_LABEL[r.exhibition_city] ?? r.exhibition_city}</span>
                          ) : null}
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
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--color-stone-100)] pt-3 text-xs">
                      {competitors === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-100,#dcfce7)] px-2.5 py-1 font-semibold text-[var(--color-success,#15803d)]">
                          <span aria-hidden>⚡</span>
                          أنت أول مزوّد متقدّم — كن سريعاً
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-100,#fef3c7)] px-2.5 py-1 font-semibold text-[var(--color-warning,#92400e)]">
                          <span aria-hidden>👥</span>
                          في <span className="num">{competitors}</span> مزوّد منافس
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            totalCount={totalCount}
          />
        </>
      )}
    </div>
  );
}
