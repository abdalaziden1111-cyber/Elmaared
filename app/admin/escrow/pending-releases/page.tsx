import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';
import { ReleaseToSupplierForm } from './release-to-supplier-form';

interface PendingRelease {
  id: string;
  rfq_id: string;
  total_amount: number;
  supplier_net: number;
  status: string;
  created_at: string;
  rfqs: { rfq_number: string; title: string } | null;
}

const PAGE_SIZE = 20;

export default async function AdminPendingReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);

  const admin = createAdminClient();

  const { count } = await admin
    .from('escrow_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'final_payment');
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  const { data: rowsRaw } = await admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, total_amount, supplier_net, status, created_at, rfqs(rfq_number, title)'
    )
    .eq('status', 'final_payment')
    .order('created_at', { ascending: true })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as PendingRelease[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        إيداعات بانتظار التحرير للمورد
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        مشاريع اعتمد العميل تسليمها. حوّل المبلغ للمورد ثم أكّد بالمرجع البنكي.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا توجد دفعات بانتظار التحرير.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4">
            {rows.map((r) => (
              <li
                key={r.id}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-stone-600)] num">
                      {r.rfqs?.rfq_number ?? '—'}
                    </div>
                    <h2 className="mt-0.5 text-sm font-semibold">
                      {r.rfqs?.title ?? '—'}
                    </h2>
                    <div className="mt-2 grid gap-1 text-xs text-[var(--color-stone-600)]">
                      <span>
                        إجمالي العقد:{' '}
                        <span className="num font-medium">
                          {formatCurrency(r.total_amount)}
                        </span>
                      </span>
                      <span>
                        صافي المورد:{' '}
                        <span className="num font-medium text-[var(--color-success)]">
                          {formatCurrency(r.supplier_net)}
                        </span>
                      </span>
                      <span>جاهز منذ {timeAgo(r.created_at)}</span>
                    </div>
                  </div>
                  <ReleaseToSupplierForm escrowId={r.id} />
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
