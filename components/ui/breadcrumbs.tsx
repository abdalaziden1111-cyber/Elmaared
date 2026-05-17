import { ChevronLeft } from 'lucide-react';
import { Link } from '@/lib/i18n/routing';

export interface BreadcrumbItem {
  href?: string;
  label: string;
}

// Minimalist breadcrumb trail. RTL-aware: the chevron points away from the
// reader (left in Arabic, since text flow is right-to-left). Use on deep
// pages (RFQ → compare, escrow, agreement, proposal detail) so the user
// always has a clear way back to the parent context.
//
// Items pass `href` on every node except the current page, which renders
// as plain text and gets `aria-current="page"`.
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="مسار التنقل" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-stone-600)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 ? (
                <ChevronLeft
                  className="size-3 text-[var(--color-stone-300)]"
                  aria-hidden
                />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded px-1 hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'font-medium text-[var(--color-midnight-green)]' : ''}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
