// Per-page loading skeletons. Each one mirrors the structural shape of its
// real page (title height + subtitle + appropriate body grid) so that swap-in
// of real content does not shift the page. Reach for `SkeletonList` only when
// none of these match — generic fallback.

function Bar({ className }: { className: string }) {
  return <div className={`rounded bg-[var(--color-stone-100)] ${className}`} />;
}

function Card({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 ${className ?? ''}`}
    />
  );
}

// Dashboard root: greeting + 4 KPI cards + quick-actions + list + exhibitions + suppliers.
export function DashboardHomeSkeleton() {
  return (
    <div className="animate-pulse space-y-10">
      <header>
        <Bar className="h-8 w-40" />
        <Bar className="mt-2 h-4 w-80" />
      </header>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24" />
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="h-28" />
        <Card className="h-28" />
      </section>
      <section>
        <Bar className="h-5 w-32" />
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-20" />
          ))}
        </div>
      </section>
    </div>
  );
}

// RFQ list (client or supplier): heading + search bar + N card rows + pagination.
export function RfqListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <Bar className="h-8 w-40" />
      <Bar className="mt-3 h-10 w-full sm:w-96" />
      <ul className="mt-6 grid gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i}>
            <Card className="h-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// RFQ detail: number + title + status pill, info grid, description, details list.
export function RfqDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Bar className="h-3 w-24" />
          <Bar className="mt-2 h-8 w-72" />
        </div>
        <Bar className="h-7 w-20 rounded-full" />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-16" />
        ))}
      </div>
      <section className="mt-8">
        <Bar className="h-5 w-24" />
        <div className="mt-3 space-y-2">
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-11/12" />
          <Bar className="h-3 w-8/12" />
        </div>
      </section>
      <section className="mt-8">
        <Bar className="h-5 w-32" />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-12" />
          ))}
        </div>
      </section>
    </div>
  );
}

// Compare page: heading + N tall proposal cards.
export function CompareSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      <Bar className="h-3 w-24" />
      <Bar className="mt-2 h-8 w-56" />
      <Bar className="mt-2 h-4 w-72" />
      <ul className="mt-6 grid gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i}>
            <Card className="h-48" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// Stat-cards page (escrow, earnings): header + 4 stat cards + content panel.
export function StatCardsSkeleton() {
  return (
    <div className="animate-pulse">
      <Bar className="h-8 w-48" />
      <Bar className="mt-2 h-4 w-72" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="h-24" />
        ))}
      </div>
      <Card className="mt-8 h-64" />
    </div>
  );
}

// Form page: title + ~5 input rows + submit button.
export function FormSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-xl animate-pulse px-6 py-12">
      <Bar className="h-8 w-48" />
      <div className="mt-6 grid gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i}>
            <Bar className="h-4 w-32" />
            <Bar className="mt-2 h-11 w-full rounded-xl" />
          </div>
        ))}
        <Bar className="mt-2 h-11 w-32 rounded-xl" />
      </div>
    </div>
  );
}
