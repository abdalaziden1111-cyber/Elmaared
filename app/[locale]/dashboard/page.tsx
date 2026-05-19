import { unstable_cache } from 'next/cache';
import { Plus, Compass, FileText, Hourglass, MessageSquare, CheckCircle2, Calendar } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDate } from '@/lib/utils/format';
import {
  RFQ_STATUS_LABEL as STATUS_LABEL,
  SERVICE_LABEL,
  RFQ_STATUS_TONE,
} from '@/lib/constants/labels';
import { inTrustStatusLabel } from '@/lib/i18n/trust-name';
import { flags } from '@/lib/feature-flags';

// Sprint 6 S6.1 — "top suppliers" list is user-agnostic + changes rarely.
// Cache for 5 minutes under the `top-suppliers` tag so admin actions that
// approve/reject suppliers can call `revalidateTag('top-suppliers')` and
// flush this without waiting for the TTL.
const TOP_SUPPLIERS_TTL_SECONDS = 5 * 60;
const getTopApprovedSuppliers = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data } = await admin
      .from('suppliers')
      .select(
        'id, company_name, specializations, cities, total_completed_orders, average_rating',
      )
      .eq('status', 'approved')
      .order('total_completed_orders', { ascending: false })
      .limit(4);
    return (data ?? []) as Array<{
      id: string;
      company_name: string;
      specializations: string[];
      cities: string[];
      total_completed_orders: number;
      average_rating: number | null;
    }>;
  },
  ['top-approved-suppliers-v1'],
  { revalidate: TOP_SUPPLIERS_TTL_SECONDS, tags: ['top-suppliers'] },
);

const UPCOMING_EXHIBITIONS = [
  { name: 'LEAP 2027', date: '2027-02-08', city: 'الرياض' },
  { name: 'Cityscape Global 2026', date: '2026-11-10', city: 'الرياض' },
  { name: 'GITEX Saudi Arabia 2026', date: '2026-10-05', city: 'الرياض' },
];

const ACTIVE_STATUSES = ['open', 'negotiating', 'awarded'];
const IN_ESCROW_STATUSES = ['in_escrow', 'in_progress'];

export default async function DashboardHomePage() {
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  // Sprint 6 S6.1 — the two queries below are independent: the buyer's RFQ
  // list and the global top-suppliers list. Running them in parallel removes
  // the serial wait and halves the dashboard's server time on cold loads.
  // `getTopApprovedSuppliers` is unstable_cache'd (5-min TTL, top-suppliers
  // tag) so most renders skip the DB roundtrip entirely.
  const [{ data: rfqsRaw }, suggested] = await Promise.all([
    admin
      .from('rfqs')
      .select(
        'id, rfq_number, title, service_type, status, created_at, proposals_deadline',
      )
      .eq('client_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    getTopApprovedSuppliers(),
  ]);
  const rfqs = (rfqsRaw ?? []) as Array<{
    id: string;
    rfq_number: string;
    title: string;
    service_type: string;
    status: string;
    created_at: string;
    proposals_deadline: string | null;
  }>;

  const kpis = {
    active: rfqs.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
    proposalsAwaiting: rfqs.filter((r) => r.status === 'open').length,
    inExecution: rfqs.filter((r) => IN_ESCROW_STATUSES.includes(r.status)).length,
    completed: rfqs.filter((r) => r.status === 'completed').length,
  };

  const recent = rfqs.slice(0, 5);

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            أهلاً بك
          </h1>
          <p className="mt-2 text-sm text-[var(--color-stone-600)]">
            ابدأ بإنشاء طلب عرض أسعار جديد للمورّدين، أو استكشف موردي المنصة.
          </p>
        </div>
        <Link
          href="/dashboard/onboarding/welcome"
          className="text-xs font-medium text-[var(--color-action-blue)] hover:underline"
        >
          جولة تعريفية ←
        </Link>
      </header>

      {/* KPI cards */}
      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label="طلبات نشطة"
            value={kpis.active}
            icon={<FileText className="size-5" aria-hidden />}
            tone="default"
          />
          <Kpi
            label="بانتظار العروض"
            value={kpis.proposalsAwaiting}
            icon={<Hourglass className="size-5" aria-hidden />}
            tone="info"
          />
          <Kpi
            label="قيد التنفيذ"
            value={kpis.inExecution}
            icon={<MessageSquare className="size-5" aria-hidden />}
            tone="warning"
          />
          <Kpi
            label="مكتملة"
            value={kpis.completed}
            icon={<CheckCircle2 className="size-5" aria-hidden />}
            tone="success"
          />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/rfqs/new"
          className="group rounded-2xl bg-[var(--color-midnight-green)] p-5 text-[var(--color-cream)] transition hover:bg-[var(--color-midnight-green-700)]"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-white/10">
              <Plus className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold">أنشئ طلباً جديداً</h2>
              <p className="mt-1 text-xs opacity-90">
                خدمة، مدينة، ميزانية — ودع المنصة تجلب لك العروض في 24 ساعة.
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/discover"
          className="group rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 transition hover:border-[var(--color-action-blue)]"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-[var(--color-midnight-green)]">
              <Compass className="size-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
                استكشف موردين معتمدين
              </h2>
              <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                تصفّح المعرض حسب التخصص والمدينة.
              </p>
            </div>
          </div>
        </Link>
      </section>

      {/* Recent RFQs */}
      <section>
        <header className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-midnight-green)]">
            طلباتك الأخيرة
          </h2>
          {recent.length > 0 ? (
            <Link
              href="/dashboard/rfqs"
              className="text-xs font-medium text-[var(--color-action-blue)] hover:underline"
            >
              كل الطلبات ←
            </Link>
          ) : null}
        </header>
        {recent.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-8 text-center text-sm text-[var(--color-stone-600)]">
            لا توجد طلبات بعد. ابدأ بإنشاء طلبك الأول لتصلك عروض من موردين معتمدين.
          </p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {recent.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/rfqs/${r.id}`}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-[var(--color-stone-300)] bg-white p-4 transition hover:border-[var(--color-action-blue)]"
                >
                  <div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-stone-600)]">
                      <span className="font-mono">{r.rfq_number}</span>
                      <span aria-hidden>·</span>
                      <span>{SERVICE_LABEL[r.service_type] ?? r.service_type}</span>
                      <span aria-hidden>·</span>
                      <span>{formatDate(r.created_at, 'ar')}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-midnight-green)]">
                      {r.title}
                    </p>
                  </div>
                  <StatusChip status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming exhibitions */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--color-midnight-green)]">
          المعارض القادمة
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {UPCOMING_EXHIBITIONS.map((ex) => (
            <li
              key={ex.name}
              className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4"
            >
              <div className="flex items-center gap-2 text-xs text-[var(--color-stone-600)]">
                <Calendar className="size-4" aria-hidden />
                <span>{formatDate(ex.date, 'ar')}</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-[var(--color-midnight-green)]">
                {ex.name}
              </p>
              <p className="mt-1 text-xs text-[var(--color-stone-600)]">{ex.city}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Suggested suppliers */}
      <section>
        <header className="flex items-end justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-midnight-green)]">
            {flags.CONCIERGE_MODE
              ? 'فريقنا يبحث لك'
              : 'موردون مقترحون لك'}
          </h2>
          <Link
            href="/discover"
            className="text-xs font-medium text-[var(--color-action-blue)] hover:underline"
          >
            {flags.CONCIERGE_MODE ? 'كل الفرص ←' : 'كل الموردين ←'}
          </Link>
        </header>
        {flags.CONCIERGE_MODE ? (
          <p
            className="mt-3 rounded-2xl border border-dashed border-[var(--color-action-blue)]/40 bg-[var(--color-action-blue)]/5 p-4 text-sm text-[var(--color-charcoal)]"
            data-component="concierge-dashboard-banner"
          >
            خلال السنة الأولى من Elmaared، فريق Customer Success
            يتفاوض نيابة عنك مع موردين موثوقين خارج المنصة. بمجرد أن
            ترسل طلبك، سيتواصل معك مدير حسابك خلال ٢٤ ساعة بعروض مُختارة يدوياً.
          </p>
        ) : null}
        {suggested.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-8 text-center text-sm text-[var(--color-stone-600)]">
            {flags.CONCIERGE_MODE
              ? 'فريقنا يجهّز لك عروضاً مُختارة. سيظهرون هنا قريباً.'
              : 'لا توجد موردون معتمدون بعد.'}
          </p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {suggested.map((s) => (
              <li
                key={s.id}
                className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4"
              >
                <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--color-midnight-green-100)] text-base font-semibold text-[var(--color-midnight-green)]">
                  {s.company_name.slice(0, 1)}
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--color-midnight-green)]">
                  {s.company_name}
                </p>
                <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                  {s.specializations
                    .map((sp) => SERVICE_LABEL[sp] ?? sp)
                    .slice(0, 3)
                    .join(' · ')}
                </p>
                <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                  {s.cities.slice(0, 2).join(' · ')}
                </p>
                <p className="mt-3 text-xs text-[var(--color-stone-600)]">
                  {s.total_completed_orders} مشروع · ⭐{' '}
                  {s.average_rating ? s.average_rating.toFixed(1) : '—'}
                </p>
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
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'default' | 'info' | 'warning' | 'success';
}) {
  const toneMap = {
    default: 'bg-white text-[var(--color-midnight-green)]',
    info: 'bg-[var(--color-info-100)] text-[var(--color-info)]',
    warning: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
    success: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  } as const;
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex size-10 items-center justify-center rounded-xl ${toneMap[tone]}`}
        >
          {icon}
        </span>
        <div>
          <p className="text-xs text-[var(--color-stone-600)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const label =
    status === 'in_escrow' ? inTrustStatusLabel('ar') : STATUS_LABEL[status] ?? status;
  return (
    <span
      className={`inline-flex h-7 shrink-0 items-center rounded-full px-3 text-xs font-medium ${
        RFQ_STATUS_TONE[status] ?? RFQ_STATUS_TONE.draft
      }`}
    >
      {label}
    </span>
  );
}
