import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { formatDateShort } from '@/lib/utils/format';

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  service_type: string;
  status: string;
  created_at: string;
  proposals_deadline: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  open: 'مفتوح',
  negotiating: 'قيد التفاوض',
  awarded: 'تم الاختيار',
  in_escrow: 'قيد الضمان',
  in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  disputed: 'نزاع',
  cancelled: 'ملغى',
};

export default async function ClientRfqsListPage() {
  const { user } = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rowsRaw } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, service_type, status, created_at, proposals_deadline')
    .eq('client_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const rows = (rowsRaw ?? []) as unknown as RfqRow[];

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">طلباتي</h1>
        <Link
          href="/dashboard/rfqs/new"
          className="inline-flex h-10 items-center gap-1 rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)]"
        >
          <Plus className="size-4" /> طلب جديد
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا توجد طلبات بعد. أنشئ طلبك الأول لتصلك عروض من الموردين.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/dashboard/rfqs/${r.id}`}
                className="block rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 hover:border-[var(--color-action-blue)]"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs text-[var(--color-stone-600)] num">{r.rfq_number}</div>
                    <h2 className="mt-0.5 text-base font-semibold">{r.title}</h2>
                    <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                      أُنشئ في {formatDateShort(r.created_at)}
                      {r.proposals_deadline
                        ? ` · آخر موعد ${formatDateShort(r.proposals_deadline)}`
                        : ''}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
