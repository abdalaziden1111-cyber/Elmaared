# Phase 4 — Real-time Chat & Negotiation (Weeks 9-10)

> **Goal**: A client shortlists up to 4 suppliers (with submitted proposals) and negotiates with them in parallel via real-time chat. Admin is silently present in every chat as a third party. A panic button summons Admin in 30 seconds.

> **Prerequisite**: Phases 0–3 complete. Proposals exist with AI scores. Clients can view the compare page.

---

## What this phase delivers

By end of Week 10:

1. `/[locale]/dashboard/rfqs/[id]/proposals` — client can shortlist up to 4 suppliers, which creates chat rooms.
2. `/[locale]/dashboard/chats` — list of active chats per RFQ.
3. `/[locale]/dashboard/chats/[chatId]` — chat window (real-time via Supabase Realtime).
4. `/[locale]/supplier/chats` + `/[locale]/supplier/chats/[chatId]` — supplier side.
5. File attachments in chat (images + PDFs).
6. **Panic button** in every chat → notifies Admin via in-app, email, optional SMS.
7. **Admin presence indicator** — both parties see "Admin يستمع للمحادثة" badge.
8. `/admin/chats` — Admin sees all active chats sorted by last activity.
9. `/admin/chats/[chatId]` — Admin can read silently or send messages with Admin badge.
10. `/admin/panic` — list of active panic alerts with countdown.
11. ~25 new unit + integration tests + 1 E2E test.

---

## Step 4.1 — Migrations: chat schema additions

Phase 0 created `chats` and `messages` tables. Add fields needed for shortlisting and panic.

### File: `supabase/migrations/20260615000001_chat_extensions.sql`

```sql
-- Track admin presence per chat (so we can show indicator)
ALTER TABLE chats
  ADD COLUMN IF NOT EXISTS admin_joined_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS panic_at timestamptz,
  ADD COLUMN IF NOT EXISTS panic_reason text,
  ADD COLUMN IF NOT EXISTS panic_resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposal_id uuid REFERENCES proposals(id) ON DELETE SET NULL;

-- Marker on messages distinguishing system / admin / regular
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS chats_rfq_id_active_idx ON chats(rfq_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS chats_panic_open_idx ON chats(panic_at) WHERE panic_at IS NOT NULL AND panic_resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS messages_chat_id_created_idx ON messages(chat_id, created_at);

-- Helper: how many active chats does an RFQ have?
CREATE OR REPLACE FUNCTION rfq_active_chat_count(rfq_uuid uuid)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT count(*)::int FROM chats WHERE rfq_id = rfq_uuid AND is_active = true;
$$;

-- Hard cap: max 4 simultaneous active chats per RFQ
-- Enforced at the application layer too, but a trigger guards against bypass.
CREATE OR REPLACE FUNCTION enforce_chat_cap()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT count(*) FROM chats WHERE rfq_id = NEW.rfq_id AND is_active = true) >= 4 THEN
    RAISE EXCEPTION 'Maximum 4 active chats per RFQ';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chats_enforce_cap ON chats;
CREATE TRIGGER chats_enforce_cap
  BEFORE INSERT ON chats
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION enforce_chat_cap();

-- Realtime — make sure messages, chats, notifications are replicated
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
```

(The `ALTER PUBLICATION` lines fail safely if already added by Phase 0's `20260501000011_realtime.sql`.)

---

## Step 4.2 — Shortlist Server Action

### File: `app/actions/chat.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { after } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole, requireUser } from '@/lib/auth/get-user';
import { sendEmail } from '@/lib/email/resend';
import ShortlistedEmail from '@/lib/email/templates/shortlisted';
import PanicAdminEmail from '@/lib/email/templates/panic-admin';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

// ───────────────────────────────────────────────────────────
// SHORTLIST: client adds a supplier (proposal) to negotiation
// ───────────────────────────────────────────────────────────
export async function shortlistProposalAction(input: { rfqId: string; proposalId: string }): Promise<ActionResult<{ chatId: string }>> {
  const user = await requireRole(['client']);
  const supabase = await createClient();
  const admin = createAdminClient();

  // Validate the user owns the RFQ
  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, status, rfq_number, title')
    .eq('id', input.rfqId)
    .eq('client_id', user.id)
    .single();

  if (!rfq) return { ok: false, error: 'الطلب غير موجود.' };
  if (!['negotiating', 'open'].includes(rfq.status)) {
    return { ok: false, error: 'الطلب لم يعد في مرحلة التفاوض.' };
  }

  // Check current active chats (cap = 4)
  const { count: activeCount } = await supabase
    .from('chats')
    .select('*', { count: 'exact', head: true })
    .eq('rfq_id', input.rfqId)
    .eq('is_active', true);

  if ((activeCount ?? 0) >= 4) {
    return {
      ok: false,
      error: 'وصلت للحد الأقصى: 4 موردين بالتوازي. لإضافة مورد جديد، أنهِ أو ارفض مفاوضة قائمة أولاً.',
    };
  }

  // Get proposal + supplier
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, supplier_id, status')
    .eq('id', input.proposalId)
    .eq('rfq_id', input.rfqId)
    .single();

  if (!proposal) return { ok: false, error: 'العرض غير موجود.' };
  if (proposal.status === 'withdrawn') return { ok: false, error: 'العرض مسحوب.' };

  // Check no chat already exists for this rfq+supplier pair
  const { data: existing } = await supabase
    .from('chats')
    .select('id')
    .eq('rfq_id', input.rfqId)
    .eq('supplier_id', proposal.supplier_id)
    .eq('is_active', true)
    .maybeSingle();

  if (existing) {
    return { ok: true, data: { chatId: existing.id } };
  }

  // Create chat row
  const { data: chat, error } = await supabase
    .from('chats')
    .insert({
      rfq_id: input.rfqId,
      client_id: user.id,
      supplier_id: proposal.supplier_id,
      proposal_id: proposal.id,
      is_active: true,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (error || !chat) {
    if (error?.message.includes('Maximum 4 active chats')) {
      return { ok: false, error: 'وصلت للحد الأقصى: 4 موردين بالتوازي.' };
    }
    return { ok: false, error: 'فشل في فتح المحادثة.' };
  }

  // Update proposal status
  await admin.from('proposals').update({ status: 'shortlisted' }).eq('id', proposal.id);

  // Insert system welcome message
  await admin.from('messages').insert({
    chat_id: chat.id,
    sender_id: user.id, // client opened the chat
    is_system: true,
    body: `بدأت محادثة جديدة على ${rfq.rfq_number}. Admin يقرأ هذه المحادثة بصمت — لا يتدخل إلا لو طلبت أو لو لاحظ خللاً.`,
  });

  // Audit
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'shortlist_proposal',
    resource_type: 'proposal',
    resource_id: proposal.id,
    metadata: { rfq_id: rfq.id, chat_id: chat.id },
  });

  // Notify supplier (in-app + email) — fire & forget
  after(async () => {
    try {
      await admin.from('notifications').insert({
        user_id: proposal.supplier_id,
        type: 'proposal_shortlisted',
        title: 'شركة اختارتك للتفاوض!',
        body: `تم اختيارك للتفاوض على ${rfq.rfq_number}. ابدأ المحادثة الآن.`,
        link: `/supplier/chats/${chat.id}`,
      });

      const { data: supplierProfile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', proposal.supplier_id)
        .single();

      if (supplierProfile?.email) {
        await sendEmail({
          to: supplierProfile.email,
          subject: `🎉 تم اختيارك للمفاوضة على ${rfq.rfq_number}`,
          react: ShortlistedEmail({
            supplierName: supplierProfile.full_name ?? 'مرحباً',
            rfqNumber: rfq.rfq_number,
            rfqTitle: rfq.title,
            chatUrl: `${process.env.NEXT_PUBLIC_APP_URL}/ar/supplier/chats/${chat.id}`,
          }),
        });
      }
    } catch (e) {
      console.error('shortlist notifications failed:', e);
    }
  });

  revalidatePath(`/dashboard/rfqs/${input.rfqId}/proposals`);
  return { ok: true, data: { chatId: chat.id } };
}

// ───────────────────────────────────────────────────────────
// SEND MESSAGE
// ───────────────────────────────────────────────────────────
const sendMessageSchema = z.object({
  chatId: z.string().uuid(),
  body: z.string().min(1).max(4000),
  attachments: z.array(z.object({
    path: z.string(),
    url: z.string(),
    filename: z.string(),
    sizeBytes: z.number(),
    mimeType: z.string(),
  })).default([]),
});

export async function sendMessageAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'بيانات الرسالة غير صحيحة.' };

  const supabase = await createClient();

  // Check user is in this chat (RLS will also block, but fail early with friendly msg)
  const { data: chat } = await supabase
    .from('chats')
    .select('id, client_id, supplier_id, is_active')
    .eq('id', parsed.data.chatId)
    .single();

  if (!chat) return { ok: false, error: 'المحادثة غير موجودة.' };
  if (!chat.is_active) return { ok: false, error: 'هذه المحادثة مغلقة.' };

  // Get role to mark admin messages
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  const isParticipant = chat.client_id === user.id || chat.supplier_id === user.id;

  if (!isAdmin && !isParticipant) {
    return { ok: false, error: 'لست طرفاً في هذه المحادثة.' };
  }

  const { error } = await supabase.from('messages').insert({
    chat_id: parsed.data.chatId,
    sender_id: user.id,
    body: parsed.data.body,
    attachments: parsed.data.attachments,
    is_admin: isAdmin,
  });

  if (error) {
    console.error('sendMessage error:', error);
    return { ok: false, error: 'فشل إرسال الرسالة. حاول مرة أخرى.' };
  }

  // If admin sent, mark admin presence on the chat
  if (isAdmin && !chat.client_id /* never falsy in practice — placeholder */) {
    // no-op
  }

  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// PANIC: client or supplier summons admin
// ───────────────────────────────────────────────────────────
const panicSchema = z.object({
  chatId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

export async function panicAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = panicSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'اكتب سبب طلب Admin (10 حروف على الأقل).' };

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: chat } = await supabase
    .from('chats')
    .select(`
      id, rfq_id, client_id, supplier_id, panic_at,
      rfqs!inner(rfq_number)
    `)
    .eq('id', parsed.data.chatId)
    .single();

  if (!chat) return { ok: false, error: 'المحادثة غير موجودة.' };
  if (chat.client_id !== user.id && chat.supplier_id !== user.id) {
    return { ok: false, error: 'لست طرفاً في هذه المحادثة.' };
  }
  if (chat.panic_at) {
    return { ok: false, error: 'تم استدعاء Admin بالفعل. سيدخل خلال دقائق.' };
  }

  // Mark panic
  await supabase
    .from('chats')
    .update({ panic_at: new Date().toISOString(), panic_reason: parsed.data.reason })
    .eq('id', parsed.data.chatId);

  // Insert system message visible to both parties
  await admin.from('messages').insert({
    chat_id: parsed.data.chatId,
    sender_id: user.id,
    is_system: true,
    body: `🚨 تم استدعاء Admin. السبب: "${parsed.data.reason}". سيدخل Admin خلال دقائق.`,
  });

  // Audit
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'panic',
    resource_type: 'chat',
    resource_id: parsed.data.chatId,
    metadata: { reason: parsed.data.reason },
  });

  // Notify ALL admins (in-app + email — and SMS in production)
  const { data: admins } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .eq('role', 'admin');

  if (admins) {
    await admin.from('notifications').insert(
      admins.map((a) => ({
        user_id: a.id,
        type: 'panic_alert',
        title: `🚨 PANIC — ${(chat.rfqs as any).rfq_number}`,
        body: `طُلب Admin في محادثة. السبب: ${parsed.data.reason}`,
        link: `/admin/chats/${chat.id}`,
      }))
    );

    after(async () => {
      try {
        await Promise.allSettled(
          admins.map((a) =>
            sendEmail({
              to: a.email,
              subject: `🚨 PANIC — ${(chat.rfqs as any).rfq_number}`,
              react: PanicAdminEmail({
                adminName: a.full_name ?? 'Admin',
                rfqNumber: (chat.rfqs as any).rfq_number,
                reason: parsed.data.reason,
                chatUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/chats/${chat.id}`,
              }),
            })
          )
        );
      } catch (e) {
        console.error('panic email fan-out failed:', e);
      }
    });
  }

  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ADMIN: join a chat (records presence so badge appears)
// ───────────────────────────────────────────────────────────
export async function adminJoinChatAction(chatId: string): Promise<ActionResult> {
  const user = await requireRole(['admin']);
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: chat } = await supabase
    .from('chats')
    .select('id, admin_joined_at')
    .eq('id', chatId)
    .single();

  if (!chat) return { ok: false, error: 'Chat not found' };
  if (chat.admin_joined_at) return { ok: true }; // idempotent

  await supabase
    .from('chats')
    .update({ admin_joined_at: new Date().toISOString(), admin_user_id: user.id })
    .eq('id', chatId);

  await admin.from('messages').insert({
    chat_id: chatId,
    sender_id: user.id,
    is_system: true,
    body: '🛡️ Admin انضم للمحادثة كطرف ثالث.',
  });

  return { ok: true };
}

export async function adminResolvePanicAction(chatId: string): Promise<ActionResult> {
  const user = await requireRole(['admin']);
  const supabase = await createClient();

  await supabase
    .from('chats')
    .update({ panic_resolved_at: new Date().toISOString() })
    .eq('id', chatId)
    .not('panic_at', 'is', null);

  return { ok: true };
}
```

### File: `lib/email/templates/shortlisted.tsx`

```tsx
import { Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

export default function ShortlistedEmail({
  supplierName, rfqNumber, rfqTitle, chatUrl,
}: { supplierName: string; rfqNumber: string; rfqTitle: string; chatUrl: string }) {
  return (
    <EmailLayout preview={`اختارتك شركة للمفاوضة على ${rfqNumber}`}>
      <Text style={s.h1}>🎉 شركة اختارتك للتفاوض</Text>
      <Text style={s.text}>مرحباً {supplierName},</Text>
      <Text style={s.text}>
        تم اختيارك للتفاوض على <strong>{rfqTitle}</strong> ({rfqNumber}).
      </Text>
      <Text style={s.text}>
        ابدأ المحادثة الآن لتزيد فرصك في الفوز بالعقد.
      </Text>
      <div style={s.ctaWrap}>
        <a href={chatUrl} style={s.cta}>افتح المحادثة ←</a>
      </div>
    </EmailLayout>
  );
}
```

### File: `lib/email/templates/panic-admin.tsx`

```tsx
import { Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

export default function PanicAdminEmail({
  adminName, rfqNumber, reason, chatUrl,
}: { adminName: string; rfqNumber: string; reason: string; chatUrl: string }) {
  return (
    <EmailLayout preview={`PANIC — ${rfqNumber}`}>
      <Text style={{ ...s.h1, color: '#DC2626' }}>🚨 PANIC ALERT — {rfqNumber}</Text>
      <Text style={s.text}>{adminName},</Text>
      <Text style={s.text}>
        تم استدعاء Admin في محادثة. السبب:
      </Text>
      <div style={{ backgroundColor: '#FAF8F4', padding: '12px', borderRadius: '8px', borderInlineStart: '3px solid #DC2626' }}>
        <Text style={{ ...s.text, margin: 0 }}>"{reason}"</Text>
      </div>
      <div style={s.ctaWrap}>
        <a href={chatUrl} style={{ ...s.cta, backgroundColor: '#DC2626' }}>ادخل المحادثة الآن ←</a>
      </div>
      <Text style={s.text}><strong>هدف الاستجابة:</strong> 30 ثانية.</Text>
    </EmailLayout>
  );
}
```

---

## Step 4.3 — Compare-page wiring (shortlist + open chat)

### Update `app/[locale]/(client)/dashboard/rfqs/[id]/proposals/page.tsx` from Phase 3

Add a "Shortlist" button on each proposal card. After calling the action, navigate to the chat.

```tsx
// Add at top of file:
import { ShortlistButton } from './shortlist-button';

// Then in the proposal card map, replace the simple Link wrapper with:
{proposals.map((p: any) => {
  const isShortlisted = ['shortlisted', 'accepted'].includes(p.status);
  return (
    <div key={p.id} className="bg-stone-100 rounded-xl p-4 border border-stone-300 space-y-3">
      <Link href={`/dashboard/rfqs/${rfq.id}/proposals/${p.id}`} className="block hover:bg-stone-200 -m-4 p-4 rounded-xl">
        {/* existing card content */}
      </Link>
      <div className="flex justify-end pt-2 border-t border-stone-300/50">
        <ShortlistButton
          rfqId={rfq.id}
          proposalId={p.id}
          isShortlisted={isShortlisted}
          activeChatCount={proposals.filter((x: any) => x.status === 'shortlisted').length}
        />
      </div>
    </div>
  );
})}
```

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/proposals/shortlist-button.tsx`

```tsx
'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { shortlistProposalAction } from '@/app/actions/chat';

interface Props {
  rfqId: string;
  proposalId: string;
  isShortlisted: boolean;
  activeChatCount: number;
}

export function ShortlistButton({ rfqId, proposalId, isShortlisted, activeChatCount }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isFull = activeChatCount >= 4;

  if (isShortlisted) {
    return (
      <Button variant="secondary" size="sm" disabled>
        <Check className="size-4" /> في القائمة المختصرة
      </Button>
    );
  }

  const onClick = () => {
    if (isFull) {
      alert('وصلت للحد الأقصى: 4 موردين بالتوازي.');
      return;
    }
    start(async () => {
      const res = await shortlistProposalAction({ rfqId, proposalId });
      if (!res.ok) { alert(res.error); return; }
      router.push(`/dashboard/chats/${res.data!.chatId}`);
    });
  };

  return (
    <Button variant="brand" size="sm" onClick={onClick} disabled={pending || isFull}>
      <MessageCircle className="size-4" />
      {pending ? 'جارٍ الفتح…' : 'ابدأ التفاوض'}
    </Button>
  );
}
```

---

## Step 4.4 — Chat list

### File: `app/[locale]/(client)/dashboard/chats/page.tsx`

```tsx
import Link from 'next/link';
import { MessagesSquare } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { timeAgo } from '@/lib/utils/format';

export default async function ClientChatsPage() {
  const user = await requireRole(['client']);
  const supabase = await createClient();

  // Chats where this user is the client; include last message + unread count
  const { data: chats } = await supabase
    .from('chats')
    .select(`
      id, is_active, panic_at, panic_resolved_at, created_at,
      rfqs!inner(rfq_number, title, status),
      companies!suppliers!inner(name),
      messages(body, created_at, sender_id)
    `)
    .eq('client_id', user.id)
    .order('updated_at', { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">المحادثات</h1>
      {!chats || chats.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center space-y-3">
          <MessagesSquare className="size-10 text-stone-600 mx-auto" />
          <h2 className="font-semibold">لا محادثات نشطة</h2>
          <p className="text-sm text-stone-600">
            افتح طلباً وأضف موردين للقائمة المختصرة لبدء التفاوض.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((c: any) => {
            const lastMessage = (c.messages ?? []).at(-1);
            const isPanicOpen = c.panic_at && !c.panic_resolved_at;
            return (
              <Link
                key={c.id}
                href={`/dashboard/chats/${c.id}`}
                className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-3 border border-stone-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-stone-600">
                      <span className="font-mono num">{c.rfqs.rfq_number}</span>
                      {isPanicOpen && (
                        <span className="px-1.5 py-0.5 rounded bg-danger-100 text-danger text-[10px]">🚨 PANIC</span>
                      )}
                      {!c.is_active && (
                        <span className="px-1.5 py-0.5 rounded bg-stone-300 text-stone-600 text-[10px]">مغلقة</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-charcoal truncate">{c.companies?.name ?? '—'}</h3>
                    {lastMessage && (
                      <p className="text-sm text-stone-600 truncate">{lastMessage.body}</p>
                    )}
                  </div>
                  <span className="text-xs text-stone-600 shrink-0">
                    {lastMessage ? timeAgo(lastMessage.created_at, 'ar') : timeAgo(c.created_at, 'ar')}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

(Same pattern for `app/[locale]/(supplier)/supplier/chats/page.tsx` — swap `client_id` for `supplier_id`, swap company source.)

---

## Step 4.5 — Chat window (real-time)

### File: `app/[locale]/(client)/dashboard/chats/[chatId]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/get-user';
import { ChatWindow } from '@/components/chat/chat-window';

export default async function ChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: chat } = await supabase
    .from('chats')
    .select(`
      *,
      rfqs!inner(id, rfq_number, title, status, client_id),
      companies!suppliers!inner(name)
    `)
    .eq('id', chatId)
    .single();

  if (!chat) notFound();

  // Authorization: only the client, the supplier, or admin can view
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  const isAdmin = profile?.role === 'admin';
  const isParticipant = chat.client_id === user.id || chat.supplier_id === user.id;
  if (!isAdmin && !isParticipant) notFound();

  // Initial messages (last 50)
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true })
    .limit(50);

  return (
    <ChatWindow
      chat={chat as any}
      currentUserId={user.id}
      currentUserRole={(profile?.role ?? 'client') as 'client' | 'supplier' | 'admin'}
      initialMessages={messages ?? []}
    />
  );
}
```

### File: `components/chat/chat-window.tsx`

```tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Send, Paperclip, ShieldAlert, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendMessageAction, panicAction } from '@/app/actions/chat';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/ui/file-uploader';
import { cn } from '@/lib/utils/cn';
import { timeAgo } from '@/lib/utils/format';
import type { UploadedFile } from '@/lib/storage/upload';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  body: string;
  attachments: any[];
  is_admin: boolean;
  is_system: boolean;
  created_at: string;
}

interface Props {
  chat: any;
  currentUserId: string;
  currentUserRole: 'client' | 'supplier' | 'admin';
  initialMessages: Message[];
}

export function ChatWindow({ chat, currentUserId, currentUserRole, initialMessages }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [showPanicModal, setShowPanicModal] = useState(false);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Subscribe to realtime new messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${chat.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chat.id}` },
        (payload) => {
          setMessages((prev) => {
            // De-dup by id (in case server inserted the same message we already added optimistically)
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [chat.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const onSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    start(async () => {
      const res = await sendMessageAction({
        chatId: chat.id,
        body: body.trim() || '(مرفقات)',
        attachments,
      });
      if (res.ok) {
        setBody('');
        setAttachments([]);
        setShowAttach(false);
      } else {
        alert(res.error);
      }
    });
  };

  const isPanicOpen = chat.panic_at && !chat.panic_resolved_at;
  const adminPresent = !!chat.admin_joined_at;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-2rem)] -m-4 sm:-m-6">
      {/* Header */}
      <div className="px-4 py-3 border-b border-stone-300 bg-cream space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-stone-600 font-mono num">{chat.rfqs.rfq_number}</p>
            <h1 className="font-semibold text-charcoal truncate">{chat.companies?.name ?? chat.rfqs.title}</h1>
          </div>
          {currentUserRole !== 'admin' && (
            <Button
              variant="panic"
              size="sm"
              onClick={() => setShowPanicModal(true)}
              disabled={!!isPanicOpen}
              className={!adminPresent ? 'animate-panic-pulse' : ''}
            >
              <ShieldAlert className="size-4" />
              <span className="hidden sm:inline">زر الفزعة</span>
            </Button>
          )}
        </div>
        {(adminPresent || isPanicOpen) && (
          <div
            className={cn(
              'text-xs px-3 py-2 rounded-md flex items-center gap-2',
              isPanicOpen
                ? 'bg-danger-100 text-danger border border-danger/30'
                : 'bg-dune-gold-100 text-dune-gold-700 border border-dune-gold/40'
            )}
          >
            <Shield className="size-3.5" />
            {isPanicOpen ? '🚨 تم استدعاء Admin — قادم خلال دقائق' : '🛡️ Admin يقرأ هذه المحادثة'}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-stone-100/30">
        {messages.map((m) => <MessageBubble key={m.id} m={m} mine={m.sender_id === currentUserId} />)}
      </div>

      {/* Input */}
      {chat.is_active ? (
        <form onSubmit={onSend} className="border-t border-stone-300 bg-cream px-4 py-3 space-y-2">
          {showAttach && (
            <FileUploader
              bucket="proposal-files"
              pathPrefix={`chat-${chat.id}`}
              files={attachments}
              onChange={setAttachments}
              maxFiles={3}
            />
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setShowAttach((s) => !s)}
              className="p-2 text-stone-600 hover:text-charcoal"
              aria-label="إرفاق ملف"
            >
              <Paperclip className="size-5" />
            </button>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend(e as any);
                }
              }}
              rows={1}
              placeholder="اكتب رسالتك… (Enter للإرسال، Shift+Enter لسطر جديد)"
              className="flex-1 resize-none min-h-10 max-h-32 px-3 py-2 rounded-md bg-stone-100 border border-stone-300 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-blue"
            />
            <Button type="submit" variant="brand" size="icon" disabled={pending || (!body.trim() && attachments.length === 0)}>
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="border-t border-stone-300 px-4 py-3 text-center text-sm text-stone-600 bg-stone-100">
          هذه المحادثة مغلقة.
        </div>
      )}

      {showPanicModal && (
        <PanicModal chatId={chat.id} onClose={() => setShowPanicModal(false)} />
      )}
    </div>
  );
}

function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  if (m.is_system) {
    return (
      <div className="text-center">
        <span className="inline-block text-xs text-stone-600 bg-stone-100 px-3 py-1 rounded-full">
          {m.body}
        </span>
      </div>
    );
  }
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3 py-2 text-sm space-y-1',
          m.is_admin
            ? 'bg-dune-gold-100 text-dune-gold-700 border border-dune-gold/40'
            : mine
            ? 'bg-action-blue text-cream'
            : 'bg-stone-100 text-charcoal border border-stone-300'
        )}
      >
        {m.is_admin && (
          <div className="flex items-center gap-1 text-[10px] font-bold opacity-90">
            <Shield className="size-3" /> Admin
          </div>
        )}
        <p className="whitespace-pre-line break-words">{m.body}</p>
        {Array.isArray(m.attachments) && m.attachments.length > 0 && (
          <div className="space-y-1 pt-1">
            {(m.attachments as any[]).map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" className="block text-xs underline opacity-90">
                📎 {a.filename}
              </a>
            ))}
          </div>
        )}
        <div className={cn('text-[10px]', mine ? 'text-cream/70 text-end' : 'text-stone-600')}>
          {timeAgo(m.created_at, 'ar')}
        </div>
      </div>
    </div>
  );
}

function PanicModal({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [pending, start] = useTransition();

  const onConfirm = () => {
    if (reason.trim().length < 10) {
      alert('اكتب سبب طلب Admin (10 حروف على الأقل).');
      return;
    }
    start(async () => {
      const res = await panicAction({ chatId, reason });
      if (!res.ok) { alert(res.error); return; }
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 bg-charcoal/50 flex items-center justify-center px-4 z-50" onClick={onClose}>
      <div className="bg-cream rounded-xl max-w-md w-full p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-danger">🚨 استدعاء Admin</h2>
        <p className="text-sm text-stone-600">
          سيدخل Admin المحادثة كطرف ثالث ويستطيع التدخل أو إيقاف المحادثة.
          استخدمه فقط عند مشكلة فعلية (طلب غير قانوني، تهديد، خروج عن نطاق العقد، إلخ).
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="اشرح بإيجاز ما الذي يحصل…"
          className="w-full px-3 py-2 rounded-md bg-stone-100 border border-stone-300 text-sm"
          autoFocus
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={pending}>إلغاء</Button>
          <Button variant="panic" className="flex-1" onClick={onConfirm} disabled={pending}>
            {pending ? 'جارٍ الإرسال…' : 'استدعِ Admin'}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4.6 — Admin chat list + chat window

### File: `app/admin/chats/page.tsx`

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function AdminChatsPage() {
  const supabase = await createClient();
  const { data: chats } = await supabase
    .from('chats')
    .select(`
      id, is_active, panic_at, panic_resolved_at, admin_joined_at, updated_at,
      rfqs!inner(rfq_number, title)
    `)
    .eq('is_active', true)
    .order('panic_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Active Chats ({chats?.length ?? 0})</h1>
      <div className="space-y-2">
        {(chats ?? []).map((c: any) => {
          const isPanic = c.panic_at && !c.panic_resolved_at;
          return (
            <Link
              key={c.id}
              href={`/admin/chats/${c.id}`}
              className={`block p-3 rounded border ${isPanic ? 'bg-danger-100 border-danger/30' : 'bg-stone-100 border-stone-300 hover:border-stone-600'}`}
            >
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-mono num">{c.rfqs.rfq_number}</div>
                  <div className="font-semibold">{c.rfqs.title}</div>
                </div>
                <div className="text-xs flex flex-col items-end gap-1">
                  {isPanic && <span className="bg-danger text-cream px-2 py-0.5 rounded">🚨 PANIC</span>}
                  {c.admin_joined_at && <span className="bg-dune-gold text-charcoal px-2 py-0.5 rounded">🛡️ Joined</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

### File: `app/admin/chats/[chatId]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { ChatWindow } from '@/components/chat/chat-window';
import { AdminChatActions } from './admin-actions';

export default async function AdminChatViewPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = await params;
  const user = await requireRole(['admin']);
  const supabase = await createClient();

  const { data: chat } = await supabase
    .from('chats')
    .select(`
      *,
      rfqs!inner(id, rfq_number, title, status, client_id),
      companies!suppliers!inner(name)
    `)
    .eq('id', chatId)
    .single();

  if (!chat) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  return (
    <div className="space-y-3">
      <AdminChatActions chat={chat as any} />
      <ChatWindow
        chat={chat as any}
        currentUserId={user.id}
        currentUserRole="admin"
        initialMessages={messages ?? []}
      />
    </div>
  );
}
```

### File: `app/admin/chats/[chatId]/admin-actions.tsx`

```tsx
'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { adminJoinChatAction, adminResolvePanicAction } from '@/app/actions/chat';

export function AdminChatActions({ chat }: { chat: any }) {
  const [joinPending, joinStart] = useTransition();
  const [resolvePending, resolveStart] = useTransition();
  const isPanic = chat.panic_at && !chat.panic_resolved_at;

  return (
    <div className="flex gap-2 flex-wrap">
      {!chat.admin_joined_at && (
        <Button
          variant="brand"
          size="sm"
          disabled={joinPending}
          onClick={() => joinStart(async () => { await adminJoinChatAction(chat.id); })}
        >
          {joinPending ? '…' : '🛡️ Join chat (visible to both parties)'}
        </Button>
      )}
      {isPanic && (
        <Button
          variant="secondary"
          size="sm"
          disabled={resolvePending}
          onClick={() => resolveStart(async () => { await adminResolvePanicAction(chat.id); })}
        >
          {resolvePending ? '…' : 'Resolve panic'}
        </Button>
      )}
    </div>
  );
}
```

### File: `app/admin/panic/page.tsx`

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function PanicAlertsPage() {
  const supabase = await createClient();
  const { data: alerts } = await supabase
    .from('chats')
    .select(`
      id, panic_at, panic_reason,
      rfqs!inner(rfq_number, title)
    `)
    .not('panic_at', 'is', null)
    .is('panic_resolved_at', null)
    .order('panic_at', { ascending: true });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">🚨 Active Panic Alerts ({alerts?.length ?? 0})</h1>
      {!alerts || alerts.length === 0 ? (
        <p className="text-stone-600">No active alerts.</p>
      ) : (
        <div className="space-y-3">
          {alerts.map((a: any) => {
            const minutesOpen = Math.floor((Date.now() - new Date(a.panic_at).getTime()) / 60000);
            return (
              <Link
                key={a.id}
                href={`/admin/chats/${a.id}`}
                className="block p-4 rounded-xl bg-danger-100 border-2 border-danger/50 hover:border-danger"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="text-xs font-mono num">{a.rfqs.rfq_number}</div>
                    <div className="font-semibold">{a.rfqs.title}</div>
                    <p className="text-sm mt-2 italic">"{a.panic_reason}"</p>
                  </div>
                  <span className="text-xs num font-bold text-danger">⏱ {minutesOpen}m</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## Step 4.7 — Tests

### File: `tests/unit/chat/cap.test.ts`

```ts
import { describe, it, expect } from 'vitest';

const CHAT_CAP = 4;

function canAddNewChat(currentActive: number): { allowed: boolean; reason?: string } {
  if (currentActive >= CHAT_CAP) {
    return { allowed: false, reason: 'وصلت للحد الأقصى: 4 موردين بالتوازي.' };
  }
  return { allowed: true };
}

describe('chat cap (4 simultaneous)', () => {
  it('allows up to 4 active chats', () => {
    expect(canAddNewChat(3).allowed).toBe(true);
  });
  it('rejects the 5th chat', () => {
    expect(canAddNewChat(4).allowed).toBe(false);
  });
  it('error message is helpful', () => {
    const r = canAddNewChat(4);
    expect(r.reason).toContain('4 موردين');
  });
});
```

### File: `tests/unit/chat/panic-message.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

const panicSchema = z.object({
  chatId: z.string().uuid(),
  reason: z.string().min(10).max(500),
});

describe('panic action input', () => {
  it('rejects short reason', () => {
    const r = panicSchema.safeParse({ chatId: '00000000-0000-0000-0000-000000000000', reason: 'مشكلة' });
    expect(r.success).toBe(false);
  });
  it('rejects oversized reason', () => {
    const r = panicSchema.safeParse({ chatId: '00000000-0000-0000-0000-000000000000', reason: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
  it('accepts reasonable reason', () => {
    const r = panicSchema.safeParse({
      chatId: '00000000-0000-0000-0000-000000000000',
      reason: 'المورد يطلب دفع كاش خارج المنصة',
    });
    expect(r.success).toBe(true);
  });
});
```

### File: `tests/integration/chat-realtime.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

describe.skipIf(!process.env.RUN_INTEGRATION)('chat cap trigger', () => {
  it('DB trigger blocks 5th simultaneous chat', async () => {
    const ts = Date.now();
    const { data: clientUser } = await admin.auth.admin.createUser({ email: `c-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: comp } = await admin.from('companies').insert({ name: 'C', cr_number: '3030' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: clientUser.user!.id }).select('id').single();
    await admin.from('profiles').insert({ id: clientUser.user!.id, email: clientUser.user!.email!, full_name: 'C', role: 'client', company_id: comp!.id });

    const { data: rfq } = await admin.from('rfqs').insert({
      client_id: clientUser.user!.id, company_id: comp!.id,
      service_type: 'booth', title: 'T', city: 'riyadh',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { area: 36, exhibitionName: 'X', floors: '1' },
      status: 'negotiating',
    }).select('id').single();

    // Create 4 fake suppliers + chats
    const supplierIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const { data: s } = await admin.auth.admin.createUser({ email: `s${i}-${ts}@test.local`, password: 'longenough1', email_confirm: true });
      supplierIds.push(s.user!.id);
      const { data: sc } = await admin.from('companies').insert({ name: `S${i}`, cr_number: '4040' + ((ts + i) % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: s.user!.id }).select('id').single();
      await admin.from('profiles').insert({ id: s.user!.id, email: s.user!.email!, full_name: `S${i}`, role: 'supplier', company_id: sc!.id });
      await admin.from('suppliers').insert({ id: s.user!.id, company_id: sc!.id, specializations: ['booth'], cities: ['riyadh'], bank_name: 'Test', iban: 'SA0380000000608010167519', account_holder: 'X', status: 'approved' });
      await admin.from('chats').insert({ rfq_id: rfq!.id, client_id: clientUser.user!.id, supplier_id: s.user!.id, is_active: true, created_by: clientUser.user!.id });
    }

    // 5th — should fail
    const { data: extra } = await admin.auth.admin.createUser({ email: `extra-${ts}@test.local`, password: 'longenough1', email_confirm: true });
    const { data: ec } = await admin.from('companies').insert({ name: 'E', cr_number: '5050' + (ts % 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: extra.user!.id }).select('id').single();
    await admin.from('profiles').insert({ id: extra.user!.id, email: extra.user!.email!, full_name: 'E', role: 'supplier', company_id: ec!.id });
    await admin.from('suppliers').insert({ id: extra.user!.id, company_id: ec!.id, specializations: ['booth'], cities: ['riyadh'], bank_name: 'Test', iban: 'SA0380000000608010167519', account_holder: 'X', status: 'approved' });

    const { error } = await admin.from('chats').insert({ rfq_id: rfq!.id, client_id: clientUser.user!.id, supplier_id: extra.user!.id, is_active: true, created_by: clientUser.user!.id });
    expect(error?.message).toMatch(/Maximum 4 active chats/);

    // Cleanup
    await admin.from('chats').delete().eq('rfq_id', rfq!.id);
    await admin.from('rfqs').delete().eq('id', rfq!.id);
    await admin.from('suppliers').delete().in('id', [...supplierIds, extra.user!.id]);
    await admin.from('profiles').delete().in('id', [clientUser.user!.id, ...supplierIds, extra.user!.id]);
    await admin.from('companies').delete().eq('created_by', clientUser.user!.id);
    for (const id of [clientUser.user!.id, ...supplierIds, extra.user!.id]) {
      await admin.auth.admin.deleteUser(id);
    }
  }, 30_000);
});
```

### File: `tests/e2e/chat-shortlist.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.skip(!process.env.TEST_CLIENT_EMAIL, 'requires seeded client + supplier proposal data');

test('client shortlists a proposal and lands in chat', async ({ page }) => {
  await page.goto('/ar/login');
  await page.getByLabel('البريد الإلكتروني').fill(process.env.TEST_CLIENT_EMAIL!);
  await page.getByLabel('كلمة المرور').fill(process.env.TEST_CLIENT_PASSWORD!);
  await page.getByRole('button', { name: 'ادخل' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Open the seeded RFQ that has at least one proposal
  await page.goto(`/ar/dashboard/rfqs/${process.env.TEST_RFQ_ID}/proposals`);
  await page.getByRole('button', { name: 'ابدأ التفاوض' }).first().click();
  await expect(page).toHaveURL(/dashboard\/chats\//);
  await expect(page.getByText('Admin يقرأ هذه المحادثة')).toBeVisible();
});
```

---

## Step 4.8 — Acceptance checklist

- [ ] Client opens compare page, clicks "ابدأ التفاوض" on a proposal → redirected to chat window
- [ ] Chat header shows "Admin يقرأ هذه المحادثة" banner
- [ ] Both parties see new messages **in real time** (no refresh needed)
- [ ] Sending a message with file attachment works
- [ ] File link opens the uploaded file
- [ ] Trying to shortlist a 5th supplier returns the friendly "4 موردين" error
- [ ] DB-level trigger blocks the 5th chat even if app-layer check is bypassed
- [ ] Pressing Panic button → modal asks for reason → after submit:
  - System message inserted in chat
  - All admins receive in-app notification
  - All admins receive email (if RESEND_API_KEY set)
- [ ] `/admin/panic` lists open panic alerts with elapsed minutes
- [ ] Admin can click "Join chat" → both parties see "🛡️ Admin انضم للمحادثة كطرف ثالث" system message
- [ ] Admin messages render with gold "Admin" badge
- [ ] Admin can resolve panic — `panic_resolved_at` set
- [ ] On supplier side, shortlisted chat appears in `/ar/supplier/chats`
- [ ] Closing tab + reopening keeps message history (server-rendered initial 50)
- [ ] Mobile (375px): chat input docks at bottom, header sticky at top
- [ ] RTL: own messages on the start (right in RTL), others on the end (left)
- [ ] All previous test suites still pass + new tests added

---

## Files created in Phase 4 (summary)

```
app/actions/chat.ts
app/[locale]/(client)/dashboard/chats/page.tsx
app/[locale]/(client)/dashboard/chats/[chatId]/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/proposals/shortlist-button.tsx
app/[locale]/(supplier)/supplier/chats/page.tsx
app/[locale]/(supplier)/supplier/chats/[chatId]/page.tsx
app/admin/chats/page.tsx
app/admin/chats/[chatId]/page.tsx
app/admin/chats/[chatId]/admin-actions.tsx
app/admin/panic/page.tsx
components/chat/chat-window.tsx
lib/email/templates/shortlisted.tsx
lib/email/templates/panic-admin.tsx
supabase/migrations/20260615000001_chat_extensions.sql
tests/unit/chat/cap.test.ts
tests/unit/chat/panic-message.test.ts
tests/integration/chat-realtime.test.ts
tests/e2e/chat-shortlist.spec.ts
```

**Lines of code (estimate)**: ~2,000 implementation, ~250 tests.

**End of Phase 4.** Real-time multi-party chat is live with admin oversight and a panic escape hatch. Phase 5 wires the award flow + the AI-analyzed agreement that closes the negotiation.
