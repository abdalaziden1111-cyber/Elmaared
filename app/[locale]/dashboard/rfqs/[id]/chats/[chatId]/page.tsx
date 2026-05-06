import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { ChatWindow, type ChatMessage } from '@/components/chat/chat-window';

export default async function ClientChatPage({
  params,
}: {
  params: Promise<{ id: string; chatId: string }>;
}) {
  const { id: rfqId, chatId } = await params;
  const { user } = await requireRole(['client']);
  const supabase = await createClient();

  const { data: chatRowRaw } = await supabase
    .from('chats')
    .select('id, rfq_id, client_id, supplier:suppliers (id, company_name)')
    .eq('id', chatId)
    .single();
  const chat = chatRowRaw as
    | { id: string; rfq_id: string; client_id: string; supplier: { id: string; company_name: string } | null }
    | null;
  if (!chat || chat.client_id !== user.id || chat.rfq_id !== rfqId) notFound();

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
      <h1 className="text-xl font-semibold text-[var(--color-midnight-green)]">
        محادثة مع {chat.supplier?.company_name ?? 'المورد'}
      </h1>
      <div className="mt-4">
        <ChatWindow
          chatId={chatId}
          currentUserId={user.id}
          currentRole="client"
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
