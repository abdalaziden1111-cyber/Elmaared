'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { Link } from '@/lib/i18n/routing';
import { Bell, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getRecentNotificationsAction,
  markNotificationsReadAction,
  type RecentNotification,
} from '@/app/actions/notifications';
import { timeAgo } from '@/lib/utils/format';

// Bell that lives in the layout header. Initial unread count is computed
// server-side and passed in. The dropdown lazy-loads the recent rows on
// first open. A realtime subscription on the notifications table for the
// current user bumps the count when new ones land.
export function NotificationBell({
  userId,
  initialUnreadCount,
  variant = 'light',
}: {
  userId: string;
  initialUnreadCount: number;
  variant?: 'light' | 'dark';
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(initialUnreadCount);
  const [rows, setRows] = useState<RecentNotification[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    const r = await getRecentNotificationsAction(10);
    if (r.ok) {
      const d = r.data;
      if (d) {
        setUnread(d.unreadCount);
        setRows(d.rows);
      }
    }
  }, []);

  // Realtime: re-fetch count + recent on any change to my notifications.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          void refreshCount();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshCount]);

  // Close dropdown on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && rows === null) {
      setLoading(true);
      await refreshCount();
      setLoading(false);
    }
  }

  function markAllRead() {
    startTransition(async () => {
      const r = await markNotificationsReadAction();
      if (r.ok) {
        setUnread(0);
        setRows((prev) =>
          prev
            ? prev.map((row) =>
                row.read_at ? row : { ...row, read_at: new Date().toISOString() }
              )
            : prev
        );
        router.refresh();
      }
    });
  }

  const isDark = variant === 'dark';
  const buttonTone = isDark
    ? 'border-[var(--color-cream)]/30 text-[var(--color-cream)] hover:bg-white/10'
    : 'border-[var(--color-stone-300)] text-[var(--color-midnight-green)] hover:bg-[var(--color-stone-100)]';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`الإشعارات${unread > 0 ? ` (${unread} غير مقروء)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-lg border ${buttonTone} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]`}
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1 -end-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1 text-[10px] font-semibold text-white"
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="قائمة الإشعارات"
          className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-[var(--color-stone-300)] bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-stone-300)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--color-midnight-green)]">
              الإشعارات
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs text-[var(--color-action-blue)] hover:underline disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
              >
                {pending ? (
                  <Loader2 className="size-3 animate-spin" aria-hidden />
                ) : (
                  <Check className="size-3" aria-hidden />
                )}
                علّم الكل كمقروء
              </button>
            ) : null}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && rows === null ? (
              <div className="flex items-center justify-center p-6 text-sm text-[var(--color-stone-600)]">
                <Loader2 className="size-4 animate-spin" aria-hidden />
              </div>
            ) : !rows || rows.length === 0 ? (
              <p className="p-6 text-center text-sm text-[var(--color-stone-600)]">
                لا توجد إشعارات.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-stone-300)]">
                {rows.map((n) => (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => setOpen(false)}
                        className={`block px-4 py-3 text-sm hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${n.read_at ? 'opacity-70' : ''}`}
                      >
                        <NotificationContent n={n} />
                      </Link>
                    ) : (
                      <div
                        className={`px-4 py-3 text-sm ${n.read_at ? 'opacity-70' : ''}`}
                      >
                        <NotificationContent n={n} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-[var(--color-stone-300)] bg-[var(--color-stone-100)]/40 px-4 py-2 text-center text-xs text-[var(--color-action-blue)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            عرض كل الإشعارات
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function NotificationContent({ n }: { n: RecentNotification }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-[var(--color-charcoal)]">{n.title}</p>
        {!n.read_at ? (
          <span
            aria-label="غير مقروء"
            className="mt-1.5 inline-block size-2 shrink-0 rounded-full bg-[var(--color-action-blue)]"
          />
        ) : null}
      </div>
      {n.body ? (
        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--color-stone-600)]">
          {n.body}
        </p>
      ) : null}
      <p className="mt-1 text-[10px] text-[var(--color-stone-600)]">
        {timeAgo(n.created_at)}
      </p>
    </>
  );
}
