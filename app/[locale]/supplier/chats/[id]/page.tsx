import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow, type ChatMessage } from '@/components/chat/chat-window';

export default async function SupplierChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chatId } = await params;
  const { user } = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: chatRowRaw } = await supabase
    .from('chats')
    .select('id, rfq:rfqs(rfq_number, title)')
    .eq('id', chatId)
    .single();
  const chat = chatRowRaw as
    | { id: string; rfq: { rfq_number: string; title: string } | null }
    | null;
  if (!chat) notFound();

  const { data: messagesRaw } = await supabase
    .from('messages')
    .select(
      'id, chat_id, sender_id, sender_role, content, is_admin_intervention, is_panic_alert, panic_reason, created_at'
    )
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });
  const messages = (messagesRaw ?? []) as unknown as ChatMessage[];

  return (
    <div>
      <div className="text-xs text-[var(--color-stone-600)] num">
        {chat.rfq?.rfq_number}
      </div>
      <h1 className="mt-1 text-xl font-semibold text-[var(--color-midnight-green)]">
        {chat.rfq?.title ?? 'محادثة'}
      </h1>
      <div className="mt-4">
        <ChatWindow
          chatId={chatId}
          currentUserId={user.id}
          currentRole="supplier"
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
