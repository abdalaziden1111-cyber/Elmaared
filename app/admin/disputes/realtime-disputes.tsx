'use client';

import { useRealtimeRefresh } from '@/components/realtime/use-realtime-refresh';

// Sits inside the admin disputes list. Triggers router.refresh() whenever
// any dispute row changes — new disputes appear, resolutions remove rows
// from the "open" tab. Mounts once; cleans up on unmount.
export function RealtimeDisputes() {
  useRealtimeRefresh({
    channelKey: 'admin-disputes',
    table: 'disputes',
    event: '*',
  });
  return null;
}
