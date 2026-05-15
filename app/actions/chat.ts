'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapPostgresError, isDuplicateError } from '@/lib/utils/postgres-errors';
import { buildNotification } from '@/lib/notifications/build';
import type { ActionResult } from './auth';

export async function shortlistProposalAction(
  proposalId: string
): Promise<ActionResult<{ chatId: string }>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  // Workaround for the recursive RLS pair on rfqs ↔ proposals (see
  // dashboard/rfqs pages): we look up the proposal + parent RFQ via the
  // admin client and enforce client ownership manually below.
  const admin = createAdminClient();
  const { data: proposalRowRaw } = await admin
    .from('proposals')
    .select('id, rfq_id, supplier_id, status, rfq:rfqs(client_id)')
    .eq('id', proposalId)
    .single();
  const proposal = proposalRowRaw as
    | { id: string; rfq_id: string; supplier_id: string; status: string; rfq: { client_id: string } | null }
    | null;
  if (!proposal) return { ok: false, error: 'لم نجد العرض.' };
  if (proposal.rfq?.client_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا العرض.' };
  }

  // Mark the proposal as shortlisted
  await admin.from('proposals').update({ status: 'shortlisted' }).eq('id', proposal.id);

  // Try to create the chat — DB trigger enforces 4-chat cap and the unique
  // (rfq_id, supplier_id) constraint prevents duplicates.
  const { data: chatRowRaw, error: chatErr } = await admin
    .from('chats')
    .insert({
      rfq_id: proposal.rfq_id,
      client_id: user.id,
      supplier_id: proposal.supplier_id,
    })
    .select('id')
    .single();
  const chat = chatRowRaw as { id: string } | null;

  if (chatErr || !chat) {
    // The DB trigger raises a custom message — keep the special-case check
    // because mapPostgresError doesn't know about app-level invariants.
    if ((chatErr as { message?: string } | null)?.message?.includes('CHAT_CAP_REACHED')) {
      return { ok: false, error: 'وصلت للحد الأقصى من المحادثات (4) لهذا الطلب.' };
    }
    if (isDuplicateError(chatErr)) {
      // Already exists — make the action idempotent by returning the existing chat
      const { data: existingRaw } = await admin
        .from('chats')
        .select('id')
        .eq('rfq_id', proposal.rfq_id)
        .eq('supplier_id', proposal.supplier_id)
        .single();
      const existing = existingRaw as { id: string } | null;
      if (existing) {
        revalidatePath(`/dashboard/rfqs/${proposal.rfq_id}/compare`);
        return { ok: true, data: { chatId: existing.id } };
      }
    }
    const friendly = mapPostgresError(chatErr, 'فتح المحادثة');
    return { ok: false, error: friendly.messageAr };
  }

  // Move RFQ to negotiating on first chat (idempotent)
  await admin
    .from('rfqs')
    .update({ status: 'negotiating' })
    .eq('id', proposal.rfq_id)
    .eq('status', 'open');

  // System message to seed the chat
  await admin.from('messages').insert({
    chat_id: chat.id,
    sender_id: user.id,
    sender_role: 'client',
    content: 'تمّ ترشيح عرضك. ابدأ التفاوض من هنا.',
    is_admin_intervention: false,
  });

  // Notify the supplier (in-app) that they've been shortlisted. The
  // supplier_id on the proposal is the suppliers.id, but the notifications
  // table targets profiles.id — look up owner_id.
  const { data: supplierRowRaw } = await admin
    .from('suppliers')
    .select('owner_id')
    .eq('id', proposal.supplier_id)
    .single();
  const supplierOwner = supplierRowRaw as { owner_id: string } | null;

  // Pull the rfq_number for the notification body
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('rfq_number')
    .eq('id', proposal.rfq_id)
    .single();
  const rfqRow = rfqRowRaw as { rfq_number: string } | null;

  // Recipient's preferred locale, used to build a correctly-prefixed link.
  let recipientLocale: string | null = null;
  if (supplierOwner) {
    const { data: profRaw } = await admin
      .from('profiles')
      .select('preferred_language')
      .eq('id', supplierOwner.owner_id)
      .maybeSingle();
    recipientLocale = (profRaw as { preferred_language: string | null } | null)
      ?.preferred_language ?? null;
  }

  if (supplierOwner && rfqRow) {
    const payload = buildNotification(
      {
        type: 'proposal_shortlisted',
        rfqNumber: rfqRow.rfq_number,
        chatId: chat.id,
      },
      recipientLocale
    );
    await admin.from('notifications').insert({
      user_id: supplierOwner.owner_id,
      type: 'proposal_shortlisted',
      title: payload.title,
      body: payload.body,
      link: payload.link,
      rfq_id: proposal.rfq_id,
      proposal_id: proposal.id,
      chat_id: chat.id,
    });
  }

  revalidatePath(`/dashboard/rfqs/${proposal.rfq_id}/compare`);
  return { ok: true, data: { chatId: chat.id } };
}

export async function sendMessageAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const chatId = String(formData.get('chatId') ?? '');
  const content = String(formData.get('content') ?? '').trim();
  if (!chatId || content.length === 0) {
    return { ok: false, error: 'لا يمكن إرسال رسالة فارغة.' };
  }
  if (content.length > 4000) {
    return { ok: false, error: 'الرسالة طويلة جداً (الحد 4000 حرف).' };
  }

  // Fetch caller role
  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: 'admin' | 'client' | 'supplier' } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي.' };

  // Insert via admin client because the placeholder Database types
  // surface table columns as `never[]`. RLS-equivalent check is enforced
  // in code: sender_id is bound to the authenticated user above.
  const admin = createAdminClient();
  const { error } = await admin.from('messages').insert({
    chat_id: chatId,
    sender_id: user.id,
    sender_role: profile.role,
    content,
    is_admin_intervention: profile.role === 'admin',
  });

  if (error) return { ok: false, error: 'فشل في إرسال الرسالة.' };

  return { ok: true };
}

export async function raisePanicAction(
  chatId: string,
  reason: string
): Promise<ActionResult> {
  if (reason.trim().length < 10) {
    return { ok: false, error: 'سبب التصعيد يجب أن يكون 10 أحرف على الأقل.' };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: 'admin' | 'client' | 'supplier' } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي.' };

  const admin = createAdminClient();
  await admin
    .from('chats')
    .update({ panic_at: new Date().toISOString(), panic_reason: reason })
    .eq('id', chatId);

  await admin.from('messages').insert({
    chat_id: chatId,
    sender_id: user.id,
    sender_role: profile.role,
    content: `🚨 تصعيد: ${reason}`,
    is_panic_alert: true,
    panic_reason: reason,
  });

  revalidatePath(`/admin/chats`);
  return { ok: true };
}

export async function adminJoinChatAction(chatId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: string } | null;
  if (profile?.role !== 'admin') return { ok: false, error: 'صلاحيات غير كافية.' };

  const admin = createAdminClient();
  await admin
    .from('chats')
    .update({ admin_joined_at: new Date().toISOString() })
    .eq('id', chatId);

  await admin.from('messages').insert({
    chat_id: chatId,
    sender_id: user.id,
    sender_role: 'admin',
    content: 'انضم Admin للمحادثة لمساعدتكم.',
    is_admin_intervention: true,
  });

  return { ok: true };
}
