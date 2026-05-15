import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { timeAgo } from '@/lib/utils/format';

interface AgreementRow {
  id: string;
  rfq_id: string;
  status: string;
  client_submitted_at: string | null;
  supplier_submitted_at: string | null;
  created_at: string;
  rfqs: { rfq_number: string; title: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة',
  client_understanding_submitted: 'بانتظار المورد',
  supplier_understanding_submitted: 'بانتظار العميل',
  ai_analysis_pending: 'تحليل الـ AI جارٍ',
  ai_analysis_complete: 'تحليل اكتمل',
  client_approved: 'العميل وقّع',
  supplier_approved: 'المورد وقّع',
  signed: 'مُوقّع',
  cancelled: 'ملغى',
};

export default async function AdminPendingAgreementsPage() {
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from('agreements')
    .select(
      'id, rfq_id, status, client_submitted_at, supplier_submitted_at, created_at, rfqs(rfq_number, title)'
    )
    .neq('status', 'signed')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(50);
  const rows = (rowsRaw ?? []) as unknown as AgreementRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        الاتفاقيات المعلّقة
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        اتفاقيات لم تُوقَّع من الطرفين بعد. للمتابعة فقط — التوقيع تلقائي بين الأطراف.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا توجد اتفاقيات معلّقة. كل الاتفاقيات إما موقّعة أو ملغاة.
          </p>
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((a) => (
            <li
              key={a.id}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/admin/rfqs/${a.rfq_id}`}
                  className="min-w-0 hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <div className="text-xs text-[var(--color-stone-600)] num">
                    {a.rfqs?.rfq_number ?? '—'}
                  </div>
                  <div className="mt-0.5 truncate text-sm font-semibold">
                    {a.rfqs?.title ?? '—'}
                  </div>
                  <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                    أُنشئت {timeAgo(a.created_at)}
                  </div>
                </Link>
                <span className="shrink-0 rounded-full bg-[var(--color-warning-100)] px-3 py-1 text-xs text-[var(--color-warning)]">
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
