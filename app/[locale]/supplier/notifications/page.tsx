import Link from 'next/link';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationsClient } from '@/app/[locale]/dashboard/notifications/notifications-client';

// Phase W4.2 — Supplier-side mirror of the client notifications page.
// Reuses the exact NotificationsClient island (real-time, tabs, bulk
// actions, sound). Difference is requireRole(['supplier']) + the
// preferences link href.

const DEFAULT_PAGE_SIZE = 25;

export default async function SupplierNotificationsPage() {
  const { user } = await requireRole(['supplier']);
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
            تحديثات على عروضك، طلبات مطابقة لتخصصك، إشعارات الإدارة.
          </p>
        </div>
        <Link
          href="/ar/supplier/notifications/preferences"
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
