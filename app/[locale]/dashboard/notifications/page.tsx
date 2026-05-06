import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { timeAgo } from '@/lib/utils/format';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export default async function NotificationsPage() {
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  // Fetch + mark-as-read in one server-rendered pass
  const { data: rowsRaw } = await admin
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const rows = (rowsRaw ?? []) as unknown as Notif[];
  const unreadIds = rows.filter((n) => !n.read_at).map((n) => n.id);
  if (unreadIds.length > 0) {
    await admin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        الإشعارات
      </h1>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--color-stone-600)]">لا يوجد إشعارات.</p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-[var(--color-stone-300)] bg-white p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <a
                  href={n.link ?? '#'}
                  className="text-sm font-medium text-[var(--color-action-blue)]"
                >
                  {n.title}
                </a>
                <span className="text-xs text-[var(--color-stone-600)]">
                  {timeAgo(n.created_at)}
                </span>
              </div>
              {n.body ? (
                <p className="mt-1 text-xs text-[var(--color-stone-600)]">{n.body}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
