// Phase V6.1 — KPI tile used across the supplier dashboard.
//
// Generic enough to render any "label + big number + optional delta" cell.
// Delta arrow uses just text characters (no extra icon dep) and color-codes
// against the brand neutral palette.

import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | ReactNode;
  /** Optional secondary line under the value (e.g. "12 هذا الشهر"). */
  sublabel?: string;
  /** Trend delta in percent — positive = up arrow, negative = down. */
  deltaPct?: number | null;
  /** Override the delta sign-to-color mapping (e.g. high acceptance is good). */
  goodWhen?: 'up' | 'down';
}

export function KpiCard({ label, value, sublabel, deltaPct, goodWhen = 'up' }: Props) {
  const showDelta = typeof deltaPct === 'number' && Number.isFinite(deltaPct);
  const dir = showDelta ? (deltaPct! >= 0 ? 'up' : 'down') : null;
  const tone =
    dir === null
      ? ''
      : dir === goodWhen
      ? 'text-[var(--color-success,#047857)]'
      : 'text-[var(--color-error,#B91C1C)]';
  return (
    <div className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-4">
      <div className="text-xs text-[var(--color-stone-600)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-midnight-green)]">
        {value}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-[var(--color-stone-600)]">{sublabel ?? ''}</span>
        {showDelta ? (
          <span className={`tabular-nums font-medium ${tone}`}>
            {dir === 'up' ? '↑' : '↓'} {Math.abs(deltaPct!).toFixed(1)}٪
          </span>
        ) : null}
      </div>
    </div>
  );
}
