import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils/format';
import { ReceiptUploadForm } from './receipt-upload-form';
import { ApproveDeliveryButton } from './approve-delivery-button';

interface EscrowRow {
  id: string;
  rfq_id: string;
  total_amount: number;
  initial_deposit: number;
  final_payment: number;
  client_fee: number;
  client_fee_vat: number;
  status: string;
}

export default async function ClientEscrowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;
  const { user: _user } = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rowRaw } = await supabase
    .from('escrow_transactions')
    .select(
      'id, rfq_id, total_amount, initial_deposit, final_payment, client_fee, client_fee_vat, status'
    )
    .eq('rfq_id', rfqId)
    .single();
  const tx = rowRaw as unknown as EscrowRow | null;
  if (!tx) notFound();

  const iban = process.env.PLATFORM_IBAN ?? 'SA0000000000000000000000';
  const bankName = process.env.PLATFORM_BANK_NAME ?? 'البنك الأهلي السعودي';
  const accountHolder =
    process.env.PLATFORM_ACCOUNT_HOLDER ?? 'شركة تطبيق المعارض';

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        الضمان (Escrow)
      </h1>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="القيمة الإجمالية" value={formatCurrency(tx.total_amount)} />
        <Stat label="الإيداع المبدئي" value={formatCurrency(tx.initial_deposit)} />
        <Stat label="الدفعة النهائية" value={formatCurrency(tx.final_payment)} />
        <Stat label="الحالة" value={tx.status} />
      </section>

      {tx.status === 'awaiting_deposit' || tx.status === 'deposit_received' ? (
        <section className="mt-8 rounded-2xl bg-white p-5">
          <h2 className="text-base font-semibold">حوّل الإيداع المبدئي إلى الحساب التالي</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <Row label="البنك" value={bankName} />
            <Row label="صاحب الحساب" value={accountHolder} />
            <Row label="IBAN" value={iban} mono />
            <Row label="المبلغ" value={formatCurrency(tx.initial_deposit)} mono />
          </dl>
          <p className="mt-4 text-xs text-[var(--color-stone-600)]">
            بعد التحويل، الصق رابط إيصال البنك في الحقل أدناه. يقوم Admin بالتأكيد خلال 24 ساعة عمل.
          </p>
          <div className="mt-4">
            <ReceiptUploadForm escrowId={tx.id} status={tx.status} />
          </div>
        </section>
      ) : null}

      {tx.status === 'delivered' ? (
        <section className="mt-8 rounded-2xl bg-[var(--color-success-100)] p-5">
          <h2 className="text-base font-semibold">تمّ تسليم المشروع</h2>
          <p className="mt-1 text-sm">
            راجع التسليم. اعتماده يطلق الدفعة النهائية للمورد بعد خصم الرسوم.
          </p>
          <div className="mt-4">
            <ApproveDeliveryButton rfqId={rfqId} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium num">{value}</div>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-stone-100)] py-2">
      <dt className="text-[var(--color-stone-600)]">{label}</dt>
      <dd className={`font-medium ${mono ? 'num' : ''}`}>{value}</dd>
    </div>
  );
}
