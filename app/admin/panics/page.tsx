import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';

interface PanicRow {
  id: string;
  rfq_id: string;
  panic_at: string;
  panic_reason: string | null;
  admin_joined_at: string | null;
  rfqs: { rfq_number: string; title: string } | null;
  suppliers: { company_name: string } | null;
}

const PAGE_SIZE = 25;

export default async function AdminPanicsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const start = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  const { count } = await admin
    .from('chats')
    .select('id', { count: 'exact', head: true })
    .not('panic_at', 'is', null);
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: rowsRaw } = await admin
    .from('chats')
    .select(
      'id, rfq_id, panic_at, panic_reason, admin_joined_at, rfqs(rfq_number, title), suppliers(company_name)'
    )
    .not('panic_at', 'is', null)
    .order('panic_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  const rows = (rowsRaw ?? []) as unknown as PanicRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        التصعيدات (Panics)
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل المحادثات التي ضُغط فيها زر التصعيد. عالج الجديد أولاً، تابع المعلّقة.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا يوجد تصعيدات حتى الآن. الوضع هادئ.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((c) => {
              const handled = !!c.admin_joined_at;
              return (
                <li
                  key={c.id}
                  className={`rounded-2xl border p-4 ${handled ? 'border-[var(--color-stone-300)] bg-white' : 'border-[var(--color-danger)] bg-[var(--color-danger-100)]/30'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/chats/${c.id}`}
                        className="text-base font-semibold hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                      >
                        {c.rfqs?.title ?? 'محادثة'}
                      </Link>
                      <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                        <span className="num">{c.rfqs?.rfq_number ?? '—'}</span>
                        <span className="ms-2">· مع {c.suppliers?.company_name ?? '—'}</span>
                      </div>
                      {c.panic_reason ? (
                        <p className="mt-2 text-sm">{c.panic_reason}</p>
                      ) : null}
                      <div className="mt-2 text-xs text-[var(--color-stone-600)]">
                        <span title={formatDate(c.panic_at)}>
                          🚨 صُعّدت {timeAgo(c.panic_at)}
                        </span>
                        {handled ? (
                          <span className="ms-3 text-[var(--color-success)]">
                            ✓ Admin انضمّت {timeAgo(c.admin_joined_at!)}
                          </span>
                        ) : (
                          <span className="ms-3 font-semibold text-[var(--color-danger)]">
                            بانتظار التدخّل
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
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
