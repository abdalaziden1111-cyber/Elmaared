import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, formatDate, formatDateShort, timeAgo } from '@/lib/utils/format';
import { AdminRfqActions } from './admin-actions';

interface RfqDetail {
  id: string;
  rfq_number: string;
  title: string;
  description: string | null;
  service_type: string;
  status: string;
  exhibition_name: string | null;
  exhibition_city: string | null;
  exhibition_date: string | null;
  delivery_location: string | null;
  budget_min: number | null;
  budget_max: number | null;
  proposals_deadline: string | null;
  winning_proposal_id: string | null;
  awarded_at: string | null;
  created_at: string;
  client_id: string;
  companies: { name: string | null; legal_name: string | null } | null;
}

interface ProposalRow {
  id: string;
  supplier_id: string;
  total_price: number;
  delivery_days: number;
  status: string;
  created_at: string;
  suppliers: { company_name: string } | null;
}

interface ChatRow {
  id: string;
  supplier_id: string;
  panic_at: string | null;
  admin_joined_at: string | null;
  is_archived: boolean;
  suppliers: { company_name: string } | null;
}

interface AgreementRow {
  id: string;
  status: string;
  client_approved_at: string | null;
  supplier_approved_at: string | null;
  admin_approved_at: string | null;
}

interface EscrowRow {
  id: string;
  status: string;
  total_amount: number;
  initial_deposit: number;
  released_at: string | null;
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

const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  submitted: 'مُقدَّم',
  under_review: 'قيد المراجعة',
  shortlisted: 'في القائمة المختصرة',
  accepted: 'مقبول',
  rejected: 'مرفوض',
  withdrawn: 'مسحوب',
};

const ESCROW_STATUS_LABEL: Record<string, string> = {
  awaiting_deposit: 'بانتظار الإيداع',
  deposit_received: 'تم استلام الإيداع',
  work_in_progress: 'قيد التنفيذ',
  delivered: 'تم التسليم',
  final_payment: 'الدفعة النهائية',
  released: 'مُحرّر',
  refunded: 'مُسترد',
  partial_refund: 'استرداد جزئي',
};

export default async function AdminRfqDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select(
      'id, rfq_number, title, description, service_type, status, exhibition_name, exhibition_city, exhibition_date, delivery_location, budget_min, budget_max, proposals_deadline, winning_proposal_id, awarded_at, created_at, client_id, companies(name, legal_name)'
    )
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
  const rfq = rfqRaw as RfqDetail | null;
  if (!rfq) notFound();

  const { data: proposalsRaw } = await admin
    .from('proposals')
    .select('id, supplier_id, total_price, delivery_days, status, created_at, suppliers(company_name)')
    .eq('rfq_id', id)
    .order('created_at', { ascending: false });
  const proposals = (proposalsRaw ?? []) as unknown as ProposalRow[];

  const { data: chatsRaw } = await admin
    .from('chats')
    .select('id, supplier_id, panic_at, admin_joined_at, is_archived, suppliers(company_name)')
    .eq('rfq_id', id)
    .order('created_at', { ascending: false });
  const chats = (chatsRaw ?? []) as unknown as ChatRow[];

  const { data: agreementRaw } = await admin
    .from('agreements')
    .select('id, status, client_approved_at, supplier_approved_at, admin_approved_at')
    .eq('rfq_id', id)
    .maybeSingle();
  const agreement = agreementRaw as AgreementRow | null;

  const { data: escrowRaw } = await admin
    .from('escrow_transactions')
    .select('id, status, total_amount, initial_deposit, released_at')
    .eq('rfq_id', id)
    .maybeSingle();
  const escrow = escrowRaw as EscrowRow | null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-stone-600)] num">{rfq.rfq_number}</div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
            {rfq.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            العميل: {rfq.companies?.name ?? rfq.companies?.legal_name ?? '—'} · أُنشئ{' '}
            {timeAgo(rfq.created_at)}
          </p>
        </div>
        <span className="rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
          {STATUS_LABEL[rfq.status] ?? rfq.status}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card label="نوع الخدمة" value={rfq.service_type} />
        <Card label="المعرض" value={rfq.exhibition_name ?? '—'} />
        <Card label="المدينة" value={rfq.exhibition_city ?? '—'} />
        <Card
          label="تاريخ المعرض"
          value={rfq.exhibition_date ? formatDateShort(rfq.exhibition_date) : '—'}
        />
        <Card
          label="الميزانية"
          value={
            rfq.budget_min || rfq.budget_max
              ? `${formatCurrency(rfq.budget_min ?? 0)} - ${formatCurrency(rfq.budget_max ?? 0)}`
              : '—'
          }
        />
        <Card
          label="آخر موعد للعروض"
          value={rfq.proposals_deadline ? formatDate(rfq.proposals_deadline) : '—'}
        />
      </div>

      {rfq.description ? (
        <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            تفاصيل الطلب
          </h2>
          <p className="mt-3 whitespace-pre-line text-sm text-[var(--color-charcoal)]">
            {rfq.description}
          </p>
        </section>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          العروض ({proposals.length})
        </h2>
        {proposals.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-stone-600)]">لا توجد عروض بعد.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {proposals.map((p) => {
              const isWinner = rfq.winning_proposal_id === p.id;
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-sm ${
                    isWinner
                      ? 'border-[var(--color-success)] bg-[var(--color-success-100)]/30'
                      : 'border-[var(--color-stone-300)]'
                  }`}
                >
                  <div>
                    <div className="font-semibold">
                      {p.suppliers?.company_name ?? '—'}
                      {isWinner ? (
                        <span className="ms-2 rounded-full bg-[var(--color-success)] px-2 py-0.5 text-xs text-white">
                          الفائز
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-stone-600)]">
                      <span className="num">{formatCurrency(p.total_price)}</span> ·{' '}
                      {p.delivery_days} يوم · قُدِّم {timeAgo(p.created_at)}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--color-stone-100)] px-3 py-1 text-xs">
                    {PROPOSAL_STATUS_LABEL[p.status] ?? p.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المحادثات ({chats.length})
        </h2>
        {chats.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--color-stone-600)]">لا توجد محادثات.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {chats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/chats/${c.id}`}
                  className={`flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-sm hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
                    c.panic_at
                      ? 'border-[var(--color-danger)] bg-[var(--color-danger-100)]/30'
                      : 'border-[var(--color-stone-300)]'
                  }`}
                >
                  <span>
                    {c.panic_at ? '🚨 ' : ''}
                    مع {c.suppliers?.company_name ?? '—'}
                  </span>
                  <span className="text-xs text-[var(--color-stone-600)]">
                    {c.admin_joined_at ? 'انضم Admin · ' : ''}
                    {c.is_archived ? 'مؤرشفة' : 'مفتوحة'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card
          label="الاتفاق"
          value={
            agreement
              ? `${agreement.status}${
                  agreement.admin_approved_at
                    ? ` · اعتمده Admin ${timeAgo(agreement.admin_approved_at)}`
                    : ''
                }`
              : 'لا يوجد اتفاق'
          }
        />
        <Card
          label="الضمان (Escrow)"
          value={
            escrow
              ? `${ESCROW_STATUS_LABEL[escrow.status] ?? escrow.status} · ${formatCurrency(escrow.total_amount)}`
              : 'لا يوجد ضمان'
          }
        />
      </section>

      <AdminRfqActions rfqId={rfq.id} currentStatus={rfq.status} />

      <div className="mt-8">
        <Link
          href="/admin/rfqs"
          className="text-sm text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          ← العودة للقائمة
        </Link>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <p className="text-xs text-[var(--color-stone-600)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--color-charcoal)]">{value}</p>
    </div>
  );
}
