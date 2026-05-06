// Pagination math helpers. Listings (RFQs, proposals, suppliers,
// notifications, audit logs) need consistent paging; centralizing the
// math means one place to fix off-by-one bugs.

export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

export interface PageInput {
  page?: number | string | null;
  perPage?: number | string | null;
}

export interface PageWindow {
  page: number;
  perPage: number;
  offset: number;
  /** Inclusive upper bound for Supabase .range(from, to). */
  rangeFrom: number;
  rangeTo: number;
}

function parseIntSafe(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const trimmed = value.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Normalizes user-supplied `page` and `perPage` into a safe window.
 * - `page` defaults to 1, clamps to ≥1, NaN/string-junk → 1
 * - `perPage` defaults to DEFAULT_PER_PAGE, clamps to [1, MAX_PER_PAGE]
 * - Returns offset and Supabase-compatible range bounds
 */
export function buildPageWindow(input: PageInput = {}): PageWindow {
  const pageRaw = parseIntSafe(input.page);
  const perPageRaw = parseIntSafe(input.perPage);

  const page = Math.max(1, pageRaw ?? 1);
  const perPage = Math.min(
    MAX_PER_PAGE,
    Math.max(1, perPageRaw ?? DEFAULT_PER_PAGE)
  );

  const offset = (page - 1) * perPage;
  return {
    page,
    perPage,
    offset,
    rangeFrom: offset,
    rangeTo: offset + perPage - 1,
  };
}

/** Total number of pages for `total` items at `perPage`. Returns 0 when total is 0. */
export function totalPages(total: number, perPage: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  if (!Number.isFinite(perPage) || perPage <= 0) return 0;
  return Math.ceil(total / perPage);
}

export function hasNextPage(page: number, perPage: number, total: number): boolean {
  return page * perPage < total;
}

export function hasPrevPage(page: number): boolean {
  return page > 1;
}
