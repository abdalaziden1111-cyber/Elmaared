import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AiConfidenceLevel } from '@/lib/supabase/types';

/**
 * 4-level visual confidence indicator (UX Plan v2 Decision #01, S1.2).
 *
 * The committee — Josh Clark + Don Norman + Jakob Nielsen, with Susan
 * Weinschenk objecting (Debate 01) — settled on a VISUAL bucket instead of
 * a raw percentage so users don't see "78%" and freeze. The four levels:
 *
 *   🟢 high     — dense market data, low variance (N≥20, CV<25%)
 *   🔵 medium   — enough data to mean something (N≥10), or N≥20 with disagreement
 *   🟡 low      — early signal, treat as directional (4≤N<10)
 *   ⚪ unknown  — not enough data to be useful (N<4)
 *
 * The tooltip carries the numbers for users who want them. Hovering /
 * focusing the badge reveals "بناءً على X عرضاً، تباين Y٪".
 */

interface Props {
  level: AiConfidenceLevel;
  sampleSize: number | null;
  variancePct?: number | null;
  /** Optional override for the trigger element's class (positioning, etc.). */
  className?: string;
}

const PRESETS: Record<
  AiConfidenceLevel,
  { glyph: string; labelAr: string; chipClass: string; iconLabel: string }
> = {
  high: {
    glyph: '🟢',
    labelAr: 'دقيق جداً',
    chipClass:
      'bg-[var(--color-success-100)] text-[var(--color-success)] ring-1 ring-[var(--color-success)]/30',
    iconLabel: 'دائرة خضراء',
  },
  medium: {
    glyph: '🔵',
    labelAr: 'دقيق',
    chipClass:
      'bg-[var(--color-info-100)] text-[var(--color-info)] ring-1 ring-[var(--color-info)]/30',
    iconLabel: 'دائرة زرقاء',
  },
  low: {
    glyph: '🟡',
    labelAr: 'تقريبي',
    chipClass:
      'bg-[var(--color-warning-100)] text-[var(--color-warning)] ring-1 ring-[var(--color-warning)]/30',
    iconLabel: 'دائرة صفراء',
  },
  unknown: {
    glyph: '⚪',
    labelAr: 'تخمين أولي',
    chipClass:
      'bg-[var(--color-stone-100)] text-[var(--color-stone-600)] ring-1 ring-[var(--color-stone-300)]',
    iconLabel: 'دائرة بيضاء',
  },
};

export function ConfidenceBadge({
  level,
  sampleSize,
  variancePct,
  className = '',
}: Props) {
  const preset = PRESETS[level];
  const tooltipText = buildTooltipText(level, sampleSize, variancePct);
  // Screen readers get a descriptive label that includes the bucket
  // semantics; the emoji decoration is hidden from AT to avoid double-read.
  const ariaLabel =
    sampleSize != null && sampleSize > 0
      ? `${preset.labelAr} — ${tooltipText}`
      : preset.labelAr;

  const chip = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${preset.chipClass} ${className}`}
      aria-label={ariaLabel}
      role="status"
      data-confidence={level}
    >
      <span aria-hidden>{preset.glyph}</span>
      <span>{preset.labelAr}</span>
      {sampleSize != null && sampleSize > 0 ? (
        <span className="num text-[0.7rem] opacity-80" aria-hidden>
          (n={sampleSize})
        </span>
      ) : null}
    </span>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{chip}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-end leading-relaxed">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function buildTooltipText(
  level: AiConfidenceLevel,
  sampleSize: number | null,
  variancePct: number | null | undefined
): string {
  if (level === 'unknown' || sampleSize == null || sampleSize === 0) {
    return 'لا توجد بيانات سوقية كافية بعد لهذه الفئة — التقدير أولي.';
  }
  const samples = `بناءً على ${sampleSize} عرضاً مماثلاً خلال آخر 12 شهراً`;
  if (variancePct == null) return `${samples}.`;
  const varianceText = `تباين السوق: ${formatPct(variancePct)}٪`;
  return `${samples}. ${varianceText}.`;
}

function formatPct(n: number): string {
  // Two decimals max; trim trailing zeros for cleaner reads (15.00 → 15, 15.50 → 15.5).
  return n.toFixed(2).replace(/\.?0+$/, '');
}
