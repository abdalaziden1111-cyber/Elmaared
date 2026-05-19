import { ConfidenceBadge } from '@/components/ai/confidence-badge';
import { formatCurrency } from '@/lib/utils/format';
import type { AiConfidenceLevel } from '@/lib/supabase/types';

/**
 * "عين السوق" — visual price-range bar (UX Plan v2 Decision #01, S1.3).
 *
 * The committee — Josh Clark + Don Norman + Steve Krug (Debate 01) — rejected
 * showing a single fair-price number because it implies certainty the model
 * doesn't have. Instead we show a RANGE (min → max from historical comparable
 * proposals) plus the confidence badge, and optionally a marker for the
 * supplier's quoted price within (or outside) the range.
 *
 *   ┌─────────────────────────────────────────────┐
 *   │ ●═════════════════[supplier]═══════════════● │
 *   │ 42,000 ﷼                              58,000 ﷼ │
 *   │ 🟢 دقيق جداً (n=23)                            │
 *   └─────────────────────────────────────────────┘
 *
 * - When confidence is `unknown` (or the range is missing), the bar is
 *   replaced by a fallback message — see `<AIFallback>` for the AI-output
 *   counterpart.
 * - The supplier marker is optional. When provided, we highlight whether
 *   the quote sits inside / below / above the range so the buyer doesn't
 *   have to do the math.
 */

interface Props {
  level: AiConfidenceLevel;
  min: number | null;
  max: number | null;
  sampleSize: number | null;
  variancePct?: number | null;
  /** Optional supplier quote to mark on the bar. */
  supplierPrice?: number | null;
  className?: string;
}

export function MarketRange({
  level,
  min,
  max,
  sampleSize,
  variancePct,
  supplierPrice,
  className = '',
}: Props) {
  // Fallback: no market data at all.
  if (level === 'unknown' || min == null || max == null || min > max) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] p-4 ${className}`}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-[var(--color-stone-600)]">
            لا توجد بيانات سوقية كافية بعد لهذه الفئة — سنعرض النطاق فور تجمّع ٤ عروض أو أكثر.
          </p>
          <ConfidenceBadge
            level={level}
            sampleSize={sampleSize}
            variancePct={variancePct}
          />
        </div>
      </div>
    );
  }

  const span = max - min;
  // Clamp the supplier marker to [0%, 100%] of the bar. Track whether it's
  // outside so we can flag it visually.
  let supplierPct: number | null = null;
  let supplierPosition: 'inside' | 'below' | 'above' | null = null;
  if (supplierPrice != null && Number.isFinite(supplierPrice) && supplierPrice > 0) {
    if (supplierPrice < min) {
      supplierPosition = 'below';
      supplierPct = 0;
    } else if (supplierPrice > max) {
      supplierPosition = 'above';
      supplierPct = 100;
    } else {
      supplierPosition = 'inside';
      supplierPct = span === 0 ? 50 : ((supplierPrice - min) / span) * 100;
    }
  }

  return (
    <div
      className={`rounded-2xl border border-[var(--color-stone-300)] bg-white p-4 ${className}`}
      data-component="market-range"
      aria-label={`نطاق السوق من ${formatCurrency(min)} إلى ${formatCurrency(max)}`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          عين السوق
        </h3>
        <ConfidenceBadge
          level={level}
          sampleSize={sampleSize}
          variancePct={variancePct}
        />
      </div>

      {/* The bar: gradient track with min/max anchors and an optional marker */}
      <div className="relative mt-4 h-2 rounded-full bg-gradient-to-l from-[var(--color-success-100)] via-[var(--color-info-100)] to-[var(--color-warning-100)]">
        {supplierPct != null ? (
          <div
            className="absolute top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--color-midnight-green)] shadow"
            style={{
              insetInlineStart: `${supplierPct}%`,
              transform: 'translate(50%, -50%)',
            }}
            aria-label={`موقع عرض هذا المورد: ${formatCurrency(supplierPrice ?? 0)}`}
          />
        ) : null}
      </div>

      <div className="mt-2 flex items-baseline justify-between text-xs">
        <span className="num font-medium text-[var(--color-stone-600)]">
          {formatCurrency(min)}
        </span>
        <span className="num font-medium text-[var(--color-stone-600)]">
          {formatCurrency(max)}
        </span>
      </div>

      {supplierPosition ? (
        <p
          className={`mt-3 text-xs font-medium ${
            supplierPosition === 'inside'
              ? 'text-[var(--color-success)]'
              : 'text-[var(--color-warning)]'
          }`}
        >
          {supplierPosition === 'inside'
            ? '✓ هذا العرض داخل النطاق السوقي.'
            : supplierPosition === 'below'
              ? '⚠ هذا العرض أقل من حد السوق — قد يكون نطاق العمل غير مكتمل.'
              : '⚠ هذا العرض أعلى من حد السوق — اطلب توضيح القيمة المضافة.'}
        </p>
      ) : null}
    </div>
  );
}
