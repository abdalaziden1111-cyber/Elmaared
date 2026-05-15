import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateShort, timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';

interface AdminChatRow {
  id: string;
  rfq_id: string;
  client_id: string;
  supplier_id: string;
  last_message_text: string | null;
  last_message_at: string | null;
  is_archived: boolean;
  admin_joined_at: string | null;
  panic_at: string | null;
  panic_reason: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string; status: string } | null;
  suppliers: { company_name: string } | null;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

const PAGE_SIZE = 20;

export default async function AdminChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const filter = (params.filter ?? '').trim();

  const admin = createAdminClient();

  let countQ = admin.from('chats').select('id', { count: 'exact', head: true });
  if (filter === 'panic') countQ = countQ.not('panic_at', 'is', null);
  else if (filter === 'archived') countQ = countQ.eq('is_archived', true);
  else if (filter === 'admin_joined') countQ = countQ.not('admin_joined_at', 'is', null);
  const { count } = await countQ;
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;

  let rowsQ = admin
    .from('chats')
    .select(
      'id, rfq_id, client_id, supplier_id, last_message_text, last_message_at, is_archived, admin_joined_at, panic_at, panic_reason, created_at, rfqs(rfq_number, title, status), suppliers(company_name)'
    );
  if (filter === 'panic') rowsQ = rowsQ.not('panic_at', 'is', null);
  else if (filter === 'archived') rowsQ = rowsQ.eq('is_archived', true);
  else if (filter === 'admin_joined') rowsQ = rowsQ.not('admin_joined_at', 'is', null);
  const { data: rowsRaw } = await rowsQ
    .order('last_message_at', { ascending: false, nullsFirst: false })
    .range(start, start + PAGE_SIZE - 1);

  const rows = (rowsRaw ?? []) as unknown as AdminChatRow[];

  function tabHref(f: string): string {
    return f ? `?filter=${f}` : '?';
  }
  const tab = (val: string, label: string) => (
    <Link
      key={val}
      href={tabHref(val)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
        filter === val
          ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]'
          : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)] hover:bg-[var(--color-stone-300)]'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        كل المحادثات
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        أحدث المحادثات على المنصة.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tab('', 'الكل')}
        {tab('panic', '🚨 تصعيد')}
        {tab('admin_joined', 'انضم Admin')}
        {tab('archived', 'مؤرشفة')}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            {filter ? 'ما فيش نتائج تطابق الفلتر.' : 'لا توجد محادثات بعد.'}
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-3">
            {rows.map((c) => {
              const isPanic = c.panic_at != null;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/chats/${c.id}`}
                    className={`block rounded-2xl border bg-white p-5 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
                      isPanic
                        ? 'border-[var(--color-danger)] bg-[var(--color-danger-100)]/30'
                        : 'border-[var(--color-stone-300)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-[var(--color-stone-600)] num">
                          {c.rfqs?.rfq_number ?? '—'}
                        </div>
                        <h2 className="mt-0.5 truncate text-sm font-semibold">
                          {c.rfqs?.title ?? '—'}
                        </h2>
                        <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                          المورد: {c.suppliers?.company_name ?? '—'}
                        </div>
                        {c.last_message_text ? (
                          <p className="mt-2 truncate text-sm text-[var(--color-charcoal)]">
                            {truncate(c.last_message_text, 140)}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-[var(--color-stone-600)]">
                            لا توجد رسائل بعد.
                          </p>
                        )}
                        {isPanic && c.panic_reason ? (
                          <p className="mt-2 rounded-lg bg-[var(--color-danger-100)] p-2 text-xs text-[var(--color-danger)]">
                            🚨 سبب التصعيد: {c.panic_reason}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-end text-xs text-[var(--color-stone-600)]">
                        {c.last_message_at ? (
                          <div>{timeAgo(c.last_message_at)}</div>
                        ) : (
                          <div>أُنشئت {formatDateShort(c.created_at)}</div>
                        )}
                        {c.admin_joined_at ? (
                          <div className="mt-1 text-[var(--color-action-blue)]">انضم Admin</div>
                        ) : null}
                        {c.is_archived ? <div className="mt-1">مؤرشفة</div> : null}
                      </div>
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
