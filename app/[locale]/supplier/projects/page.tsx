import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort } from '@/lib/utils/format';
import { StatusFilter } from '@/components/ui/status-filter';
import { Pagination } from '@/components/ui/pagination';

interface ProjectRow {
  id: string;
  rfq_number: string;
  title: string;
  status: string;
  awarded_at: string | null;
  exhibition_city: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  awarded: 'تم الاختيار',
  in_escrow: 'قيد الضمان',
  in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  disputed: 'نزاع',
};

const STATUS_TONE: Record<string, string> = {
  awarded: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  in_escrow: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  in_progress: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  delivered: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  completed: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  disputed: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
};

const ACTIVE_STATUSES = [
  'awarded',
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
  'disputed',
];

const PAGE_SIZE = 20;

export default async function SupplierProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { user } = await requireRole(['supplier']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = (params.status ?? '').trim();

  // Workaround for the recursive RLS pair (rfqs ↔ proposals): both queries
  // here touch tables involved in the cycle. Read via admin and gate on
  // supplier ownership manually.
  const supabase = createAdminClient();

  const { data: supplierRaw } = await supabase
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as { id: string } | null;

  if (!supplier) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">مشاريعي</h1>
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لم نجد ملف المورد الخاص بك.
        </p>
      </div>
    );
  }

  const { data: acceptedRaw } = await supabase
    .from('proposals')
    .select('id')
    .eq('supplier_id', supplier.id)
    .eq('status', 'accepted');
  const accepted = (acceptedRaw ?? []) as unknown as { id: string }[];
  const winningIds = accepted.map((p) => p.id);

  let rows: ProjectRow[] = [];
  let totalCount = 0;

  if (winningIds.length > 0) {
    const statusFilter = status && ACTIVE_STATUSES.includes(status) ? [status] : ACTIVE_STATUSES;

    let countQ = supabase
      .from('rfqs')
      .select('id', { count: 'exact', head: true })
      .in('winning_proposal_id', winningIds)
      .in('status', statusFilter);
    const { count } = await countQ;
    totalCount = count ?? 0;

    const start = (page - 1) * PAGE_SIZE;
    const { data: rfqRowsRaw } = await supabase
      .from('rfqs')
      .select('id, rfq_number, title, status, awarded_at, exhibition_city')
      .in('winning_proposal_id', winningIds)
      .in('status', statusFilter)
      .order('awarded_at', { ascending: false, nullsFirst: false })
      .range(start, start + PAGE_SIZE - 1);
    rows = (rfqRowsRaw ?? []) as unknown as ProjectRow[];
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilter = Boolean(status);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">مشاريعي</h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        المشاريع اللي فزت بها — من لحظة الاختيار حتى التسليم النهائي.
      </p>

      <div className="mt-6">
        <StatusFilter
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {hasFilter
              ? 'ما فيش نتائج تطابق الفلتر.'
              : 'لا توجد مشاريع نشطة. عروضك اللي تتقبل تظهر هنا.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((r) => (
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
                        {r.exhibition_city ? <span>{r.exhibition_city}</span> : null}
                        {r.awarded_at ? (
                          <span>· تم الاختيار {formatDateShort(r.awarded_at)}</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs ${STATUS_TONE[r.status] ?? 'bg-[var(--color-stone-100)]'}`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
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
