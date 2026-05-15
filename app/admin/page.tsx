import Link from 'next/link';
import {
  Users,
  FileText,
  MessagesSquare,
  Wallet,
  HandCoins,
  AlertTriangle,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCurrency, timeAgo } from '@/lib/utils/format';

interface AuditRow {
  id: string;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  signup_supplier: 'مورد جديد سجّل',
  approve_supplier: 'تم اعتماد مورد',
  reject_supplier: 'تم رفض مورد',
  rfq_created: 'طلب جديد',
  rfq_drafted: 'حُفظ طلب كمسودة',
  rfq_published: 'نُشر طلب',
  cancel_rfq: 'أُلغي طلب',
  rfq_cancelled: 'أُلغي طلب',
  override_rfq_status: 'تعديل حالة طلب من Admin',
  rfq_status_overridden: 'تعديل حالة طلب من Admin',
  client_profile_updated: 'حدّث عميل ملفّه',
  supplier_profile_updated: 'حدّث مورد ملفّه',
  chat_archived: 'أُرشفت محادثة',
  proposal_submitted: 'عرض جديد',
  proposal_shortlisted: 'تم ترشيح عرض',
  proposal_awarded: 'اختير عرض',
  agreement_signed: 'وُقّع اتفاق',
  deposit_receipt_uploaded: 'رُفع إيصال تحويل',
  deposit_confirmed: 'تأكيد إيداع',
  delivery_submitted: 'تم تسليم مشروع',
  delivery_approved: 'اعتمد العميل التسليم',
  dispute_opened: 'نزاع جديد',
  dispute_resolved: 'حُسم نزاع',
  panic_raised: 'تصعيد عاجل',
  admin_joined_chat: 'انضمت Admin لمحادثة',
};

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  // Run KPI queries in parallel
  const [
    openRfqs,
    activeNeg,
    inFlight,
    completed,
    pendingSuppliers,
    pendingDeposits,
    openDisputes,
    releasedSum,
    activity,
  ] = await Promise.all([
    admin.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'open').is('deleted_at', null),
    admin.from('rfqs').select('id', { count: 'exact', head: true }).in('status', ['negotiating', 'awarded']).is('deleted_at', null),
    admin.from('rfqs').select('id', { count: 'exact', head: true }).in('status', ['in_escrow', 'in_progress', 'delivered']).is('deleted_at', null),
    admin.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'completed').is('deleted_at', null),
    admin.from('suppliers').select('id', { count: 'exact', head: true }).eq('status', 'pending_review'),
    admin.from('escrow_transactions').select('id', { count: 'exact', head: true }).eq('status', 'deposit_received'),
    admin.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    admin.from('escrow_transactions').select('total_amount').eq('status', 'released'),
    admin
      .from('audit_logs')
      .select('id, actor_role, action, resource_type, resource_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const gmv = (releasedSum.data ?? []).reduce(
    (sum, r: { total_amount: number | null }) => sum + (Number(r.total_amount) || 0),
    0
  );
  const recent = (activity.data ?? []) as unknown as AuditRow[];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        نظرة عامة
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        راقب المنصة من هنا. اضغط على أي قائمة للوصول إلى تفاصيلها.
      </p>

      {/* KPI cards */}
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="إجمالي المُحرّر (GMV)"
          value={formatCurrency(gmv)}
          tone="success"
        />
        <Kpi label="مشاريع مكتملة" value={String(completed.count ?? 0)} tone="success" />
        <Kpi label="مشاريع جارية" value={String(inFlight.count ?? 0)} tone="action" />
        <Kpi label="طلبات مفتوحة" value={String(openRfqs.count ?? 0)} tone="action" />
        <Kpi label="مفاوضات قيد التقدّم" value={String(activeNeg.count ?? 0)} />
        <Kpi
          label="موردون قيد المراجعة"
          value={String(pendingSuppliers.count ?? 0)}
          tone={pendingSuppliers.count ? 'warning' : 'neutral'}
          href="/admin/suppliers/pending"
        />
        <Kpi
          label="إيداعات بانتظار التأكيد"
          value={String(pendingDeposits.count ?? 0)}
          tone={pendingDeposits.count ? 'warning' : 'neutral'}
          href="/admin/escrow/pending-deposits"
        />
        <Kpi
          label="نزاعات مفتوحة"
          value={String(openDisputes.count ?? 0)}
          tone={openDisputes.count ? 'danger' : 'neutral'}
          href="/admin/disputes"
        />
      </section>

      {/* Quick-link tiles */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          الإجراءات السريعة
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile
            href="/admin/suppliers/pending"
            icon={<Users className="size-5" />}
            title="موردون قيد المراجعة"
            desc="اعتمد التسجيلات الجديدة أو ارفضها."
          />
          <Tile
            href="/admin/rfqs"
            icon={<FileText className="size-5" />}
            title="الطلبات (RFQs)"
            desc="استعرض وأدِر كل الطلبات على المنصة."
          />
          <Tile
            href="/admin/chats"
            icon={<MessagesSquare className="size-5" />}
            title="المحادثات"
            desc="راجع المحادثات وتدخّل عند التصعيد."
          />
          <Tile
            href="/admin/escrow/pending-deposits"
            icon={<Wallet className="size-5" />}
            title="إيداعات معلّقة"
            desc="أكّد إيصالات التحويل من العملاء."
          />
          <Tile
            href="/admin/escrow/pending-releases"
            icon={<HandCoins className="size-5" />}
            title="تحرير دفعات الموردين"
            desc="أصدر الدفعات بعد اعتماد التسليم."
          />
          <Tile
            href="/admin/disputes"
            icon={<AlertTriangle className="size-5" />}
            title="النزاعات"
            desc="حلّ النزاعات الرسمية المرفوعة."
          />
        </div>
      </section>

      {/* Recent activity */}
      <section className="mt-10">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          النشاط الأخير
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-stone-600)]">
            لا يوجد نشاط مسجّل بعد.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {recent.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-[var(--color-charcoal)]">
                    {ACTION_LABEL[a.action] ?? a.action}
                  </span>
                  <span className="ms-2 text-xs text-[var(--color-stone-600)]">
                    {a.actor_role === 'admin'
                      ? '· بواسطة Admin'
                      : a.actor_role === 'client'
                        ? '· بواسطة عميل'
                        : a.actor_role === 'supplier'
                          ? '· بواسطة مورد'
                          : ''}
                  </span>
                </div>
                <span className="shrink-0 text-xs text-[var(--color-stone-600)]">
                  {timeAgo(a.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = 'neutral',
  href,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'action' | 'warning' | 'danger';
  href?: string;
}) {
  const toneCls =
    tone === 'success'
      ? 'text-[var(--color-success)]'
      : tone === 'action'
        ? 'text-[var(--color-action-blue)]'
        : tone === 'warning'
          ? 'text-[var(--color-warning)]'
          : tone === 'danger'
            ? 'text-[var(--color-danger)]'
            : 'text-[var(--color-midnight-green)]';
  const card = (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <p className="text-xs text-[var(--color-stone-600)]">{label}</p>
      <p className={`num mt-2 text-xl font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
  if (!href) return card;
  return (
    <Link
      href={href}
      className="block transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
    >
      {card}
    </Link>
  );
}

function Tile({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition-colors hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
    >
      <div className="flex items-center gap-3">
        <span className="rounded-xl bg-[var(--color-midnight-green)]/10 p-2 text-[var(--color-midnight-green)]">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-stone-600)]">{desc}</p>
        </div>
      </div>
    </Link>
  );
}
