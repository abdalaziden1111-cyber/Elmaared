'use client';

// Phase V4.1 — Notifications page client island.
//
// Owns: tab state, real-time inserts via Supabase Realtime, bulk-select
// checkboxes, optimistic mark-as-read + delete, optional inbox-ping sound.
//
// Server renders the initial rows; this island takes them as a prop and
// then incrementally fetches more / drops in real-time inserts as they
// arrive. Stops auto-marking on visit (the V1 page did that — broken UX
// per Plan v2 §4: "if you marked everything read, you can never glance
// back at the inbox").

import { useEffect, useMemo, useState, useTransition, useRef } from 'react';
import { Link } from '@/lib/i18n/routing';
import { Bell, CheckCheck, Loader2, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/utils/format';
import {
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_TABS,
  type NotificationCategory,
} from '@/lib/notifications/category';
import {
  bulkDeleteNotificationsAction,
  getFilteredNotificationsAction,
  markNotificationsReadAction,
  markNotificationsUnreadAction,
  type RecentNotification,
} from '@/app/actions/notifications';

interface Props {
  userId: string;
  initialCategory: NotificationCategory;
  initialRows: RecentNotification[];
  initialNextCursor: string | null;
  soundEnabled: boolean;
}

export function NotificationsClient(props: Props) {
  const [category, setCategory] = useState<NotificationCategory>(
    props.initialCategory
  );
  const [rows, setRows] = useState<RecentNotification[]>(props.initialRows);
  const [cursor, setCursor] = useState<string | null>(props.initialNextCursor);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [fetching, setFetching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Realtime: on any INSERT for this user, prepend (matches the current
  // tab filter or we'll just leave it). Also play the ping if enabled.
  useEffect(() => {
    const sb = createClient();
    const channel = sb
      .channel(`notif-page-${props.userId}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${props.userId}`,
        },
        (payload: { new: RecentNotification }) => {
          setRows((prev) => [payload.new, ...prev]);
          if (props.soundEnabled && audioRef.current) {
            void audioRef.current.play().catch(() => {
              /* user hasn't interacted yet; browser blocks autoplay */
            });
          }
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [props.userId, props.soundEnabled]);

  // Tab switch — refetch from scratch.
  async function changeTab(c: NotificationCategory) {
    if (c === category) return;
    setCategory(c);
    setSelected(new Set());
    setFetching(true);
    const r = await getFilteredNotificationsAction({ category: c });
    setFetching(false);
    if (r.ok && r.data) {
      setRows(r.data.rows);
      setCursor(r.data.nextCursor);
    }
  }

  async function loadMore() {
    if (!cursor || fetching) return;
    setFetching(true);
    const r = await getFilteredNotificationsAction({
      category,
      createdBefore: cursor,
    });
    setFetching(false);
    if (r.ok && r.data) {
      setRows((prev) => [...prev, ...r.data!.rows]);
      setCursor(r.data.nextCursor);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllOnPage() {
    setSelected(new Set(rows.map((r) => r.id)));
  }

  async function markAllRead() {
    startTransition(async () => {
      await markNotificationsReadAction();
      setRows((prev) =>
        prev.map((r) =>
          r.read_at ? r : { ...r, read_at: new Date().toISOString() }
        )
      );
    });
  }

  async function markSelectedRead() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await markNotificationsReadAction(ids);
      const now = new Date().toISOString();
      setRows((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, read_at: now } : r))
      );
      setSelected(new Set());
    });
  }

  async function markSelectedUnread() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await markNotificationsUnreadAction(ids);
      setRows((prev) =>
        prev.map((r) => (ids.includes(r.id) ? { ...r, read_at: null } : r))
      );
      setSelected(new Set());
    });
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    if (!confirm(`حذف ${ids.length} إشعار؟`)) return;
    startTransition(async () => {
      await bulkDeleteNotificationsAction(ids);
      setRows((prev) => prev.filter((r) => !ids.includes(r.id)));
      setSelected(new Set());
    });
  }

  const unreadOnPage = useMemo(
    () => rows.filter((r) => !r.read_at).length,
    [rows]
  );

  return (
    <div>
      <audio ref={audioRef} src="/sounds/notification.mp3" preload="auto" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {NOTIFICATION_CATEGORY_TABS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => changeTab(c)}
              className={`inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium transition ${
                c === category
                  ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)] hover:bg-[var(--color-stone-300)]'
              }`}
              data-tab={c}
              data-active={c === category}
            >
              {NOTIFICATION_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-stone-600)]">
          {unreadOnPage > 0 ? <span>{unreadOnPage} غير مقروء</span> : null}
          <button
            type="button"
            onClick={markAllRead}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--color-action-blue)] px-3 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-50"
          >
            <CheckCheck className="size-3.5" />
            تعليم الكل كمقروء
          </button>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-stone-300)] bg-white p-2 text-xs">
          <span className="px-2 text-[var(--color-stone-600)]">
            {selected.size} محدد
          </span>
          <button
            type="button"
            onClick={markSelectedRead}
            disabled={pending}
            className="rounded-md bg-[var(--color-stone-100)] px-2 py-1 hover:bg-[var(--color-stone-300)]"
          >
            تعليم كمقروء
          </button>
          <button
            type="button"
            onClick={markSelectedUnread}
            disabled={pending}
            className="rounded-md bg-[var(--color-stone-100)] px-2 py-1 hover:bg-[var(--color-stone-300)]"
          >
            تعليم كغير مقروء
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-md bg-[var(--color-error-50,#FEF2F2)] px-2 py-1 text-[var(--color-error,#B91C1C)] hover:bg-[var(--color-error,#B91C1C)] hover:text-white"
          >
            <Trash2 className="size-3" />
            حذف
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ms-auto text-[var(--color-stone-600)] hover:text-[var(--color-charcoal)]"
          >
            إلغاء
          </button>
        </div>
      ) : null}

      <ul className="mt-4 grid gap-2">
        {rows.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-[var(--color-stone-300)] bg-white p-10 text-center text-sm text-[var(--color-stone-600)]">
            <Bell
              className="mx-auto mb-2 size-6 text-[var(--color-stone-600)]"
              aria-hidden
            />
            لا يوجد إشعارات في هذه الفئة.
          </li>
        ) : (
          rows.map((n) => {
            const isSelected = selected.has(n.id);
            return (
              <li
                key={n.id}
                data-component="notification-row"
                data-read={Boolean(n.read_at)}
                className={`group flex items-start gap-3 rounded-xl border p-3 transition ${
                  n.read_at
                    ? 'border-[var(--color-stone-300)] bg-white'
                    : 'border-[var(--color-action-blue)] bg-[var(--color-cream)]'
                } ${isSelected ? 'ring-2 ring-[var(--color-action-blue)]' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(n.id)}
                  className="mt-1 size-4 shrink-0"
                  aria-label={`اختيار: ${n.title}`}
                />
                <div className="flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    {n.link ? (
                      <Link
                        href={extractPath(n.link)}
                        className="text-sm font-medium text-[var(--color-action-blue)]"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium">{n.title}</span>
                    )}
                    <span className="shrink-0 text-xs text-[var(--color-stone-600)]">
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.body ? (
                    <p className="mt-1 text-xs text-[var(--color-stone-600)]">
                      {n.body}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {cursor ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={fetching}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-stone-100)] px-3 text-xs font-medium hover:bg-[var(--color-stone-300)] disabled:opacity-50"
          >
            {fetching ? <Loader2 className="size-3 animate-spin" /> : null}
            تحميل المزيد
          </button>
        </div>
      ) : null}

      {rows.length > 0 ? (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={selectAllOnPage}
            className="text-[10px] text-[var(--color-stone-600)] hover:text-[var(--color-action-blue)]"
          >
            تحديد كل ما هو ظاهر
          </button>
        </div>
      ) : null}
    </div>
  );
}

// Strip the absolute origin off a stored absolute URL so next-intl <Link>
// can localize it. notifications.link is built via buildNotification() and
// includes the configured APP_URL prefix.
function extractPath(url: string): string {
  try {
    const u = new URL(url);
    // Drop the locale segment ('ar'|'en') so next-intl Link adds the
    // correct one for the current request.
    const stripped = u.pathname.replace(/^\/(ar|en)(?=\/|$)/, '');
    return stripped + u.search;
  } catch {
    return url;
  }
}
