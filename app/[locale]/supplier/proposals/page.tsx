import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, timeAgo } from '@/lib/utils/format';
import { StatusFilter } from '@/components/ui/status-filter';
import { Pagination } from '@/components/ui/pagination';

interface ProposalRow {
  id: string;
  rfq_id: string;
  total_price: number;
  delivery_days: number;
  status: string;
  created_at: string;
  rfqs: {
    rfq_number: string;
    title: string;
    status: string;
  } | null;
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'مُقدَّم',
  under_review: 'قيد المراجعة',
  shortlisted: 'في القائمة المختصرة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
};

const STATUS_TONE: Record<string, string> = {
  submitted: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  under_review: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  shortlisted: 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]',
  accepted: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  rejected: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  withdrawn: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
};

const PAGE_SIZE = 20;

export default async function SupplierProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { user } = await requireRole(['supplier']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = (params.status ?? '').trim();

  // Workaround for the recursive RLS pair (rfqs ↔ proposals): the embedded
  // `rfqs(...)` select triggers the cycle. Read via admin and gate on
  // supplier ownership manually.
  const admin = createAdminClient();

  const { data: supplierRaw } = await admin
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  const supplier = supplierRaw as { id: string } | null;

  if (!supplier) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">عروضي</h1>
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لم نجد ملف المورد الخاص بك.
        </p>
      </div>
    );
  }

  let countQ = admin
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('supplier_id', supplier.id);
  if (status) countQ = countQ.eq('status', status);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('proposals')
    .select(
      'id, rfq_id, total_price, delivery_days, status, created_at, rfqs(rfq_number, title, status)'
    )
    .eq('supplier_id', supplier.id);
  if (status) rowsQ = rowsQ.eq('status', status);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as ProposalRow[];
  const hasFilter = Boolean(status);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">عروضي</h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل العروض اللي قدّمتها مع حالتها الحالية.
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
            {hasFilter ? (
              'ما فيش نتائج تطابق الفلتر.'
            ) : (
              <>
                لم تقدّم أي عروض بعد. تصفّح{' '}
                <Link href="/supplier/rfqs" className="text-[var(--color-action-blue)]">
                  الطلبات المتاحة
                </Link>{' '}
                وقدّم عرضك الأول.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/supplier/rfqs/${p.rfq_id}`}
                  className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs text-[var(--color-stone-600)] num">
                        {p.rfqs?.rfq_number ?? '—'}
                      </div>
                      <h2 className="mt-0.5 text-base font-semibold">
                        {p.rfqs?.title ?? '—'}
                      </h2>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                        <span className="num">{formatCurrency(p.total_price)}</span>
                        <span>· {p.delivery_days} يوم تسليم</span>
                        <span>· قُدِّم {timeAgo(p.created_at)}</span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs ${STATUS_TONE[p.status] ?? 'bg-[var(--color-stone-100)]'}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
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
