import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

/**
 * Returns the authenticated Supabase user, or null when no session exists,
 * the auth call errors out (network blip, expired refresh token), or the
 * cookie store is unavailable (e.g. some edge cases inside generated routes).
 *
 * Never throws — render paths can safely call this and treat null as
 * "show the login page or read-only view".
 */
export async function getUser() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}
