import { notFound } from 'next/navigation';
import { MessageSquare, Phone } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import {
  LiveTimeline,
  type TimelineEvent,
  type TimelineEventKind,
  type SlaStatus,
} from '@/components/trust/live-timeline';

// Phase U5.1 — Project Execution page (Plan v2 §4 Process Trust Layer).
// Hosts the LiveTimeline component over the escrow_events ledger for the
// currently-running project. Provides a quick contact CTA to the supplier
// chat. Available only when the RFQ has progressed past 'awarded'.

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  client_id: string;
  status: string;
  exhibition_date: string | null;
  winning_proposal_id: string | null;
}

interface EscrowEventRow {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

// Maps DB escrow_event_type → LiveTimeline event kind + a human-readable
// title. Keeps the LiveTimeline component shape-agnostic about the DB enum.
const EVENT_META: Record<
  string,
  { kind: TimelineEventKind; title: string }
> = {
  deposit_initiated: { kind: 'kickoff', title: 'بدء عملية الإيداع' },
  deposit_receipt_uploaded: {
    kind: 'check_in',
    title: 'رفع إيصال الإيداع للمراجعة',
  },
  deposit_confirmed: { kind: 'milestone', title: 'تأكيد استلام الإيداع' },
  work_started: { kind: 'milestone', title: 'بدء العمل على المشروع' },
  delivery_submitted: { kind: 'delivery', title: 'تم تسليم العمل' },
  delivery_approved: { kind: 'milestone', title: 'اعتماد التسليم' },
  final_payment_initiated: {
    kind: 'check_in',
    title: 'بدء عملية الدفع النهائي',
  },
  final_payment_confirmed: { kind: 'milestone', title: 'تأكيد الدفع النهائي' },
  released_to_supplier: { kind: 'milestone', title: 'إطلاق المبلغ للمورد' },
  invoice_issued: { kind: 'check_in', title: 'إصدار الفاتورة' },
  dispute_opened: { kind: 'issue', title: 'فتح نزاع' },
  partial_refund_issued: { kind: 'issue', title: 'استرداد جزئي' },
  full_refund_issued: { kind: 'issue', title: 'استرداد كامل' },
};

function deriveSla(
  exhibitionDate: string | null,
  status: string,
): { status: SlaStatus; daysRemaining?: number; deadline?: string } {
  if (status === 'completed') return { status: 'completed' };
  if (!exhibitionDate) return { status: 'on_track' };
  const now = new Date();
  const target = new Date(exhibitionDate);
  const days = Math.ceil((target.getTime() - now.getTime()) / 86400_000);
  if (days < 0) return { status: 'overdue', daysRemaining: days, deadline: exhibitionDate };
  if (days <= 7) return { status: 'at_risk', daysRemaining: days, deadline: exhibitionDate };
  return { status: 'on_track', daysRemaining: days, deadline: exhibitionDate };
}

export default async function ProjectExecutionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;
  const { user } = await requireRole(['client']);

  // Admin client to sidestep the recursive RLS pair on rfqs ↔ proposals.
  // Enforce ownership manually below.
  const admin = createAdminClient();

  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('id, rfq_number, title, client_id, status, exhibition_date, winning_proposal_id')
    .eq('id', rfqId)
    .is('deleted_at', null)
    .single();
  const rfq = rfqRaw as RfqRow | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  // Resolve the escrow tx via rfq_id, then pull events.
  const { data: txRaw } = await admin
    .from('escrow_transactions')
    .select('id, status, agreement_id')
    .eq('rfq_id', rfqId)
    .maybeSingle();
  const tx = txRaw as { id: string; status: string; agreement_id: string } | null;

  let events: TimelineEvent[] = [];
  if (tx) {
    const { data: evRaw } = await admin
      .from('escrow_events')
      .select('id, event_type, created_at, metadata')
      .eq('escrow_id', tx.id)
      .order('created_at', { ascending: true });
    const rows = (evRaw ?? []) as EscrowEventRow[];
    events = rows.map((r) => {
      const meta = EVENT_META[r.event_type] ?? {
        kind: 'check_in' as TimelineEventKind,
        title: r.event_type,
      };
      return {
        id: r.id,
        kind: meta.kind,
        title: meta.title,
        timestamp: r.created_at,
      };
    });
  }

  const sla = deriveSla(rfq.exhibition_date, rfq.status);
  const chatHref = rfq.winning_proposal_id
    ? `/dashboard/rfqs/${rfqId}` // chat lives off RFQ detail; user clicks through
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${rfqId}`, label: rfq.rfq_number },
          { label: 'تنفيذ المشروع' },
        ]}
      />
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        تنفيذ المشروع — {rfq.title}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        سجل الأحداث الكامل لمشروعك. كل خطوة موثّقة، كل تحديث مع وقته. لو أي
        شيء غير واضح، تواصل مع المورد مباشرة من الأسفل.
      </p>

      {/* Live Timeline — Process Trust Layer */}
      <div className="mt-6">
        <LiveTimeline events={events} sla={sla} />
      </div>

      {/* Quick contact CTAs */}
      <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          تواصل سريع
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          أي سؤال عن المشروع — راسل المورد مباشرة، أو اتصل بفريق Elmaared
          لو احتجت تدخّل.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {chatHref ? (
            <Link
              href={chatHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-action-blue)] px-4 py-2 font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
            >
              <MessageSquare className="size-4" aria-hidden />
              فتح المحادثة مع المورد
            </Link>
          ) : null}
          <a
            href="tel:+9668001234567"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-stone-300)] px-4 py-2 font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)]"
          >
            <Phone className="size-4" aria-hidden />
            اتصل بـ Elmaared
          </a>
        </div>
      </section>
    </div>
  );
}
