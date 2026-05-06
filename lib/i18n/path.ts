// Pure helpers for parsing pathnames in proxy.ts and link components.
// Extracted so they can be unit-tested without spinning up Next.js or
// constructing fake NextRequest objects.

const LOCALES = ['ar', 'en'] as const;
const DEFAULT_LOCALE = 'ar' as const;

export type Locale = (typeof LOCALES)[number];

const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/how-it-works',
  '/for-clients',
  '/for-suppliers',
  '/pricing',
  '/about',
  '/contact',
  '/legal',
  '/suppliers',
  '/exhibitions',
  '/blog',
  '/discover',
] as const;

/**
 * Returns the locale segment if the pathname starts with one (`/ar/...`,
 * `/en/...`), otherwise null. Returns null for empty/non-string input
 * so callers don't have to pre-check.
 */
export function getLocaleFromPath(pathname: string | null | undefined): Locale | null {
  if (!pathname || typeof pathname !== 'string') return null;
  const segments = pathname.split('/');
  const candidate = segments[1];
  if (candidate && (LOCALES as readonly string[]).includes(candidate)) {
    return candidate as Locale;
  }
  return null;
}

/**
 * Removes the leading locale segment if present, otherwise returns the
 * pathname untouched. Always returns at minimum '/' so downstream code
 * doesn't have to handle an empty string.
 */
export function stripLocale(pathname: string | null | undefined): string {
  if (!pathname) return '/';
  const locale = getLocaleFromPath(pathname);
  if (!locale) return pathname;
  const stripped = pathname.replace(`/${locale}`, '');
  return stripped.length === 0 ? '/' : stripped;
}

/**
 * True if the path (with or without a locale prefix) maps to a public-facing
 * page that doesn't require auth. Matches both exact paths and prefixed
 * children — `/discover` and `/discover/abc` both count as public.
 */
export function isPublicPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = stripLocale(pathname);
  return PUBLIC_PATHS.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

/**
 * True if this path is "internal" and the proxy should pass it through
 * unconditionally — _next bundles, /api routes, static assets with file
 * extensions. Cuts noise out of the locale rewrite branch.
 */
export function isInternalPath(pathname: string | null | undefined): boolean {
  if (!pathname || typeof pathname !== 'string') return false;
  if (pathname.startsWith('/_next')) return true;
  if (pathname.startsWith('/api')) return true;
  // Static assets — favicon.ico, /icons/foo.svg, etc.
  // Detect by presence of an extension in the last segment.
  const last = pathname.split('/').pop() ?? '';
  return /\.[a-zA-Z0-9]{1,6}$/.test(last);
}

/**
 * True if the path falls under one of the role-gated areas. Used by the
 * proxy to short-circuit auth checks for everything else.
 */
export function isProtectedPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const stripped = stripLocale(pathname);
  return (
    stripped.startsWith('/dashboard') ||
    stripped.startsWith('/supplier') ||
    stripped.startsWith('/ceo')
  );
}

export function withLocale(pathname: string, locale: Locale = DEFAULT_LOCALE): string {
  if (!pathname.startsWith('/')) {
    pathname = `/${pathname}`;
  }
  return `/${locale}${pathname}`;
}

export const I18N_DEFAULT_LOCALE = DEFAULT_LOCALE;
export const I18N_LOCALES = LOCALES;
