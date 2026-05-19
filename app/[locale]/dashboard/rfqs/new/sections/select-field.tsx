'use client';

/**
 * Small shared select-field helper used inside the RFQ section components.
 * Kept co-located with the sections (not in `components/ui/`) because it
 * doesn't carry the polish of a shadcn primitive — it's the legacy `<select>`
 * styled to match `FormField`. If the form picks up shadcn `<Select>` later,
 * delete this file and switch each callsite over.
 */

interface Option {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  name,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  name?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        <option value="">اختر…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
