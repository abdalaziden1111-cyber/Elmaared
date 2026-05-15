'use client';

import { useRealtimeRefresh } from '@/components/realtime/use-realtime-refresh';

// Listens for new messages on this specific chat. The page re-renders
// server-side so the admin sees new messages without a manual refresh.
export function RealtimeChatMessages({ chatId }: { chatId: string }) {
  useRealtimeRefresh({
    channelKey: `admin-chat-${chatId}`,
    table: 'messages',
    event: 'INSERT',
    filter: `chat_id=eq.${chatId}`,
  });
  // Also refresh on chat updates (panic_at flip, admin_joined_at, archive).
  useRealtimeRefresh({
    channelKey: `admin-chat-meta-${chatId}`,
    table: 'chats',
    event: 'UPDATE',
    filter: `id=eq.${chatId}`,
  });
  return null;
}
