import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

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
];

const locales = ['ar', 'en'];
const defaultLocale = 'ar';

function getLocaleFromPath(pathname: string): string | null {
  const segments = pathname.split('/');
  if (segments[1] && locales.includes(segments[1])) {
    return segments[1];
  }
  return null;
}

function stripLocale(pathname: string): string {
  const locale = getLocaleFromPath(pathname);
  if (locale) {
    return pathname.replace(`/${locale}`, '') || '/';
  }
  return pathname;
}

function isPublicPath(pathname: string): boolean {
  const stripped = stripLocale(pathname);
  return PUBLIC_PATHS.some((p) => stripped === p || stripped.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip internal Next.js routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Add locale prefix if missing (redirect to /ar/...)
  const locale = getLocaleFromPath(pathname);
  if (!locale && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Public paths — no auth needed
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Admin paths — no locale prefix, require admin role
  if (pathname.startsWith('/admin')) {
    const { user, supabase, response } = await updateSession(request);

    if (!user) {
      return NextResponse.redirect(new URL(`/${defaultLocale}/login`, request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL(`/${defaultLocale}/dashboard`, request.url));
    }

    return response;
  }

  // Protected paths — require auth + correct role
  const strippedPath = stripLocale(pathname);
  const isProtected =
    strippedPath.startsWith('/dashboard') ||
    strippedPath.startsWith('/supplier') ||
    strippedPath.startsWith('/ceo');

  if (!isProtected) {
    return NextResponse.next();
  }

  const { user, supabase, response } = await updateSession(request);

  if (!user) {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/login`, request.url));
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/login`, request.url));
  }

  // Role-based access
  if (strippedPath.startsWith('/dashboard') && profile.role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/supplier`, request.url));
  }
  if (strippedPath.startsWith('/supplier') && profile.role !== 'supplier') {
    return NextResponse.redirect(new URL(`/${locale || defaultLocale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)',
  ],
};
