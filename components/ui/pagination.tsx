'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({
  currentPage,
  totalPages,
  totalCount,
}: {
  currentPage: number;
  totalPages: number;
  totalCount: number;
}) {
  const sp = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) {
    return (
      <p className="mt-6 text-center text-xs text-[var(--color-stone-600)]">
        إجمالي: <span className="num">{totalCount}</span>
      </p>
    );
  }

  function hrefFor(page: number): string {
    const params = new URLSearchParams(sp.toString());
    if (page <= 1) params.delete('page');
    else params.set('page', String(page));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav
      className="mt-6 flex items-center justify-between gap-3 text-sm"
      aria-label="ترقيم الصفحات"
    >
      <Link
        href={hrefFor(prev)}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={`inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--color-stone-300)] bg-white px-3 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${currentPage === 1 ? 'pointer-events-none opacity-40' : ''}`}
      >
        <ChevronRight className="size-4" aria-hidden />
        السابق
      </Link>
      <span className="text-xs text-[var(--color-stone-600)]">
        صفحة <span className="num">{currentPage}</span> من{' '}
        <span className="num">{totalPages}</span>
        <span className="mx-2">·</span>
        <span className="num">{totalCount}</span> سطر
      </span>
      <Link
        href={hrefFor(next)}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={`inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--color-stone-300)] bg-white px-3 hover:border-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}`}
      >
        التالي
        <ChevronLeft className="size-4" aria-hidden />
      </Link>
    </nav>
  );
}
