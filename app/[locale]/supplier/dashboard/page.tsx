import { redirect } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSupplierKpiSnapshot } from '@/lib/supplier/kpis';
import { formatCurrency } from '@/lib/utils/format';
import { KpiCard } from '@/components/supplier/kpi-card';
import { RevenueBarChart } from '@/components/supplier/charts/revenue-bar';
import { CategoryPieChart } from '@/components/supplier/charts/category-pie';
import { SatisfactionLineChart } from '@/components/supplier/charts/satisfaction-line';
import { WinRateBarChart } from '@/components/supplier/charts/win-rate-bar';

// Phase V6.1 — Supplier KPI dashboard.
//
// Renders 6 KPI cards + 4 charts, all driven by a single parallel
// Promise.all in lib/supplier/kpis.ts. RTL-aware (charts reverse the
// X axis when locale=ar). Falls through to /supplier/pending when the
// account hasn't been approved yet.

export default async function SupplierDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { user } = await requireRole(['supplier']);
  const admin = createAdminClient();

  const { data: supplierRowRaw } = await admin
    .from('suppliers')
    .select('id, status')
    .eq('owner_id', user.id)
    .maybeSingle();
  const supplier = supplierRowRaw as { id: string; status: string } | null;
  if (!supplier) redirect(`/${locale}/supplier/pending`);
  if (supplier.status !== 'approved') {
    redirect(`/${locale}/supplier/pending`);
  }

  const snap = await getSupplierKpiSnapshot(supplier.id, admin);
  const isAr = locale === 'ar';

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          لوحة الأداء
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          نظرة سريعة على عروضك، إيراداتك، وتقييماتك.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="إجمالي العروض"
          value={String(snap.proposals.lifetime)}
          sublabel={`${snap.proposals.thisMonth} هذا الشهر`}
        />
        <KpiCard
          label="معدّل القبول"
          value={
            snap.proposals.acceptanceRatePct === null
              ? '—'
              : `${snap.proposals.acceptanceRatePct}٪`
          }
          sublabel={`${snap.proposals.accepted} عرض مقبول`}
        />
        <KpiCard
          label="مشاريع نشطة"
          value={String(snap.activeProjects)}
        />
        <KpiCard
          label="إيراد هذا العام"
          value={`${formatCurrency(snap.revenueYoY.thisYear)} ﷼`}
          sublabel={`مقابل ${formatCurrency(snap.revenueYoY.lastYear)} العام الماضي`}
          deltaPct={snap.revenueYoY.growthPct}
        />
        <KpiCard
          label="متوسط التقييم"
          value={
            snap.rating.average === null
              ? '—'
              : `${snap.rating.average} ★`
          }
          sublabel={`${snap.rating.count} تقييم`}
        />
        <KpiCard
          label="إيراد آخر شهر"
          value={`${formatCurrency(snap.monthlyRevenue.at(-1)?.total ?? 0)} ﷼`}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <ChartCard title="الإيراد الشهري — آخر ١٢ شهر">
          <RevenueBarChart data={snap.monthlyRevenue} rtl={isAr} />
        </ChartCard>
        <ChartCard title="توزّع العروض حسب الفئة">
          <CategoryPieChart data={snap.categoryWinRate} />
        </ChartCard>
        <ChartCard title="معدّل الفوز حسب الفئة">
          <WinRateBarChart data={snap.categoryWinRate} rtl={isAr} />
        </ChartCard>
        <ChartCard title="اتجاه رضا العملاء — آخر ١٢ شهر">
          <SatisfactionLineChart data={snap.ratingTrend} rtl={isAr} />
        </ChartCard>
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          إجراءات سريعة
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionLink href="/supplier/rfqs" label="الطلبات المتاحة" />
          <QuickActionLink href="/supplier/proposals" label="عروضي" />
          <QuickActionLink href="/supplier/projects" label="مشاريعي" />
          <QuickActionLink href="/supplier/profile/portfolio" label="تحديث ملفي" />
        </div>
      </section>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function QuickActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-[var(--color-stone-300)] bg-white px-4 py-3 text-sm font-medium hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)]"
    >
      {label}
    </Link>
  );
}
