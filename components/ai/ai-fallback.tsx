import { Info } from 'lucide-react';

/**
 * "AI couldn't help here" card (UX Plan v2 Decision #01, S1.5).
 *
 * Josh Clark + Don Norman in Debate 01: when AI doesn't know, it must say
 * so plainly instead of returning a confident wrong answer or a generic
 * "حدث خطأ" message. This component is the user-facing voice of that
 * principle — it explains *why* the AI is silent and (optionally) what
 * the user can do about it.
 *
 * Usage examples:
 *   - Confidence is "unknown" → "أمامي N صفقة فقط — لا أعرف بعد"
 *   - AI gateway is down → "تقييم AI غير متاح مؤقتاً"
 *   - Feature unsupported for this category → "هذه الفئة لم تُدرَّب بعد"
 */

export type AiFallbackReason =
  | 'insufficient_data'
  | 'service_error'
  | 'unsupported'
  | 'pending'
  | 'rate_limited';

interface Props {
  reason: AiFallbackReason;
  /** Number of available samples — when the reason is data scarcity. */
  sampleSize?: number | null;
  /** Optional override for the headline message. */
  headline?: string;
  /** Optional follow-up text — e.g. "هل تريد طلب تقدير مخصص؟". */
  whatNext?: string;
  /** Optional CTA button: when provided, rendered next to whatNext. */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const HEADLINES: Record<AiFallbackReason, string> = {
  insufficient_data: 'لا توجد بيانات كافية بعد — لا أعرف بعد',
  service_error: 'تقييم AI غير متاح مؤقتاً — حاول لاحقاً',
  unsupported: 'هذه الفئة لم نُدرّب AI عليها بعد',
  pending: 'يجري الآن تحليل AI لهذا العرض…',
  rate_limited: 'تجاوزت حد الاستخدام اليومي للذكاء الاصطناعي',
};

const DEFAULT_WHAT_NEXT: Partial<Record<AiFallbackReason, string>> = {
  insufficient_data:
    'يمكنك المقارنة يدوياً من خلال السعر ومدة التسليم وسجل المورد — ستتحسّن دقة AI كلما زادت العروض في السوق.',
  service_error: 'النتائج ستظهر تلقائياً فور عودة الخدمة. لا حاجة لإعادة التحميل.',
  unsupported: 'تواصل معنا لطلب تقدير مخصص خلال 24 ساعة.',
  pending: 'هذا قد يستغرق دقيقة. سنحدّث الصفحة تلقائياً عند الانتهاء.',
  rate_limited:
    'حد الاستخدام يُعاد ضبطه يومياً عند منتصف الليل (UTC). يمكنك المقارنة يدوياً من خلال السعر ومدة التسليم.',
};

export function AIFallback({
  reason,
  sampleSize,
  headline,
  whatNext,
  action,
  className = '',
}: Props) {
  // Inject the sample size into the default headline when it's known and we
  // were given the data-scarcity reason. Allows the canonical Plan v2 copy
  // ("أمامي 2 صفقة فقط — لا أعرف بعد") to render automatically.
  const computedHeadline =
    headline ??
    (reason === 'insufficient_data' && typeof sampleSize === 'number'
      ? `أمامي ${sampleSize} ${
          sampleSize === 1 ? 'صفقة' : sampleSize === 2 ? 'صفقتين' : 'صفقة'
        } فقط — لا أعرف بعد`
      : HEADLINES[reason]);

  const computedWhatNext = whatNext ?? DEFAULT_WHAT_NEXT[reason] ?? null;

  return (
    <div
      role="status"
      data-component="ai-fallback"
      data-reason={reason}
      className={`flex items-start gap-3 rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] p-4 ${className}`}
    >
      <span
        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-[var(--color-action-blue)]"
        aria-hidden
      >
        <Info className="size-4" />
      </span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--color-midnight-green)]">
          {computedHeadline}
        </p>
        {computedWhatNext ? (
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-stone-600)]">
            {computedWhatNext}
          </p>
        ) : null}
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-3 inline-flex h-9 items-center rounded-lg bg-[var(--color-action-blue)] px-3 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
