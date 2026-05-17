import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationBell } from './notification-bell';

// Server-rendered top bar that sits above the main content. It fetches the
// initial unread count server-side so the bell badge is correct on first
// paint, then hands off to the client component for realtime updates.
export async function HeaderBar({
  userId,
  variant = 'light',
}: {
  userId: string;
  variant?: 'light' | 'dark';
}) {
  const admin = createAdminClient();
  const { count } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null);

  const tone =
    variant === 'dark'
      ? 'border-[var(--color-midnight-green-700)] bg-[var(--color-midnight-green)]'
      : 'border-[var(--color-stone-300)] bg-white';

  return (
    <div
      className={`flex items-center justify-end gap-3 border-b ${tone} px-4 py-2`}
    >
      <NotificationBell
        userId={userId}
        initialUnreadCount={count ?? 0}
        variant={variant}
      />
    </div>
  );
}
