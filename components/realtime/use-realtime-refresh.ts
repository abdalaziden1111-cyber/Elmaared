'use client';

import { useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { createClient } from '@/lib/supabase/client';

type PgEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

// Subscribes to postgres_changes on the given table and calls
// router.refresh() whenever a matching event fires. Use it on list/detail
// pages where the data is server-rendered — refresh() reruns the RSC tree
// so the new state appears without a full reload.
//
// Realtime is best-effort. If the websocket can't establish (firewall,
// stale token), the page still works — the user just has to refresh
// manually to see changes. We don't pretend to be online; we don't run
// a polling fallback here because list pages aren't latency-critical
// the way chat-window is.
export function useRealtimeRefresh({
  channelKey,
  table,
  event = '*',
  filter,
}: {
  channelKey: string;
  table: string;
  event?: PgEvent;
  filter?: string;
}): void {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(channelKey)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [channelKey, table, event, filter, router]);
}
