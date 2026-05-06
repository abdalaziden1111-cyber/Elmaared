'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { sendMessageAction } from '@/app/actions/chat';
import { cn } from '@/lib/utils/cn';
import { Loader2, Send } from 'lucide-react';

export interface ChatMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  sender_role: 'admin' | 'client' | 'supplier';
  content: string | null;
  is_admin_intervention: boolean | null;
  is_panic_alert: boolean | null;
  panic_reason: string | null;
  created_at: string;
}

interface ChatWindowProps {
  chatId: string;
  currentUserId: string;
  currentRole: 'admin' | 'client' | 'supplier';
  initialMessages: ChatMessage[];
}

export function ChatWindow({
  chatId,
  currentUserId,
  currentRole,
  initialMessages,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [pending, startTransition] = useTransition();
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Subscribe to new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((p) => p.id === m.id) ? prev : [...prev, m]
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId]);

  // Auto-scroll to newest
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!content) return;
    const fd = new FormData();
    fd.set('chatId', chatId);
    fd.set('content', content);
    setDraft('');
    startTransition(async () => {
      const result = await sendMessageAction(null, fd);
      if (!result.ok) {
        // restore draft on failure
        setDraft(content);
      }
    });
  }

  return (
    <div className="flex h-[calc(100vh-180px)] flex-col rounded-2xl border border-[var(--color-stone-300)] bg-white">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-[var(--color-stone-600)]">
            ابدأ المحادثة بإرسال رسالتك الأولى.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} mine={m.sender_id === currentUserId} />
            ))}
          </ul>
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="flex gap-2 border-t border-[var(--color-stone-200)] bg-[var(--color-cream)] p-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            currentRole === 'admin' ? 'اكتب كـ Admin…' : 'اكتب رسالتك…'
          }
          maxLength={4000}
          className="h-11 flex-1 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />
        <button
          type="submit"
          disabled={pending || draft.trim().length === 0}
          className="inline-flex h-11 items-center justify-center gap-1 rounded-xl bg-[var(--color-action-blue)] px-4 text-sm font-medium text-[var(--color-cream)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          إرسال
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  const isPanic = message.is_panic_alert;
  const isAdmin = message.sender_role === 'admin' || message.is_admin_intervention;

  if (isPanic) {
    return (
      <li className="self-center rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] px-4 py-2 text-xs text-[var(--color-danger)]">
        🚨 {message.content}
      </li>
    );
  }

  return (
    <li
      className={cn(
        'max-w-[80%] rounded-2xl px-4 py-2 text-sm',
        mine
          ? 'self-end bg-[var(--color-action-blue)] text-[var(--color-cream)]'
          : isAdmin
          ? 'self-start border border-[var(--color-dune-gold)] bg-[var(--color-dune-gold-100)] text-[var(--color-charcoal)]'
          : 'self-start bg-[var(--color-stone-100)] text-[var(--color-charcoal)]'
      )}
    >
      {isAdmin && !mine ? (
        <div className="text-[10px] font-semibold text-[var(--color-dune-gold)]">
          Admin
        </div>
      ) : null}
      <div className="whitespace-pre-line">{message.content}</div>
    </li>
  );
}
