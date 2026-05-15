import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { ChatWindow, type ChatMessage } from '@/components/chat/chat-window';

export default async function SupplierChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chatId } = await params;
  const { user } = await requireRole(['supplier']);

  // Workaround for the recursive RLS pair (rfqs ↔ proposals): the embedded
  // `rfq:rfqs(...)` select triggers the cycle. Read via admin and verify
  // ownership manually.
  const admin = createAdminClient();

  const { data: chatRowRaw } = await admin
    .from('chats')
    .select('id, supplier_id, panic_at, rfq_id')
    .eq('id', chatId)
    .single();
  const chatRow = chatRowRaw as
    | { id: string; supplier_id: string; panic_at: string | null; rfq_id: string }
    | null;
  if (!chatRow) notFound();

  // Confirm the requester owns the supplier this chat belongs to
  const { data: supRaw } = await admin
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  const supplierRow = supRaw as { id: string } | null;
  if (!supplierRow || supplierRow.id !== chatRow.supplier_id) notFound();

  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('rfq_number, title')
    .eq('id', chatRow.rfq_id)
    .single();
  const chat = {
    id: chatRow.id,
    panic_at: chatRow.panic_at,
    rfq: rfqRaw as { rfq_number: string; title: string } | null,
  };

  const { data: messagesRaw } = await admin
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
          alreadyEscalated={chat.panic_at != null}
        />
      </div>
    </div>
  );
}
