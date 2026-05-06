import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export async function requireRole(allowedRoles: UserRole[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const profile = profileRaw as { role: UserRole } | null;

  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect('/');
  }

  return { user, role: profile.role };
}
