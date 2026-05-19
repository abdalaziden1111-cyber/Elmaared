import { Clock, CheckCircle2, Camera, AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils/format';

/**
 * Process Trust Layer (UX Plan v2 §4 + Decision #07, Sprint 3 S3.2).
 *
 * Answers the buyer's second question: "ماذا سيحدث في الرحلة؟". A vertical
 * event log with timestamps, photo check-ins, and a SLA indicator at the
 * top that flips amber → red as the project drifts past its committed
 * delivery window. Plan v2 §4 calls this the "Live Timeline Widget" — the
 * real-time part (Supabase Realtime subscription) is opt-in; we hand back
 * a thin presentational shell so a parent page can wire its own subscription
 * later without breaking this component's contract.
 *
 * Render-only: parent passes the events + the SLA window. No data fetch
 * here — the contract is intentionally simple so the timeline can be reused
 * by the Project Execution page, the dispute console, or any "what's
 * happened so far" surface.
 */

export type TimelineEventKind =
  | 'kickoff'
  | 'check_in'
  | 'milestone'
  | 'delivery'
  | 'review'
  | 'issue';

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  title: string;
  timestamp: string | Date;
  description?: string;
  photoUrl?: string;
}

export type SlaStatus = 'on_track' | 'at_risk' | 'overdue' | 'completed';

interface Props {
  events: readonly TimelineEvent[];
  /** Optional SLA banner — driven by the parent (it knows the deadline). */
  sla?: {
    status: SlaStatus;
    daysRemaining?: number;
    deadline?: string | Date;
  };
  /** Hide the SLA banner even if `sla` is provided — useful in compact lists. */
  hideSla?: boolean;
  className?: string;
}

const KIND_META: Record<
  TimelineEventKind,
  { icon: typeof Clock; tone: string }
> = {
  kickoff: {
    icon: Clock,
    tone: 'bg-[var(--color-info-100)] text-[var(--color-info)]',
  },
  check_in: {
    icon: Camera,
    tone: 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]',
  },
  milestone: {
    icon: CheckCircle2,
    tone: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  },
  delivery: {
    icon: CheckCircle2,
    tone: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  },
  review: {
    icon: CheckCircle2,
    tone: 'bg-[var(--color-dune-gold-100)] text-[var(--color-dune-gold)]',
  },
  issue: {
    icon: AlertCircle,
    tone: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  },
};

const SLA_BANNER: Record<
  SlaStatus,
  { label: string; tone: string }
> = {
  on_track: {
    label: '✓ المشروع في موعده',
    tone: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  },
  at_risk: {
    label: '⚠ موعد التسليم اقترب',
    tone: 'bg-[var(--color-warning-100)] text-[var(--color-warning)]',
  },
  overdue: {
    label: '⚠ موعد التسليم تجاوزه',
    tone: 'bg-[var(--color-danger-100)] text-[var(--color-danger)]',
  },
  completed: {
    label: '✓ المشروع مكتمل',
    tone: 'bg-[var(--color-success-100)] text-[var(--color-success)]',
  },
};

export function LiveTimeline({
  events,
  sla,
  hideSla = false,
  className = '',
}: Props) {
  // Sort newest-first so the most recent activity is at the top — matches
  // the "what's the project doing right now?" framing buyers want.
  const sorted = [...events].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <div
      data-component="live-timeline"
      className={`rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 ${className}`}
    >
      <header className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          مسار التنفيذ
        </h3>
        {!hideSla && sla ? (
          <span
            data-sla={sla.status}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${SLA_BANNER[sla.status].tone}`}
          >
            {SLA_BANNER[sla.status].label}
            {sla.daysRemaining != null && sla.status !== 'completed' ? (
              <span className="num">
                {' '}
                · {Math.abs(sla.daysRemaining)} يوم
                {sla.daysRemaining < 0 ? ' متأخر' : ''}
              </span>
            ) : null}
          </span>
        ) : null}
      </header>

      {sorted.length === 0 ? (
        <p
          className="mt-4 rounded-xl border border-dashed border-[var(--color-stone-300)] p-4 text-center text-xs text-[var(--color-stone-600)]"
          data-state="empty"
        >
          لا توجد أحداث بعد. سترى هنا كل تحديث من المورد فور حدوثه.
        </p>
      ) : (
        <ol className="mt-4 space-y-4 border-r border-dashed border-[var(--color-stone-300)] pe-0 ps-5">
          {sorted.map((ev) => {
            const meta = KIND_META[ev.kind];
            const Icon = meta.icon;
            return (
              <li
                key={ev.id}
                data-kind={ev.kind}
                className="relative"
              >
                {/* Bullet anchored to the inline-end dashed rail */}
                <span
                  className={`absolute -end-[1.4rem] top-0.5 inline-flex size-7 items-center justify-center rounded-full ring-4 ring-white ${meta.tone}`}
                  aria-hidden
                >
                  <Icon className="size-3.5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-midnight-green)]">
                      {ev.title}
                    </p>
                    <time className="text-xs text-[var(--color-stone-600)] num">
                      {formatDate(ev.timestamp)}
                    </time>
                  </div>
                  {ev.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--color-stone-600)]">
                      {ev.description}
                    </p>
                  ) : null}
                  {ev.photoUrl ? (
                    <a
                      href={ev.photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-action-blue)] hover:underline"
                    >
                      <Camera className="size-3.5" aria-hidden />
                      عرض صورة التحديث
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
