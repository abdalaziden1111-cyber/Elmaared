'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';

// Updates ?q= on submit. Resets ?page= so the user always lands on page 1
// of the new search rather than (e.g.) page 5 of stale results.
export function SearchBar({
  paramName = 'q',
  placeholder = 'بحث…',
}: {
  paramName?: string;
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get(paramName) ?? '';

  function submit(formData: FormData) {
    const params = new URLSearchParams(sp.toString());
    const v = (formData.get(paramName) ?? '').toString().trim();
    if (v) params.set(paramName, v);
    else params.delete(paramName);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <form
      action={submit}
      className="flex items-center gap-2"
      role="search"
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-stone-600)]"
          aria-hidden
        />
        <input
          type="search"
          name={paramName}
          defaultValue={current}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white ps-10 pe-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-10 items-center rounded-xl bg-[var(--color-midnight-green)] px-4 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-midnight-green-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        بحث
      </button>
    </form>
  );
}
