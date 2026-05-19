import { Shield, AlertOctagon, Scale } from 'lucide-react';
import { trustName } from '@/lib/i18n/trust-name';

/**
 * Outcome Trust Layer (UX Plan v2 §4 + Decision #07, Sprint 3 S3.3).
 *
 * Renders on every payment / escrow surface to answer the buyer's third
 * question: "ماذا لو فشل؟". Three reassurance pillars — the trust name
 * (أمانة Elmaared™ from S0.2/S1.0), the three-level dispute ladder, and
 * the "زر الفزعة" emergency-escalation channel that's already wired into
 * the chat panic flow (components/chat/panic-button.tsx).
 *
 * Stateless, server-component-friendly. The bar is small enough to live
 * inline above payment forms without dominating the layout.
 */

interface Props {
  /** Compact layout (icons only, sr-only labels) for tight surfaces. */
  compact?: boolean;
  className?: string;
}

const PILLARS = [
  {
    key: 'amanah',
    icon: Shield,
    title: () => trustName('ar'),
    body: 'أموالك في حساب أمانة محايد حتى تعتمد التسليم.',
  },
  {
    key: 'disputes',
    icon: Scale,
    title: () => '٣ مستويات نزاع',
    body: 'حلّ ودي → وساطة Elmaared → تحكيم ملزِم.',
  },
  {
    key: 'panic',
    icon: AlertOctagon,
    title: () => 'زر الفزعة',
    body: 'تصعيد فوري لفريق Elmaared في أي لحظة من المحادثة.',
  },
] as const;

export function TrustBar({ compact = false, className = '' }: Props) {
  if (compact) {
    return (
      <ul
        data-component="trust-bar"
        data-variant="compact"
        className={`flex items-center gap-3 rounded-full bg-[var(--color-action-blue)]/10 px-4 py-2 text-xs font-semibold text-[var(--color-action-blue)] ${className}`}
        aria-label="آليات حماية المنصة"
      >
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <li key={p.key} className="inline-flex items-center gap-1.5" title={p.title()}>
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">{p.title()}</span>
            </li>
          );
        })}
        <li className="text-xs font-medium" aria-hidden>
          محميون بـ ٣ آليات
        </li>
      </ul>
    );
  }

  return (
    <section
      data-component="trust-bar"
      data-variant="full"
      className={`rounded-2xl border border-[var(--color-action-blue)]/30 bg-[var(--color-action-blue)]/5 p-5 ${className}`}
      aria-label="آليات حماية المنصة"
    >
      <header className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--color-midnight-green)]">
        <Shield className="size-4 text-[var(--color-action-blue)]" aria-hidden />
        أنت محمي بـ ٣ آليات
      </header>
      <ul className="grid gap-3 sm:grid-cols-3">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <li
              key={p.key}
              data-pillar={p.key}
              className="rounded-xl bg-white p-3"
            >
              <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--color-action-blue)]">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span>{p.title()}</span>
              </div>
              <p className="text-xs leading-relaxed text-[var(--color-stone-600)]">
                {p.body}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
