import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export const ROLE_ROUTES: Record<UserRole, string> = {
  admin: '/admin',
  client: '/dashboard',
  supplier: '/supplier',
};

export function getDashboardPath(role: UserRole): string {
  return ROLE_ROUTES[role] ?? '/';
}
