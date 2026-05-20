import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationsClient } from './notifications-client';

// Phase V4.1 — Rebuilt notifications page.
//
// Important: removed the "mark everything as read on visit" behavior. The
// old page silently flipped read_at=now() for every notification at load
// time — that erased the user's own ability to glance back at the inbox
// and broke the bell badge in confusing ways. The new flow puts the user
// in charge: explicit "mark all read" button + per-row + bulk select.

const DEFAULT_PAGE_SIZE = 25;

export default async function NotificationsPage() {
  const { user } = await requireRole(['client']);
  const admin = createAdminClient();

  const { data: rowsRaw } = await admin
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(DEFAULT_PAGE_SIZE + 1);
  const rows = (rowsRaw ?? []) as Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    read_at: string | null;
    created_at: string;
  }>;
  const hasMore = rows.length > DEFAULT_PAGE_SIZE;
  const initialRows = hasMore ? rows.slice(0, DEFAULT_PAGE_SIZE) : rows;
  const initialNextCursor = hasMore
    ? initialRows[initialRows.length - 1].created_at
    : null;

  // Read preferences for the sound toggle. Falls back to true (ping enabled)
  // when the user hasn't visited the preferences page yet.
  const { data: prefsRow } = await admin
    .from('notification_preferences')
    .select('sound_enabled')
    .eq('user_id', user.id)
    .maybeSingle();
  const soundEnabled =
    (prefsRow as { sound_enabled: boolean | null } | null)?.sound_enabled ?? true;

  return (
    <div>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
            الإشعارات
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            كل التحديثات على طلباتك، عروضك، ومدفوعاتك في مكان واحد.
          </p>
        </div>
        <Link
          href="/ar/dashboard/notifications/preferences"
          className="text-sm font-medium text-[var(--color-action-blue)] hover:underline"
        >
          إعدادات الإشعارات ←
        </Link>
      </header>

      <div className="mt-6">
        <NotificationsClient
          userId={user.id}
          initialCategory="all"
          initialRows={initialRows}
          initialNextCursor={initialNextCursor}
          soundEnabled={soundEnabled}
        />
      </div>
    </div>
  );
}
