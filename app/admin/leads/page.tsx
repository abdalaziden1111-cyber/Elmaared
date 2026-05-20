import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { timeAgo, formatCurrency } from '@/lib/utils/format';
import { RecomputeButton } from './recompute-button';

// V1.3 — Admin lead-scoring dashboard.
//
// Lists every scored user sorted by category (hot first) then by score
// desc. Each row shows the signals tooltip-style and a "Recompute" button
// that re-runs `scoreLead({ withNarrative: true })` for fresh AI text.
//
// Designed to be read at a glance: green/amber/gray chips for category,
// signal facets inline, last-computed-at timestamp on the right.

interface LeadRow {
  user_id: string;
  category: 'hot' | 'warm' | 'cold';
  score: number;
  signals: Record<string, unknown>;
  narrative: string | null;
  previous_category: string | null;
  last_computed_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string;
  role: 'client' | 'supplier';
}

const CATEGORY_LABEL = { hot: 'ساخن 🔥', warm: 'دافئ 🟡', cold: 'بارد ❄' } as const;
const CATEGORY_TONE = {
  hot: 'bg-[var(--color-error-50,#FEF2F2)] text-[var(--color-error,#B91C1C)]',
  warm: 'bg-[var(--color-warning-50,#FFFBEB)] text-[var(--color-warning,#B45309)]',
  cold: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
} as const;

function CategoryChip({ category }: { category: 'hot' | 'warm' | 'cold' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_TONE[category]}`}
      data-category={category}
    >
      {CATEGORY_LABEL[category]}
    </span>
  );
}

function SignalChips({ signals }: { signals: Record<string, unknown> }) {
  const s = signals as Record<string, number | string | null | undefined>;
  const items: Array<{ label: string; value: string }> = [];
  if (typeof s.rfqCount === 'number') items.push({ label: 'RFQ', value: `${s.rfqCount}` });
  if (typeof s.proposalsSubmitted === 'number')
    items.push({ label: 'عروض', value: `${s.proposalsSubmitted}` });
  if (typeof s.projectsCompleted === 'number')
    items.push({ label: 'مشاريع', value: `${s.projectsCompleted}` });
  if (typeof s.totalGmvSar === 'number' && s.totalGmvSar > 0)
    items.push({
      label: 'GMV',
      value: `${formatCurrency(Number(s.totalGmvSar))} ﷼`,
    });
  if (typeof s.daysSinceLastActivity === 'number')
    items.push({ label: 'آخر نشاط', value: `${s.daysSinceLastActivity} يوم` });
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1 rounded-md bg-[var(--color-stone-100)] px-2 py-0.5 text-[10px] text-[var(--color-stone-600)]"
        >
          <span className="font-semibold text-[var(--color-charcoal)]">
            {it.label}
          </span>
          {it.value}
        </span>
      ))}
    </div>
  );
}

export default async function AdminLeadsPage() {
  const admin = createAdminClient();

  const { data: leadRowsRaw } = await admin
    .from('lead_scores')
    .select(
      'user_id, category, score, signals, narrative, previous_category, last_computed_at'
    )
    .order('category', { ascending: true }) // hot < warm < cold lexically? Use score desc as the real sort below
    .order('score', { ascending: false })
    .limit(200);
  const leads = (leadRowsRaw ?? []) as LeadRow[];

  // Pull profile names for the page (one round-trip).
  const userIds = leads.map((l) => l.user_id);
  let profileMap: Map<string, ProfileRow> = new Map();
  if (userIds.length > 0) {
    const { data: profilesRaw } = await admin
      .from('profiles')
      .select('id, full_name, role')
      .in('id', userIds);
    const profiles = (profilesRaw ?? []) as ProfileRow[];
    profileMap = new Map(profiles.map((p) => [p.id, p]));
  }

  // Sort hot → warm → cold then score desc (DB sort uses lexical order on
  // the enum text which gives cold→hot — re-sort here).
  const CATEGORY_ORDER: Record<'hot' | 'warm' | 'cold', number> = {
    hot: 0,
    warm: 1,
    cold: 2,
  };
  leads.sort((a, b) => {
    const c = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category];
    if (c !== 0) return c;
    return b.score - a.score;
  });

  return (
    <div>
      <Breadcrumbs items={[{ href: '/admin', label: 'نظرة عامة' }, { label: 'اللقاءات' }]} />
      <header className="mt-2 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            اللقاءات (Leads)
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            تصنيف تلقائي للمستخدمين بناءً على نشاطهم على المنصة. اضغط "إعادة احتساب" لتحديث الدرجة + ملخص AI.
          </p>
        </div>
        <div className="text-sm text-[var(--color-stone-600)]">
          {leads.length} لقاء
        </div>
      </header>

      {leads.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-10 text-center">
          <p className="text-sm text-[var(--color-stone-600)]">
            لم يُحتسب أي لقاء بعد. شغّل <code className="rounded bg-[var(--color-stone-100)] px-1.5 py-0.5">pnpm score:leads</code> لتعبئة الجدول.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--color-stone-300)] bg-white">
          <table className="w-full text-start text-sm">
            <thead className="bg-[var(--color-stone-100)] text-xs font-medium text-[var(--color-stone-600)]">
              <tr>
                <th className="px-4 py-3 text-start">المستخدم</th>
                <th className="px-4 py-3 text-start">الفئة</th>
                <th className="px-4 py-3 text-start">الدرجة</th>
                <th className="px-4 py-3 text-start">الإشارات</th>
                <th className="px-4 py-3 text-start">آخر احتساب</th>
                <th className="px-4 py-3 text-start" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-stone-300)]">
              {leads.map((lead) => {
                const profile = profileMap.get(lead.user_id);
                return (
                  <tr key={lead.user_id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--color-charcoal)]">
                        {profile?.full_name ?? '—'}
                      </div>
                      <div className="text-xs text-[var(--color-stone-600)]">
                        {profile?.role === 'client'
                          ? 'عميل'
                          : profile?.role === 'supplier'
                          ? 'مورد'
                          : '—'}
                      </div>
                      {lead.narrative ? (
                        <p
                          className="mt-2 max-w-md whitespace-pre-line text-xs leading-relaxed text-[var(--color-stone-600)]"
                          title={lead.narrative}
                        >
                          {lead.narrative}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <CategoryChip category={lead.category} />
                      {lead.previous_category &&
                      lead.previous_category !== lead.category ? (
                        <div className="mt-1 text-[10px] text-[var(--color-stone-600)]">
                          من{' '}
                          {CATEGORY_LABEL[
                            lead.previous_category as 'hot' | 'warm' | 'cold'
                          ]}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-base font-semibold tabular-nums text-[var(--color-midnight-green)]">
                      {lead.score}
                      <span className="text-xs text-[var(--color-stone-600)]">/100</span>
                    </td>
                    <td className="px-4 py-3">
                      <SignalChips signals={lead.signals ?? {}} />
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-stone-600)]">
                      {timeAgo(new Date(lead.last_computed_at))}
                    </td>
                    <td className="px-4 py-3">
                      <RecomputeButton userId={lead.user_id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
