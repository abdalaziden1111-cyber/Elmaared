'use client';

import { Wand2, RotateCcw } from 'lucide-react';

/**
 * Wrap any user-controlled input that was prefilled by an AI suggestion.
 *
 * UX Plan v2 Decision #01, S1.6 — Josh Clark's rule from Debate 01: "the
 * AI input is set aside, not erased, when the user overrides". This
 * component keeps the AI's suggestion visible as a chip above the input,
 * shows a clear "تجاوزت اقتراح AI" indicator when the user has changed it,
 * and offers a one-click "استعد اقتراح AI" reset.
 *
 * The component is presentational — state lives in the parent. Pass:
 *   - `aiSuggestion`     — human-readable label for the AI's value
 *   - `userValueDiffers` — boolean, whether the user is currently overriding
 *   - `onResetToAi`      — callback that restores the AI suggestion
 *   - children           — the input element the user types into
 */

interface Props {
  aiSuggestion: string;
  userValueDiffers: boolean;
  onResetToAi: () => void;
  /** The input element. */
  children: React.ReactNode;
  /** Optional label for the input — rendered above the AI chip. */
  label?: string;
  /** Optional one-line explainer shown next to the AI chip. */
  hint?: string;
  className?: string;
}

export function AIOverride({
  aiSuggestion,
  userValueDiffers,
  onResetToAi,
  children,
  label,
  hint,
  className = '',
}: Props) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label ? (
        <label className="text-xs font-medium text-[var(--color-stone-600)]">
          {label}
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-info-100)] px-2.5 py-1 font-semibold text-[var(--color-info)]"
          data-component="ai-override-chip"
        >
          <Wand2 className="size-3.5" aria-hidden />
          <span aria-hidden>اقتراح AI:</span>
          <span className="num">{aiSuggestion}</span>
        </span>
        {hint ? <span className="text-[var(--color-stone-600)]">{hint}</span> : null}
      </div>

      {children}

      {userValueDiffers ? (
        <div
          role="status"
          data-component="ai-override-active"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-warning-100)] px-3 py-2 text-xs text-[var(--color-warning)]"
        >
          <span>
            ✎ تجاوزت اقتراح AI. اقتراحه محفوظ — تستطيع استرداده في أي وقت.
          </span>
          <button
            type="button"
            onClick={onResetToAi}
            className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-[var(--color-warning)] hover:bg-[var(--color-warning-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-warning)]"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            استعد اقتراح AI
          </button>
        </div>
      ) : null}
    </div>
  );
}
