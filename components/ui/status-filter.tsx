'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { ChangeEvent } from 'react';

export function StatusFilter({
  options,
  paramName = 'status',
  label = 'الحالة',
  allLabel = 'الكل',
}: {
  options: { value: string; label: string }[];
  paramName?: string;
  label?: string;
  allLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(paramName) ?? '';

  function onChange(e: ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(sp.toString());
    const v = e.target.value;
    if (v) params.set(paramName, v);
    else params.delete(paramName);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-[var(--color-stone-600)]">{label}:</span>
      <select
        value={current}
        onChange={onChange}
        aria-label={label}
        className="h-10 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
