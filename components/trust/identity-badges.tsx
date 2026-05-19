import {
  CheckCircle2,
  Receipt,
  IdCard,
  Users,
  ShieldCheck,
} from 'lucide-react';

/**
 * Identity Trust Layer (UX Plan v2 §4 + Decision #07, Sprint 3 S3.1).
 *
 * The committee — Walter + Norman + Nielsen, with Atrissi pushing for the
 * Saudi-specific signals (ZATCA, Nafath) — settled on five visible proofs
 * that answer the buyer's first question: "من المزوّد؟". Each badge is
 * either "verified" (action-blue chip) or "not verified" (muted) — never
 * "in progress" or "pending", because a half-trust badge is worse than
 * none (Plan v2 §4, Debate 07).
 *
 * Render-only: state is passed in as props. Sourced from the
 * `supplier_trust_signals` table (S3.0 migration #3).
 */

export interface IdentityBadgeSignals {
  identityVerified: boolean;
  zatcaVerified: boolean;
  govIdVerified: boolean;
  photoIdUploaded: boolean;
  referencesCount: number;
}

interface Props {
  signals: IdentityBadgeSignals | null;
  /** Compact variant for the compare-table columns (smaller, no labels). */
  compact?: boolean;
  className?: string;
}

interface BadgeDef {
  key: string;
  label: string;
  icon: typeof CheckCircle2;
  earned: (s: IdentityBadgeSignals) => boolean;
  /** Optional descriptor — shown in non-compact mode under the label. */
  descriptor?: (s: IdentityBadgeSignals) => string | null;
}

const BADGES: BadgeDef[] = [
  {
    key: 'identity',
    label: 'سجل تجاري مُتحقَّق',
    icon: CheckCircle2,
    earned: (s) => s.identityVerified,
  },
  {
    key: 'zatca',
    label: 'ZATCA Verified',
    icon: Receipt,
    earned: (s) => s.zatcaVerified,
  },
  {
    key: 'gov_id',
    label: 'الهوية الوطنية موثّقة',
    icon: ShieldCheck,
    earned: (s) => s.govIdVerified,
  },
  {
    key: 'photo_id',
    label: 'صور الهوية مرفوعة',
    icon: IdCard,
    earned: (s) => s.photoIdUploaded,
  },
  {
    key: 'references',
    label: 'مراجع موثّقة',
    icon: Users,
    earned: (s) => s.referencesCount >= 3,
    descriptor: (s) =>
      s.referencesCount > 0 ? `${s.referencesCount} مرجع` : null,
  },
];

export function IdentityBadges({ signals, compact = false, className = '' }: Props) {
  // No row yet → render an empty placeholder so the section's height stays
  // stable across renders. Buyers will see this only briefly during the
  // pre-launch onboarding window.
  if (!signals) {
    return (
      <div
        data-component="identity-badges"
        data-state="loading"
        className={`rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] p-4 text-xs text-[var(--color-stone-600)] ${className}`}
      >
        التحقق من هوية المورد قيد المراجعة.
      </div>
    );
  }

  const earnedCount = BADGES.filter((b) => b.earned(signals)).length;

  if (compact) {
    // Compact variant for the compare-table column: a row of small icons,
    // no labels. Each icon is colored when earned and muted when not.
    return (
      <ul
        data-component="identity-badges"
        data-variant="compact"
        className={`flex flex-wrap gap-1.5 ${className}`}
        aria-label={`توثيقات المورد: ${earnedCount} من ${BADGES.length}`}
      >
        {BADGES.map((b) => {
          const Icon = b.icon;
          const earned = b.earned(signals);
          return (
            <li
              key={b.key}
              title={b.label}
              data-earned={earned}
              className={`inline-flex size-6 items-center justify-center rounded-full ${
                earned
                  ? 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-300)]'
              }`}
            >
              <Icon className="size-3.5" aria-hidden />
              <span className="sr-only">
                {b.label}
                {earned ? ' (موثّق)' : ' (غير موثّق)'}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div
      data-component="identity-badges"
      data-variant="full"
      className={`rounded-2xl border border-[var(--color-stone-300)] bg-white p-4 ${className}`}
    >
      <header className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          توثيق هوية المورد
        </h3>
        <span className="num text-xs font-medium text-[var(--color-stone-600)]">
          {earnedCount} / {BADGES.length}
        </span>
      </header>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3" role="list">
        {BADGES.map((b) => {
          const Icon = b.icon;
          const earned = b.earned(signals);
          const descriptor = b.descriptor?.(signals);
          return (
            <li
              key={b.key}
              data-earned={earned}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
                earned
                  ? 'bg-[var(--color-action-blue)]/10 text-[var(--color-action-blue)]'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]'
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="truncate font-semibold">{b.label}</p>
                {descriptor ? (
                  <p className="text-[0.65rem] opacity-80 num">{descriptor}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
