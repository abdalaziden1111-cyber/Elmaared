'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { ActionResult } from './auth';

export interface RecentNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

// Mark notifications as read. If `ids` is omitted or empty, marks ALL of
// the caller's unread notifications. Caller can't mark someone else's
// notifications — we always filter by user_id.
export async function markNotificationsReadAction(
  ids?: string[]
): Promise<ActionResult<{ markedCount: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  let query = admin
    .from('notifications')
    .update({ read_at: now })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (ids && ids.length > 0) {
    query = query.in('id', ids);
  }

  const { error } = await query;
  if (error) return { ok: false, error: 'فشل في تحديث الإشعارات.' };

  revalidatePath('/dashboard/notifications');
  revalidatePath('/dashboard');
  revalidatePath('/supplier');
  revalidatePath('/admin');

  // Note: we don't know how many rows were affected without a separate
  // SELECT, but the user only cares that it succeeded. Return 0 when
  // the caller didn't supply ids (marking-all). For specific ids, the
  // ceiling is ids.length.
  return {
    ok: true,
    data: { markedCount: ids?.length ?? 0 },
  };
}

// Server action used by the bell dropdown to fetch the latest 10 notifications.
// Returns rows for the current user, newest first.
export async function getRecentNotificationsAction(
  limit = 10
): Promise<ActionResult<{ rows: RecentNotification[]; unreadCount: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));

  const rows = (rowsRaw ?? []) as unknown as RecentNotification[];

  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return { ok: true, data: { rows, unreadCount: count ?? 0 } };
}
