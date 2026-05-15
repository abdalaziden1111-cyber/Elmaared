import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';
import { StatusFilter } from '@/components/ui/status-filter';

interface TxRow {
  id: string;
  rfq_id: string;
  agreement_id: string;
  total_amount: number;
  initial_deposit: number;
  supplier_net: number;
  status: string;
  released_at: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string } | null;
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

const PAGE_SIZE = 25;

export default async function AdminEscrowTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const status = (params.status ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin.from('escrow_transactions').select('id', { count: 'exact', head: true });
  if (status) countQ = countQ.eq('status', status);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, agreement_id, total_amount, initial_deposit, supplier_net, status, released_at, created_at, rfqs(rfq_number, title)'
    );
  if (status) rowsQ = rowsQ.eq('status', status);
  const { data: rowsRaw } = await rowsQ
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  const rows = (rowsRaw ?? []) as unknown as TxRow[];

  // Aggregate KPIs across all rows (not just the page)
  const { data: allRowsRaw } = await admin
    .from('escrow_transactions')
    .select('total_amount, supplier_net, status');
  const allRows = (allRowsRaw ?? []) as unknown as { total_amount: number; supplier_net: number; status: string }[];
  const gmv = allRows
    .filter((r) => r.status === 'released')
    .reduce((s, r) => s + (Number(r.total_amount) || 0), 0);
  const platformRevenue = gmv - allRows.filter((r) => r.status === 'released').reduce((s, r) => s + (Number(r.supplier_net) || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        دفتر الضمان
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل صفقات الضمان مع حالاتها. اختر الحالة لتصفية القائمة.
      </p>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Kpi label="إجمالي مُحرّر (GMV)" value={formatCurrency(gmv)} tone="success" />
        <Kpi label="إيراد المنصة" value={formatCurrency(platformRevenue)} tone="action" />
        <Kpi label="إجمالي الصفقات" value={String(totalCount)} />
      </section>

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
          <p className="text-sm text-[var(--color-stone-600)]">لا يوجد سجلات.</p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-[var(--color-stone-600)] num">
                      {r.rfqs?.rfq_number ?? '—'}
                    </div>
                    <Link
                      href={`/admin/rfqs/${r.rfq_id}`}
                      className="mt-0.5 block text-sm font-semibold hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                    >
                      {r.rfqs?.title ?? '—'}
                    </Link>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-stone-600)]">
                      <span>إجمالي: <span className="num font-medium">{formatCurrency(r.total_amount)}</span></span>
                      <span>· صافي للمورد: <span className="num font-medium">{formatCurrency(r.supplier_net)}</span></span>
                      {r.released_at ? (
                        <span>· حُرّر {formatDateShort(r.released_at)}</span>
                      ) : null}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
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

function Kpi({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'action';
}) {
  const cls =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'action'
        ? 'text-[var(--color-action-blue)]'
        : 'text-[var(--color-midnight-green)]';
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <p className="text-xs text-[var(--color-stone-600)]">{label}</p>
      <p className={`num mt-2 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
