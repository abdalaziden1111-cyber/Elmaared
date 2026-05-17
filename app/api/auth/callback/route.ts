import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/config';

// Detect the locale to bounce to. Priority:
//   1. ?locale=ar|en explicit query param
//   2. NEXT_LOCALE cookie (set by next-intl after navigation)
//   3. defaultLocale from config
async function resolveLocale(searchParams: URLSearchParams): Promise<Locale> {
  const qp = searchParams.get('locale');
  if (qp && (locales as readonly string[]).includes(qp)) {
    return qp as Locale;
  }
  const c = await cookies();
  const cookieLocale = c.get('NEXT_LOCALE')?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }
  return defaultLocale;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = await resolveLocale(searchParams);
  const next = searchParams.get('next') ?? `/${locale}/dashboard`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
