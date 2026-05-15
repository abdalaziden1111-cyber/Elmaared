import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface EscrowRow {
  id: string;
  rfq_id: string;
  status: string;
  total_amount: number;
  supplier_net: number;
  released_at: string | null;
  release_transaction_ref: string | null;
  released_by: string | null;
  rfqs: { rfq_number: string; title: string } | null;
  suppliers: { company_name: string; iban: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع',
  deposit_received: 'إيداع مبدئي',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  released: 'مُحرّر',
  refunded: 'مُسترد',
};

export default async function AdminReleaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: rowRaw } = await admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, status, total_amount, supplier_net, released_at, release_transaction_ref, released_by, rfqs(rfq_number, title), suppliers(company_name, iban)'
    )
    .eq('id', id)
    .maybeSingle();
  const tx = rowRaw as unknown as EscrowRow | null;
  if (!tx) notFound();

  return (
    <div>
      <Link
        href="/admin/escrow/transactions"
        className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        ← دفتر الضمان
      </Link>
      <h1 className="mt-3 text-2xl font-semibold text-[var(--color-midnight-green)]">
        تحرير دفعة المورد
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        {tx.rfqs?.rfq_number ? <span className="num">{tx.rfqs?.rfq_number} — </span> : null}
        {tx.rfqs?.title ?? '—'}
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="الحالة" value={STATUS_LABEL[tx.status] ?? tx.status} />
          <Field label="إجمالي الصفقة" value={formatCurrency(tx.total_amount)} mono />
          <Field label="صافي للمورد" value={formatCurrency(tx.supplier_net)} mono />
          <Field
            label="تاريخ التحرير"
            value={tx.released_at ? formatDate(tx.released_at) : null}
          />
          <Field
            label="مرجع التحويل البنكي"
            value={tx.release_transaction_ref}
            mono
          />
          <Field label="حُرّر بواسطة" value={tx.released_by ?? null} mono />
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المورد المستفيد
        </h2>
        <p className="mt-2 text-sm">{tx.suppliers?.company_name ?? '—'}</p>
        <p className="num mt-1 text-xs text-[var(--color-stone-600)]" dir="ltr">
          {tx.suppliers?.iban ?? '—'}
        </p>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs text-[var(--color-stone-600)]">{label}</dt>
      <dd className={`mt-1 text-sm ${mono ? 'num' : ''}`}>{value ?? '—'}</dd>
    </div>
  );
}
