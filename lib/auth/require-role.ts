import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

/**
 * Auth gate for protected pages. Redirects to /login when there's no session,
 * to / when the user is signed in but their role isn't permitted, and
 * surfaces the (user, role) tuple to the caller otherwise.
 *
 * We swallow Supabase errors and treat them as "no auth" — failing closed
 * is the right move on a privileged route.
 */
export async function requireRole(allowedRoles: readonly UserRole[]) {
  const locale = await getLocale();

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect(`/${locale}/login`);
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect(`/${locale}/login`);
  }

  const { data: profileRaw, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // Profile lookup failed — treat as unauth to be safe.
    redirect(`/${locale}/login`);
  }

  const profile = profileRaw as { role: UserRole } | null;
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect(`/${locale}`);
  }

  return { user, role: profile.role };
}
