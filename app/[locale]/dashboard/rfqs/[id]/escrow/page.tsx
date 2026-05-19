import { notFound } from 'next/navigation';
import { Building2, CreditCard, Hash, User } from 'lucide-react';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatIban } from '@/lib/utils/format';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { trustName, trustLegalTooltip } from '@/lib/i18n/trust-name';
import { TrustBar } from '@/components/trust/trust-bar';
import { flags } from '@/lib/feature-flags';
import { ReceiptUploadForm } from './receipt-upload-form';
import { ApproveDeliveryButton } from './approve-delivery-button';

interface EscrowRow {
  id: string;
  rfq_id: string;
  agreement_id: string;
  total_amount: number;
  initial_deposit: number;
  final_payment: number;
  client_fee: number;
  client_fee_vat: number;
  status: string;
}

interface SupplierBank {
  company_name: string;
  bank_name: string | null;
  iban: string | null;
  account_holder_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع المبدئي',
  deposit_received: 'تم استلام الإيصال — بانتظار تأكيد المسؤول',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم — بانتظار اعتمادك',
  released: 'مكتمل',
};

export default async function ClientEscrowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;
  const { user } = await requireRole(['client']);

  // Workaround for the recursive RLS pair on rfqs ↔ proposals (escrow_parties_read
  // joins through rfqs). Read via admin and enforce ownership manually below.
  const admin = createAdminClient();

  // Verify the caller owns the RFQ before exposing escrow numbers
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, client_id, status, winning_proposal_id')
    .eq('id', rfqId)
    .is('deleted_at', null)
    .single();
  const rfq = rfqRowRaw as
    | { id: string; client_id: string; status: string; winning_proposal_id: string | null }
    | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  const { data: rowRaw } = await admin
    .from('escrow_transactions')
    .select(
      'id, rfq_id, agreement_id, total_amount, initial_deposit, final_payment, client_fee, client_fee_vat, status'
    )
    .eq('rfq_id', rfqId)
    .single();
  const tx = rowRaw as unknown as EscrowRow | null;
  if (!tx) notFound();

  // Resolve the supplier's bank details so the client knows where to transfer.
  let supplier: SupplierBank | null = null;
  if (rfq.winning_proposal_id) {
    const { data: propRaw } = await admin
      .from('proposals')
      .select('supplier_id')
      .eq('id', rfq.winning_proposal_id)
      .single();
    const prop = propRaw as { supplier_id: string } | null;
    if (prop) {
      const { data: supRaw } = await admin
        .from('suppliers')
        .select('company_name, bank_name, iban, account_holder_name')
        .eq('id', prop.supplier_id)
        .single();
      supplier = supRaw as SupplierBank | null;
    }
  }

  const trustLabel = trustName('ar');

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${rfqId}`, label: 'الطلب' },
          { label: trustLabel },
        ]}
      />
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        إيصال الدفع
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        النظام الحالي: تحوّل المبلغ مباشرةً للمورد ثم ترفع إيصال البنك كإثبات. المسؤول يراجع
        الإيصال للأرشفة والحوكمة، لا يمسك المنصة بالأموال.
      </p>
      <p
        className="mt-2 text-xs text-[var(--color-stone-600)]"
        title={trustLegalTooltip('ar')}
      >
        <span className="font-medium text-[var(--color-midnight-green)]">{trustLabel}</span>
        {' '}— {trustLegalTooltip('ar')}
      </p>

      {/* Trust Layer 3 — Outcome reassurance bar (Sprint 3 S3.3) */}
      {flags.TRUST_ARCHITECTURE ? (
        <div className="mt-4">
          <TrustBar />
        </div>
      ) : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Stat label="إجمالي الاتفاق" value={formatCurrency(tx.total_amount)} />
        <Stat
          label="الحالة"
          value={STATUS_LABEL[tx.status] ?? tx.status}
          highlight={tx.status === 'awaiting_deposit'}
        />
        <Stat label="الإيداع المبدئي (50%)" value={formatCurrency(tx.initial_deposit)} />
        <Stat label="الدفعة النهائية (50%)" value={formatCurrency(tx.final_payment)} />
      </section>

      <p className="mt-3 text-xs text-[var(--color-stone-600)]">
        رسوم المنصة (2% + 15% ضريبة) محتسبة داخل الإجمالي:{' '}
        <span className="num">{formatCurrency(tx.client_fee + tx.client_fee_vat)}</span>.
      </p>

      {/* Supplier bank details — where the client transfers */}
      {supplier && supplier.iban ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            بيانات المورد البنكية
          </h2>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            حوّل المبلغ المتفق عليه على هذه التفاصيل:
          </p>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <BankRow icon={<Building2 className="size-4" />} label="المورد" value={supplier.company_name} />
            {supplier.bank_name ? (
              <BankRow icon={<CreditCard className="size-4" />} label="البنك" value={supplier.bank_name} />
            ) : null}
            {supplier.account_holder_name ? (
              <BankRow icon={<User className="size-4" />} label="اسم صاحب الحساب" value={supplier.account_holder_name} />
            ) : null}
            <BankRow icon={<Hash className="size-4" />} label="IBAN" value={formatIban(supplier.iban)} mono />
          </dl>
        </section>
      ) : null}

      {tx.status === 'awaiting_deposit' || tx.status === 'deposit_received' ? (
        <section className="mt-8 rounded-2xl bg-white p-5 border border-[var(--color-stone-300)]">
          <h2 className="text-base font-semibold">ارفع إيصال التحويل البنكي</h2>
          <p className="mt-2 text-xs text-[var(--color-stone-600)]">
            بعد ما تحوّل المبلغ المتفق عليه للمورد مباشرةً، الصق رابط إيصال البنك هنا. المسؤول هيراجعه خلال 24 ساعة عمل.
          </p>
          <div className="mt-4">
            <ReceiptUploadForm escrowId={tx.id} status={tx.status} />
          </div>
        </section>
      ) : null}

      {tx.status === 'work_in_progress' ? (
        <section className="mt-8 rounded-2xl border border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5 p-5">
          <h2 className="text-base font-semibold text-[var(--color-action-blue)]">
            المشروع قيد التنفيذ
          </h2>
          <p className="mt-1 text-sm">
            المورد يعمل على المشروع الآن. ستصلك إشعارات عند تقديمه التسليم.
          </p>
        </section>
      ) : null}

      {tx.status === 'delivered' ? (
        <section className="mt-8 rounded-2xl bg-[var(--color-success-100)] p-5">
          <h2 className="text-base font-semibold">تمّ تسليم المشروع</h2>
          <p className="mt-1 text-sm">
            راجع التسليم. اعتماده يقفل المشروع كمكتمل ويسمح بكتابة تقييم للمورد.
          </p>
          <div className="mt-4">
            <ApproveDeliveryButton rfqId={rfqId} />
          </div>
        </section>
      ) : null}

      {tx.status === 'released' ? (
        <section className="mt-8 rounded-2xl bg-[var(--color-success-100)] p-5">
          <h2 className="text-base font-semibold text-[var(--color-success)]">
            ✓ المشروع مكتمل
          </h2>
          <p className="mt-1 text-sm">
            تمّ اعتماد التسليم وإغلاق المشروع. يمكنك ترك تقييم للمورد من صفحة الطلب.
          </p>
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        'rounded-xl p-3 ' +
        (highlight
          ? 'bg-[var(--color-warning-100)] text-[var(--color-warning)]'
          : 'bg-white')
      }
    >
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium num">{value}</div>
    </div>
  );
}

function BankRow({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--color-cream)] p-3">
      <span className="text-[var(--color-midnight-green)]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
        <div
          className={
            'mt-0.5 truncate text-sm font-medium ' + (mono ? 'font-mono' : '')
          }
          dir={mono ? 'ltr' : undefined}
        >
          {value}
        </div>
      </div>
    </div>
  );
}
