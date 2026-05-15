import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate, timeAgo } from '@/lib/utils/format';
import { Pagination } from '@/components/ui/pagination';

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const PAGE_SIZE = 50;

function actorLabel(role: string | null): string {
  if (role === 'admin') return 'Admin';
  if (role === 'client') return 'عميل';
  if (role === 'supplier') return 'مورد';
  return '—';
}

function resourceLink(type: string, id: string | null): string | null {
  if (!id) return null;
  if (type === 'rfq') return `/admin/rfqs/${id}`;
  if (type === 'supplier') return `/admin/suppliers/${id}`;
  if (type === 'chat') return `/admin/chats/${id}`;
  if (type === 'dispute') return `/admin/disputes/${id}`;
  if (type === 'user' || type === 'profile') return `/admin/users/${id}`;
  return null;
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? '1', 10) || 1);
  const start = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  const { count } = await admin
    .from('audit_logs')
    .select('id', { count: 'exact', head: true });
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const { data: rowsRaw } = await admin
    .from('audit_logs')
    .select('id, actor_id, actor_role, action, resource_type, resource_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .range(start, start + PAGE_SIZE - 1);
  const rows = (rowsRaw ?? []) as unknown as AuditRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        سجل النشاط
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        كل العمليات المسجّلة على المنصة. أحدث {Math.min(PAGE_SIZE, rows.length)} من إجمالي{' '}
        <span className="num">{totalCount}</span> سطر.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا يوجد نشاط مسجّل بعد.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-2">
            {rows.map((a) => {
              const link = resourceLink(a.resource_type, a.resource_id);
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium">{a.action}</span>
                      <span className="ms-2 text-xs text-[var(--color-stone-600)]">
                        · {actorLabel(a.actor_role)} على {a.resource_type}
                      </span>
                    </div>
                    <span
                      title={formatDate(a.created_at)}
                      className="shrink-0 text-xs text-[var(--color-stone-600)]"
                    >
                      {timeAgo(a.created_at)}
                    </span>
                  </div>
                  {link ? (
                    <Link
                      href={link}
                      className="mt-1 inline-block text-xs text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                    >
                      افتح المورد ←
                    </Link>
                  ) : null}
                  {a.metadata && Object.keys(a.metadata).length > 0 ? (
                    <details className="mt-2 text-xs text-[var(--color-stone-600)]">
                      <summary className="cursor-pointer">بيانات إضافية</summary>
                      <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--color-stone-100)] p-2 text-[10px]">
                        {JSON.stringify(a.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
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
