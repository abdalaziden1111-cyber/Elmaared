'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAudit } from '@/lib/audit/record';
import type { ActionResult } from './auth';

// Statuses that block cancellation (terminal or already-cancelled).
const RFQ_TERMINAL_STATUSES = ['completed', 'cancelled'] as const;

// Valid status values an admin can override to. Mirrors the rfq_status enum.
const RFQ_OVERRIDE_STATUSES = [
  'draft',
  'open',
  'negotiating',
  'awarded',
  'in_escrow',
  'in_progress',
  'delivered',
  'completed',
  'disputed',
  'cancelled',
] as const;
type RfqOverrideStatus = (typeof RFQ_OVERRIDE_STATUSES)[number];

export async function approveSupplierAction(supplierId: string): Promise<ActionResult> {
  const { user } = await requireRole(['admin']);

  const admin = createAdminClient();

  const { error } = await admin
    .from('suppliers')
    .update({
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', supplierId);

  if (error) {
    return { ok: false, error: 'فشل في اعتماد المورد. حاول مرة أخرى.' };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'approve_supplier',
    resourceType: 'supplier',
    resourceId: supplierId,
  });

  revalidatePath('/admin/suppliers/pending');
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// CANCEL RFQ
// ───────────────────────────────────────────────────────────
// Cancels an RFQ at any non-terminal status. If an active escrow exists,
// flips it to 'refunded' so the funds path is unambiguously closed —
// the actual money movement is handled out-of-band by ops.
export async function cancelRfqAction(
  rfqId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return { ok: false, error: 'سبب الإلغاء يجب أن يكون 10 أحرف على الأقل.' };
  }

  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('id, status')
    .eq('id', rfqId)
    .maybeSingle();
  const rfq = rfqRaw as { id: string; status: string } | null;
  if (!rfq) return { ok: false, error: 'لم نجد الطلب.' };
  if (RFQ_TERMINAL_STATUSES.includes(rfq.status as 'completed' | 'cancelled')) {
    return { ok: false, error: 'الطلب في حالة نهائية لا يمكن إلغاؤها.' };
  }

  const { data: txRaw } = await admin
    .from('escrow_transactions')
    .select('id, status')
    .eq('rfq_id', rfqId)
    .maybeSingle();
  const tx = txRaw as { id: string; status: string } | null;

  // If there's an active escrow (not already released/refunded), mark refunded
  // and emit an event for ops to reconcile.
  const activeEscrowStatuses = [
    'awaiting_deposit',
    'deposit_received',
    'work_in_progress',
    'delivered',
    'final_payment',
  ];
  if (tx && activeEscrowStatuses.includes(tx.status)) {
    await admin
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: `rfq_cancelled: ${reason.trim()}`,
      })
      .eq('id', tx.id);

    await admin.from('escrow_events').insert({
      escrow_id: tx.id,
      rfq_id: rfqId,
      event_type: 'refund_initiated',
      actor_id: user.id,
      actor_role: 'admin',
    });
  }

  const { error: rfqErr } = await admin
    .from('rfqs')
    .update({ status: 'cancelled' })
    .eq('id', rfqId);
  if (rfqErr) return { ok: false, error: 'فشل في إلغاء الطلب.' };

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'cancel_rfq',
    resourceType: 'rfq',
    resourceId: rfqId,
    metadata: {
      reason: reason.trim(),
      previous_status: rfq.status,
      escrow_refunded: tx && activeEscrowStatuses.includes(tx.status),
    },
  });

  revalidatePath('/admin/rfqs');
  revalidatePath(`/admin/rfqs/${rfqId}`);
  revalidatePath('/dashboard/rfqs');
  revalidatePath(`/dashboard/rfqs/${rfqId}`);
  revalidatePath('/supplier/rfqs');
  revalidatePath(`/supplier/rfqs/${rfqId}`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// ARCHIVE CHAT
// ───────────────────────────────────────────────────────────
export async function archiveChatAction(chatId: string): Promise<ActionResult> {
  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: chatRaw } = await admin
    .from('chats')
    .select('id, rfq_id, is_archived')
    .eq('id', chatId)
    .maybeSingle();
  const chat = chatRaw as { id: string; rfq_id: string; is_archived: boolean } | null;
  if (!chat) return { ok: false, error: 'لم نجد المحادثة.' };
  if (chat.is_archived) return { ok: false, error: 'المحادثة مؤرشفة بالفعل.' };

  const { error } = await admin
    .from('chats')
    .update({ is_archived: true })
    .eq('id', chatId);
  if (error) return { ok: false, error: 'فشل في أرشفة المحادثة.' };

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'archive_chat',
    resourceType: 'chat',
    resourceId: chatId,
    metadata: { rfq_id: chat.rfq_id },
  });

  revalidatePath('/admin/chats');
  revalidatePath(`/admin/chats/${chatId}`);
  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// OVERRIDE RFQ STATUS (last-resort recovery)
// ───────────────────────────────────────────────────────────
// Admin can force any RFQ to any valid status. Requires a 20+ char reason
// so future-us can understand why the override happened.
export async function overrideRfqStatusAction(
  rfqId: string,
  newStatus: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 20) {
    return {
      ok: false,
      error: 'سبب التعديل يجب أن يكون 20 حرفاً على الأقل.',
    };
  }
  if (!RFQ_OVERRIDE_STATUSES.includes(newStatus as RfqOverrideStatus)) {
    return { ok: false, error: 'الحالة المطلوبة غير صالحة.' };
  }

  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: rfqRaw } = await admin
    .from('rfqs')
    .select('id, status')
    .eq('id', rfqId)
    .maybeSingle();
  const rfq = rfqRaw as { id: string; status: string } | null;
  if (!rfq) return { ok: false, error: 'لم نجد الطلب.' };
  if (rfq.status === newStatus) {
    return { ok: false, error: 'الطلب بالفعل في هذه الحالة.' };
  }

  const { error } = await admin
    .from('rfqs')
    .update({ status: newStatus })
    .eq('id', rfqId);
  if (error) return { ok: false, error: 'فشل في تعديل الحالة.' };

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'override_rfq_status',
    resourceType: 'rfq',
    resourceId: rfqId,
    metadata: {
      previous_status: rfq.status,
      new_status: newStatus,
      reason: reason.trim(),
    },
  });

  revalidatePath('/admin/rfqs');
  revalidatePath(`/admin/rfqs/${rfqId}`);
  return { ok: true };
}

export async function rejectSupplierAction(
  supplierId: string,
  reason: string
): Promise<ActionResult> {
  if (!reason || reason.trim().length < 10) {
    return { ok: false, error: 'سبب الرفض يجب أن يكون 10 أحرف على الأقل.' };
  }

  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { error } = await admin
    .from('suppliers')
    .update({
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: reason,
    })
    .eq('id', supplierId);

  if (error) return { ok: false, error: 'فشل في رفض المورد.' };

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'admin',
    action: 'reject_supplier',
    resourceType: 'supplier',
    resourceId: supplierId,
    metadata: { reason },
  });

  revalidatePath('/admin/suppliers/pending');
  return { ok: true };
}
