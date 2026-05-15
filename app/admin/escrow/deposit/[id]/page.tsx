import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate } from '@/lib/utils/format';

interface EscrowRow {
  id: string;
  rfq_id: string;
  status: string;
  total_amount: number;
  initial_deposit: number;
  initial_deposit_receipt_url: string | null;
  initial_deposit_received_at: string | null;
  initial_deposit_confirmed_by: string | null;
  rfqs: { rfq_number: string; title: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع',
  deposit_received: 'إيداع مبدئي',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  released: 'مُحرّر',
  refunded: 'مُسترد',
};

export default async function AdminDepositDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: rowRaw } = await admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, status, total_amount, initial_deposit, initial_deposit_receipt_url, initial_deposit_received_at, initial_deposit_confirmed_by, rfqs(rfq_number, title)'
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
        تفاصيل الإيداع المبدئي
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        {tx.rfqs?.rfq_number ? <span className="num">{tx.rfqs?.rfq_number} — </span> : null}
        {tx.rfqs?.title ?? '—'}
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="الحالة" value={STATUS_LABEL[tx.status] ?? tx.status} />
          <Field label="إجمالي الصفقة" value={formatCurrency(tx.total_amount)} mono />
          <Field label="الإيداع المبدئي (50%)" value={formatCurrency(tx.initial_deposit)} mono />
          <Field
            label="تاريخ استلام الإيصال"
            value={
              tx.initial_deposit_received_at
                ? formatDate(tx.initial_deposit_received_at)
                : null
            }
          />
          <Field label="أكّد بواسطة" value={tx.initial_deposit_confirmed_by ?? null} mono />
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          إيصال البنك
        </h2>
        {tx.initial_deposit_receipt_url ? (
          <a
            href={tx.initial_deposit_receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            افتح الإيصال ←
          </a>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">لم يُرفع إيصال بعد.</p>
        )}
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
