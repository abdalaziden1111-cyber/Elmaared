import {
  AlertCircle,
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCcw,
  type LucideIcon,
} from 'lucide-react';

/**
 * Failure Modes & Recovery layout (UX Plan v2 §7, Sprint 5 S5.1).
 *
 * Shared chrome for every error-state page under `/error-states/*`.
 * Each scenario gets:
 *   - A severity-toned hero (critical / high / medium / low → red / amber /
 *     blue / stone).
 *   - A single primary message: WHAT happened, in plain language.
 *   - A reassurance line so the user knows what's safe.
 *   - 1-3 recovery actions (retry / contact / wait / explain).
 *   - Optional reference code so support can lookup the incident.
 *
 * Server-component-friendly (no client hooks). Pages can compose this
 * once with their specific copy and never re-render.
 */

export type RecoverySeverity = 'critical' | 'high' | 'medium' | 'low';

export interface RecoveryAction {
  label: string;
  /** External URLs (WhatsApp, mailto, support portal). Use href OR onClick. */
  href?: string;
  /** Internal next-step path — wraps in a regular <a> since the layout is RSC. */
  internalHref?: string;
  /** Optional: ID / class for downstream tests. */
  testId?: string;
  /** Visual emphasis: primary fills the action color; secondary is muted. */
  emphasis?: 'primary' | 'secondary';
}

export interface ErrorRecoveryProps {
  severity: RecoverySeverity;
  /** Short Arabic title — what happened, no jargon. */
  title: string;
  /** One paragraph — the reassuring middle. */
  reassurance: string;
  /** Optional reference / case code for support follow-up. */
  reference?: string | null;
  /** 1-3 actions. Order matters: primary first. */
  actions: RecoveryAction[];
  /** Plan v2 §7 tag for analytics + admin triage. */
  scenarioId: string;
  /** Optional extra block — file upload, retry counter, etc. */
  extra?: React.ReactNode;
}

const SEVERITY_META: Record<
  RecoverySeverity,
  {
    icon: LucideIcon;
    badgeAr: string;
    bg: string;
    border: string;
    iconBg: string;
    iconFg: string;
  }
> = {
  critical: {
    icon: AlertCircle,
    badgeAr: 'حرج',
    bg: 'bg-[var(--color-danger-100)]',
    border: 'border-[var(--color-danger)]/40',
    iconBg: 'bg-[var(--color-danger)]/10',
    iconFg: 'text-[var(--color-danger)]',
  },
  high: {
    icon: AlertTriangle,
    badgeAr: 'مهم',
    bg: 'bg-[var(--color-warning-100)]',
    border: 'border-[var(--color-warning)]/40',
    iconBg: 'bg-[var(--color-warning)]/10',
    iconFg: 'text-[var(--color-warning)]',
  },
  medium: {
    icon: Info,
    badgeAr: 'تنبيه',
    bg: 'bg-[var(--color-info-100)]',
    border: 'border-[var(--color-info)]/40',
    iconBg: 'bg-[var(--color-info)]/10',
    iconFg: 'text-[var(--color-info)]',
  },
  low: {
    icon: ShieldCheck,
    badgeAr: 'إجراء',
    bg: 'bg-[var(--color-stone-100)]',
    border: 'border-[var(--color-stone-300)]',
    iconBg: 'bg-white',
    iconFg: 'text-[var(--color-stone-600)]',
  },
};

export function ErrorRecoveryLayout({
  severity,
  title,
  reassurance,
  reference,
  actions,
  scenarioId,
  extra,
}: ErrorRecoveryProps) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;

  return (
    <main
      className="mx-auto max-w-2xl px-6 py-16"
      data-component="error-recovery-layout"
      data-scenario={scenarioId}
      data-severity={severity}
    >
      <section className={`rounded-2xl border ${meta.border} ${meta.bg} p-6`}>
        <header className="flex items-start gap-4">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-full ${meta.iconBg} ${meta.iconFg}`}
            aria-hidden
          >
            <Icon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex rounded-full bg-white/70 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${meta.iconFg}`}
            >
              {meta.badgeAr}
            </span>
            <h1 className="mt-2 text-xl font-semibold text-[var(--color-midnight-green)] sm:text-2xl">
              {title}
            </h1>
          </div>
        </header>

        <p className="mt-4 text-sm leading-relaxed text-[var(--color-charcoal)]">
          {reassurance}
        </p>

        {reference ? (
          <p
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1 font-mono text-xs text-[var(--color-stone-600)]"
            data-component="recovery-reference"
            dir="ltr"
          >
            <RefreshCcw className="size-3.5" aria-hidden />
            {reference}
          </p>
        ) : null}

        {extra ? <div className="mt-4">{extra}</div> : null}

        {actions.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {actions.map((a, i) => {
              const emphasis = a.emphasis ?? (i === 0 ? 'primary' : 'secondary');
              const url = a.href ?? a.internalHref ?? '#';
              const external = Boolean(a.href);
              return (
                <a
                  key={a.label}
                  href={url}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  data-testid={a.testId}
                  className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
                    emphasis === 'primary'
                      ? 'bg-[var(--color-action-blue)] text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]'
                      : 'bg-white text-[var(--color-charcoal)] hover:bg-[var(--color-stone-100)]'
                  }`}
                >
                  {a.label}
                </a>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
