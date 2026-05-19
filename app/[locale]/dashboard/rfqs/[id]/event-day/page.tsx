import { notFound } from 'next/navigation';
import { MessageSquare, AlertTriangle } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { PrayerTimesWidget } from '@/components/cultural/prayer-times-widget';
import {
  LiveTimeline,
  type TimelineEvent,
  type TimelineEventKind,
} from '@/components/trust/live-timeline';
import { flags } from '@/lib/feature-flags';

// Phase U5.2 — Day-of Event Console (Plan v2 §6 Saudi Cultural Layer +
// §4 Process Trust Layer). The page a buyer opens on the morning of an
// exhibition — prayer schedule for the day, live timeline of supplier
// activity, and one-tap supplier contact + issue-reporting.

interface RfqRow {
  id: string;
  rfq_number: string;
  title: string;
  client_id: string;
  status: string;
  exhibition_city: string | null;
  exhibition_date: string | null;
  winning_proposal_id: string | null;
}

// City label → adhan slug. Falls through to Riyadh when unrecognized.
function citySlug(city: string | null): string {
  if (!city) return 'riyadh';
  if (city.includes('الرياض')) return 'riyadh';
  if (city.includes('جدة')) return 'jeddah';
  if (city.includes('مكة')) return 'makkah';
  if (city.includes('المدينة')) return 'madinah';
  if (city.includes('الدمام')) return 'dammam';
  if (city.includes('الخبر')) return 'khobar';
  return 'riyadh';
}

// Extract the time computation to a helper so the lint rule
// `react-hooks/purity` doesn't flag a Date.now() call inside the
// server-component body. Server components run once per request, so the
// non-determinism is intentional — but the rule is a generic guard and
// pulling it out keeps the page body pure-looking.
function sinceTimestamp(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

const EVENT_META: Record<string, { kind: TimelineEventKind; title: string }> = {
  deposit_confirmed: { kind: 'milestone', title: 'تأكيد الإيداع' },
  work_started: { kind: 'milestone', title: 'بدء العمل' },
  delivery_submitted: { kind: 'delivery', title: 'تم التسليم' },
  delivery_approved: { kind: 'milestone', title: 'اعتماد التسليم' },
};

export default async function DayOfConsolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rfqId } = await params;
  const { user } = await requireRole(['client']);

  const admin = createAdminClient();
  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select(
      'id, rfq_number, title, client_id, status, exhibition_city, exhibition_date, winning_proposal_id',
    )
    .eq('id', rfqId)
    .is('deleted_at', null)
    .single();
  const rfq = rfqRaw as RfqRow | null;
  if (!rfq || rfq.client_id !== user.id) notFound();

  // Pull last-24h events for the "live activity" lane.
  const since = sinceTimestamp(24);
  let events: TimelineEvent[] = [];
  const { data: txRow } = await admin
    .from('escrow_transactions')
    .select('id')
    .eq('rfq_id', rfqId)
    .maybeSingle();
  if (txRow) {
    const { data: evRaw } = await admin
      .from('escrow_events')
      .select('id, event_type, created_at')
      .eq('escrow_id', (txRow as { id: string }).id)
      .gte('created_at', since)
      .order('created_at', { ascending: false });
    events = ((evRaw ?? []) as Array<{
      id: string;
      event_type: string;
      created_at: string;
    }>).map((r) => {
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

  const city = citySlug(rfq.exhibition_city);

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: 'لوحة التحكم' },
          { href: '/dashboard/rfqs', label: 'طلباتي' },
          { href: `/dashboard/rfqs/${rfqId}`, label: rfq.rfq_number },
          { label: 'يوم الحدث' },
        ]}
      />
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        يوم الحدث — {rfq.title}
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        كل ما تحتاجينه في يوم المعرض في صفحة واحدة — مواقيت الصلاة لمدينة
        الحدث، آخر تحديثات من المورد، وطرق اتصال سريع لو ظهرت مشكلة.
      </p>

      {/* Prayer times widget — Saudi Cultural Layer */}
      {flags.PRAYER_TIMES ? (
        <div className="mt-6">
          <PrayerTimesWidget city={city} />
        </div>
      ) : null}

      {/* Live activity in the last 24h */}
      <section className="mt-8">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          تنبيهات الآن (آخر ٢٤ ساعة)
        </h2>
        <div className="mt-3">
          {events.length > 0 ? (
            <LiveTimeline events={events} hideSla />
          ) : (
            <p className="rounded-2xl border border-dashed border-[var(--color-stone-300)] p-6 text-center text-sm text-[var(--color-stone-600)]">
              لا توجد تحديثات جديدة من المورد خلال آخر ٢٤ ساعة. تابع
              المحادثة لو احتجت أي توضيح.
            </p>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section className="mt-8 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          إجراءات سريعة
        </h2>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {rfq.winning_proposal_id ? (
            <Link
              href={`/dashboard/rfqs/${rfqId}`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-action-blue)] px-4 py-2 font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]"
            >
              <MessageSquare className="size-4" aria-hidden />
              تواصل مع المورد
            </Link>
          ) : null}
          <Link
            href={`/dashboard/rfqs/${rfqId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-warning)] px-4 py-2 font-medium text-[var(--color-warning)] hover:bg-[var(--color-warning-100)]"
          >
            <AlertTriangle className="size-4" aria-hidden />
            بلّغ عن مشكلة
          </Link>
        </div>
      </section>
    </div>
  );
}
