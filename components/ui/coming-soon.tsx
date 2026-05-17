// Lightweight placeholder used by sidebar-linked pages that aren't built yet.
// Renders consistently across client/supplier/admin sections so users get
// orientation instead of a hard 404.
export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl py-12">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        {title}
      </h1>
      <div className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-warning-100)] px-3 py-1 text-xs text-[var(--color-warning)]">
          قريباً
        </div>
        <p className="mt-3 text-sm text-[var(--color-stone-600)]">
          {description ?? 'هذه الميزة قيد التطوير وستكون متاحة في إصدار قادم.'}
        </p>
      </div>
    </div>
  );
}
