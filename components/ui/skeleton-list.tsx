// Generic loading placeholder for list pages. Mirrors the standard
// page shape (h1 + subtitle + N card rows) so the layout doesn't shift
// when real content arrives. Used by `loading.tsx` at route segments.

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-48 rounded bg-[var(--color-stone-100)]" />
      <div className="mt-2 h-4 w-72 rounded bg-[var(--color-stone-100)]" />
      <ul className="mt-6 grid gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <li
            key={i}
            className="h-24 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5"
          >
            <div className="h-3 w-24 rounded bg-[var(--color-stone-100)]" />
            <div className="mt-2 h-4 w-3/4 rounded bg-[var(--color-stone-100)]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-stone-100)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
