import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { formatCurrency } from '@/lib/utils/format';
import {
  fetchFunnel,
  fetchDailyActiveUsers,
  POSTHOG_REST_CONFIGURED,
} from '@/lib/analytics/posthog-rest';

// Phase V3.2 — Admin analytics dashboard.
//
// Three layers of data:
//   1. PostHog funnel (visitor → signup → first RFQ → first proposal → first contract)
//   2. PostHog DAU/MAU trends
//   3. Local DB aggregates: top service categories, geographic distribution
//
// PostHog blocks degrade gracefully to a "configure" hint when
// POSTHOG_API_KEY/POSTHOG_PROJECT_ID aren't set, so the page still renders
// the local-DB sections in any environment.

const FUNNEL_STEPS = [
  { eventName: '$pageview', label: 'زيارة' },
  { eventName: 'rfq_created', label: 'إنشاء RFQ أول' },
  { eventName: 'milestone_celebrated', label: 'أول عرض / اتفاق' },
  { eventName: 'escrow_payment_completed', label: 'إيداع أمانة' },
];

export default async function AdminAnalyticsPage() {
  const admin = createAdminClient();

  const [funnel, dau, topCategories, geoSpread, totalsRows] = await Promise.all([
    fetchFunnel(FUNNEL_STEPS, 30),
    fetchDailyActiveUsers(30),
    admin
      .from('rfqs')
      .select('service_type')
      .then(({ data }) => {
        const counts = new Map<string, number>();
        for (const row of (data ?? []) as Array<{ service_type: string }>) {
          counts.set(row.service_type, (counts.get(row.service_type) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
      }),
    admin
      .from('rfqs')
      .select('exhibition_city')
      .not('exhibition_city', 'is', null)
      .then(({ data }) => {
        const counts = new Map<string, number>();
        for (const row of (data ?? []) as Array<{ exhibition_city: string | null }>) {
          if (!row.exhibition_city) continue;
          counts.set(row.exhibition_city, (counts.get(row.exhibition_city) ?? 0) + 1);
        }
        return Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
      }),
    admin
      .from('rfqs')
      .select('id, status')
      .then(({ data, count }) => ({
        rfqs: (data ?? []).length,
        open: ((data ?? []) as Array<{ status: string }>).filter(
          (r) => r.status === 'open'
        ).length,
        completed: ((data ?? []) as Array<{ status: string }>).filter(
          (r) => r.status === 'completed'
        ).length,
        _: count,
      })),
  ]);

  const dauTotal = dau.available
    ? dau.days.reduce((s, d) => s + d.count, 0)
    : 0;

  return (
    <div>
      <Breadcrumbs items={[{ href: '/admin', label: 'نظرة عامة' }, { label: 'التحليلات' }]} />
      <header className="mt-2 mb-6">
        <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
          التحليلات
        </h1>
        <p className="mt-1 text-sm text-[var(--color-stone-600)]">
          نظرة عامة على القمع، النشاط اليومي، وأهم الفئات + المدن — آخر ٣٠ يوم.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiTile label="إجمالي RFQs" value={String(totalsRows.rfqs)} />
        <KpiTile label="مفتوح حالياً" value={String(totalsRows.open)} />
        <KpiTile label="مكتمل" value={String(totalsRows.completed)} />
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          قمع التحوّل (PostHog)
        </h2>
        {!POSTHOG_REST_CONFIGURED ? (
          <ConfigureHint
            message="عرّف POSTHOG_PROJECT_ID + POSTHOG_API_KEY في .env.local لتفعيل القمع المباشر."
          />
        ) : !funnel.available ? (
          <ConfigureHint message={funnel.error ?? 'لا توجد بيانات بعد'} />
        ) : (
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white">
            <table className="w-full text-start text-sm">
              <thead className="bg-[var(--color-stone-100)] text-xs font-medium text-[var(--color-stone-600)]">
                <tr>
                  <th className="px-4 py-3 text-start">الخطوة</th>
                  <th className="px-4 py-3 text-start">العدد</th>
                  <th className="px-4 py-3 text-start">معدّل التحوّل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-stone-300)]">
                {funnel.steps.map((s) => (
                  <tr key={s.label}>
                    <td className="px-4 py-3 font-semibold text-[var(--color-charcoal)]">
                      {s.label}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatCurrency(s.count)}</td>
                    <td className="px-4 py-3 tabular-nums text-[var(--color-stone-600)]">
                      {s.conversionPct === null ? '—' : `${s.conversionPct}٪`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          المستخدمون النشطون يومياً (DAU) — آخر ٣٠ يوم
        </h2>
        {!POSTHOG_REST_CONFIGURED ? (
          <ConfigureHint message="يتطلب إعداد PostHog." />
        ) : !dau.available || dau.days.length === 0 ? (
          <ConfigureHint message={dau.error ?? 'لا توجد بيانات بعد'} />
        ) : (
          <>
            <div className="mt-2 text-sm text-[var(--color-stone-600)]">
              مجموع جلسات الـ٣٠ يوم: <strong className="text-[var(--color-charcoal)] tabular-nums">{dauTotal}</strong>
            </div>
            <div className="mt-3 flex items-end gap-1 overflow-x-auto rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
              {dau.days.map((d) => {
                const max = Math.max(...dau.days.map((x) => x.count), 1);
                const heightPct = Math.round((d.count / max) * 100);
                return (
                  <div
                    key={d.date}
                    className="flex flex-col items-center gap-1"
                    title={`${d.date}: ${d.count}`}
                  >
                    <div
                      className="w-3 rounded-sm bg-[var(--color-action-blue,#0E3B43)]"
                      style={{ height: `${Math.max(2, heightPct)}px` }}
                    />
                    <span className="text-[9px] text-[var(--color-stone-600)]">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            أهم فئات الخدمة (من قاعدة البيانات)
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white">
            {topCategories.length === 0 ? (
              <div className="p-6 text-sm text-[var(--color-stone-600)]">
                لا توجد بيانات RFQ بعد.
              </div>
            ) : (
              <table className="w-full text-start text-sm">
                <tbody className="divide-y divide-[var(--color-stone-300)]">
                  {topCategories.map(([cat, count]) => (
                    <tr key={cat}>
                      <td className="px-4 py-3 font-semibold">{cat}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
            التوزّع الجغرافي (RFQs حسب المدينة)
          </h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white">
            {geoSpread.length === 0 ? (
              <div className="p-6 text-sm text-[var(--color-stone-600)]">
                لا توجد بيانات مدينة بعد.
              </div>
            ) : (
              <table className="w-full text-start text-sm">
                <tbody className="divide-y divide-[var(--color-stone-300)]">
                  {geoSpread.map(([city, count]) => (
                    <tr key={city}>
                      <td className="px-4 py-3 font-semibold">{city}</td>
                      <td className="px-4 py-3 text-end tabular-nums">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-midnight-green)]">
        {value}
      </div>
    </div>
  );
}

function ConfigureHint({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-5 text-sm text-[var(--color-stone-600)]">
      {message}
    </div>
  );
}
