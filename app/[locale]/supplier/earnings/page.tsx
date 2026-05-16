import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { StatusFilter } from '@/components/ui/status-filter';
import { Pagination } from '@/components/ui/pagination';

interface TxRow {
  id: string;
  rfq_id: string;
  supplier_net: number;
  total_amount: number;
  status: string;
  released_at: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string } | null;
}

interface SummaryRow {
  supplier_net: number | null;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع',
  deposit_received: 'إيداع مبدئي',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  final_payment: 'الدفعة النهائية',
  released: 'مُحرّر',
  refunded: 'مُسترد',
  partial_refund: 'استرداد جزئي',
};

const PENDING_STATUSES = new Set([
  'deposit_received',
  'work_in_progress',
  'delivered',
  'final_payment',
]);

const PAGE_SIZE = 20;

export default async function SupplierEarningsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { user } = await requireRole(['supplier']);
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = (params.status ?? '').trim();

  // Workaround for the recursive RLS pair (rfqs ↔ proposals): the embedded
  // `rfqs(...)` select on escrow_transactions triggers the cycle. Read via
  // admin and gate on supplier ownership manually.
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
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">أرباحي</h1>
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">
          لم نجد ملف المورد الخاص بك.
        </p>
      </div>
    );
  }

  const { data: agreementsRaw } = await supabase
    .from('agreements')
    .select('id')
    .eq('supplier_id', supplier.id);
  const agreements = (agreementsRaw ?? []) as unknown as { id: string }[];
  const agreementIds = agreements.map((a) => a.id);

  // Run the 3 escrow queries in parallel — they all depend on the same
  // agreementIds array but not on each other.
  let summaryRows: SummaryRow[] = [];
  let rows: TxRow[] = [];
  let totalCount = 0;

  if (agreementIds.length > 0) {
    const start = (page - 1) * PAGE_SIZE;
    let countQ = supabase
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .in('agreement_id', agreementIds);
    if (status) countQ = countQ.eq('status', status);
    let rowsQ = supabase
      .from('escrow_transactions')
      .select(
        'id, rfq_id, supplier_net, total_amount, status, released_at, created_at, rfqs(rfq_number, title)'
      )
      .in('agreement_id', agreementIds);
    if (status) rowsQ = rowsQ.eq('status', status);

    const [summaryResp, countResp, rowsResp] = await Promise.all([
      supabase
        .from('escrow_transactions')
        .select('supplier_net, status')
        .in('agreement_id', agreementIds),
      countQ,
      rowsQ.order('created_at', { ascending: false }).range(start, start + PAGE_SIZE - 1),
    ]);
    summaryRows = (summaryResp.data ?? []) as unknown as SummaryRow[];
    totalCount = countResp.count ?? 0;
    rows = (rowsResp.data ?? []) as unknown as TxRow[];
  }

  const released = summaryRows
    .filter((r) => r.status === 'released')
    .reduce((sum, r) => sum + (r.supplier_net ?? 0), 0);
  const pending = summaryRows
    .filter((r) => PENDING_STATUSES.has(r.status))
    .reduce((sum, r) => sum + (r.supplier_net ?? 0), 0);
  const total = released + pending;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasFilter = Boolean(status);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">أرباحي</h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        ملخّص المبالغ المُحرَّرة لك وما يزال في الضمان.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <p className="text-xs text-[var(--color-stone-600)]">إجمالي مُحرّر</p>
          <p className="num mt-2 text-xl font-semibold text-[var(--color-success)]">
            {formatCurrency(released)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <p className="text-xs text-[var(--color-stone-600)]">بانتظار التحرير</p>
          <p className="num mt-2 text-xl font-semibold text-[var(--color-warning)]">
            {formatCurrency(pending)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <p className="text-xs text-[var(--color-stone-600)]">المجموع</p>
          <p className="num mt-2 text-xl font-semibold text-[var(--color-midnight-green)]">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--color-midnight-green)]">
          سجل الدفعات
        </h2>
        <StatusFilter
          options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {hasFilter
              ? 'ما فيش نتائج تطابق الفلتر.'
              : 'لا توجد دفعات حتى الآن. أرباحك تظهر هنا بعد توقيع أول اتفاق.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-4 grid gap-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-stone-600)] num">
                      {r.rfqs?.rfq_number ?? '—'}
                    </div>
                    <h3 className="mt-0.5 text-sm font-semibold">{r.rfqs?.title ?? '—'}</h3>
                    <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                      {r.released_at
                        ? `حُرّرت في ${formatDateShort(r.released_at)}`
                        : `أُنشئت ${formatDateShort(r.created_at)}`}
                    </div>
                  </div>
                  <div className="shrink-0 text-end">
                    <div className="num text-base font-semibold">
                      {formatCurrency(r.supplier_net)}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </div>
                  </div>
                </div>
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
