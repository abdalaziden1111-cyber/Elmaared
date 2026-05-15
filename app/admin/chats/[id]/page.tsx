import { Link } from '@/lib/i18n/routing';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import { formatDate, timeAgo } from '@/lib/utils/format';
import { ChatWindow, type ChatMessage } from '@/components/chat/chat-window';
import { JoinChatButton } from './join-chat-button';
import { ArchiveChatButton } from './archive-chat-button';

interface ChatDetail {
  id: string;
  rfq_id: string;
  client_id: string;
  supplier_id: string;
  panic_at: string | null;
  panic_reason: string | null;
  admin_joined_at: string | null;
  is_archived: boolean;
  created_at: string;
  rfqs: { rfq_number: string; title: string; status: string } | null;
  suppliers: { company_name: string } | null;
}

export default async function AdminChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: chatRaw } = await admin
    .from('chats')
    .select(
      'id, rfq_id, client_id, supplier_id, panic_at, panic_reason, admin_joined_at, is_archived, created_at, rfqs(rfq_number, title, status), suppliers(company_name)'
    )
    .eq('id', id)
    .maybeSingle();
  const chat = chatRaw as ChatDetail | null;
  if (!chat) notFound();

  const { data: messagesRaw } = await admin
    .from('messages')
    .select(
      'id, chat_id, sender_id, sender_role, content, is_admin_intervention, is_panic_alert, panic_reason, created_at'
    )
    .eq('chat_id', id)
    .order('created_at', { ascending: true });
  const messages = (messagesRaw ?? []) as unknown as ChatMessage[];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs text-[var(--color-stone-600)] num">
            {chat.rfqs?.rfq_number ?? '—'}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--color-midnight-green)]">
            {chat.rfqs?.title ?? 'محادثة'}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-stone-600)]">
            مع {chat.suppliers?.company_name ?? '—'} · أُنشئت {timeAgo(chat.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {chat.admin_joined_at ? (
            <span className="rounded-full bg-[var(--color-success-100)] px-3 py-1 text-xs text-[var(--color-success)]">
              ✓ انضمت لهذه المحادثة {timeAgo(chat.admin_joined_at)}
            </span>
          ) : (
            <JoinChatButton chatId={chat.id} />
          )}
          <ArchiveChatButton chatId={chat.id} isArchived={chat.is_archived} />
        </div>
      </div>

      {chat.panic_at ? (
        <div className="mt-4 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)]/40 p-4">
          <p className="text-sm font-semibold text-[var(--color-danger)]">
            🚨 تصعيد عاجل
          </p>
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            رُفع {timeAgo(chat.panic_at)} ({formatDate(chat.panic_at)})
          </p>
          {chat.panic_reason ? (
            <p className="mt-2 text-sm text-[var(--color-charcoal)]">{chat.panic_reason}</p>
          ) : null}
        </div>
      ) : null}

      <section className="mt-6">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          الرسائل ({messages.length})
        </h2>
        <div className="mt-3">
          <ChatWindow
            chatId={chat.id}
            currentUserId={user.id}
            currentRole="admin"
            initialMessages={messages}
            alreadyEscalated={chat.panic_at != null}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link
          href={`/admin/rfqs/${chat.rfq_id}`}
          className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          → افتح الطلب
        </Link>
        <Link
          href="/admin/chats"
          className="text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          ← العودة للمحادثات
        </Link>
      </div>
    </div>
  );
}
