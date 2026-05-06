'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import type { ActionResult } from './auth';

export async function uploadInitialReceiptAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const escrowId = String(formData.get('escrowId') ?? '');
  const receiptUrl = String(formData.get('receiptUrl') ?? '').trim();
  if (!escrowId || !receiptUrl) {
    return { ok: false, error: 'رابط الإيصال مطلوب.' };
  }

  const admin = createAdminClient();
  const { data: txRowRaw } = await admin
    .from('escrow_transactions')
    .select('id, rfq_id, agreement_id, status, agreement:agreements (client_id)')
    .eq('id', escrowId)
    .single();
  const tx = txRowRaw as
    | { id: string; rfq_id: string; agreement_id: string; status: string; agreement: { client_id: string } | null }
    | null;
  if (!tx || tx.agreement?.client_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الإيداع.' };
  }
  if (tx.status !== 'awaiting_deposit') {
    return { ok: false, error: 'حالة الإيداع لا تسمح برفع إيصال جديد.' };
  }

  await admin
    .from('escrow_transactions')
    .update({
      initial_deposit_receipt_url: receiptUrl,
      initial_deposit_received_at: new Date().toISOString(),
      status: 'deposit_received',
    })
    .eq('id', escrowId);

  await admin.from('escrow_events').insert({
    escrow_id: escrowId,
    rfq_id: tx.rfq_id,
    event_type: 'deposit_receipt_uploaded',
    receipt_url: receiptUrl,
    actor_id: user.id,
    actor_role: 'client',
  });

  revalidatePath(`/dashboard/rfqs/${tx.rfq_id}/escrow`);
  return { ok: true };
}

export async function adminConfirmInitialDepositAction(
  escrowId: string
): Promise<ActionResult> {
  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: txRowRaw } = await admin
    .from('escrow_transactions')
    .select('id, rfq_id, status, initial_deposit')
    .eq('id', escrowId)
    .single();
  const tx = txRowRaw as
    | { id: string; rfq_id: string; status: string; initial_deposit: number }
    | null;
  if (!tx) return { ok: false, error: 'لم نجد الإيداع.' };
  if (tx.status !== 'deposit_received') {
    return { ok: false, error: 'حالة الإيداع لا تسمح بالتأكيد الآن.' };
  }

  await admin
    .from('escrow_transactions')
    .update({
      status: 'work_in_progress',
      initial_deposit_confirmed_by: user.id,
    })
    .eq('id', escrowId);

  await admin.from('escrow_events').insert({
    escrow_id: escrowId,
    rfq_id: tx.rfq_id,
    event_type: 'deposit_confirmed',
    amount: tx.initial_deposit,
    actor_id: user.id,
    actor_role: 'admin',
  });

  // Move RFQ to in_progress so the supplier can start work
  await admin.from('rfqs').update({ status: 'in_progress' }).eq('id', tx.rfq_id);

  revalidatePath('/admin/escrow/pending-deposits');
  revalidatePath(`/dashboard/rfqs/${tx.rfq_id}/escrow`);
  return { ok: true };
}

export async function submitDeliveryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const rfqId = String(formData.get('rfqId') ?? '');
  const notes = String(formData.get('notes') ?? '').trim();
  const photosRaw = String(formData.get('photos') ?? '[]');
  let photos: string[] = [];
  try {
    photos = JSON.parse(photosRaw);
  } catch {
    return { ok: false, error: 'الصور غير صحيحة.' };
  }
  if (!Array.isArray(photos) || photos.length === 0) {
    return { ok: false, error: 'يجب إرفاق صورة واحدة على الأقل لإثبات التسليم.' };
  }

  const admin = createAdminClient();

  // Verify the supplier owns the winning proposal on this RFQ
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, status, winning_proposal_id')
    .eq('id', rfqId)
    .single();
  const rfq = rfqRowRaw as { id: string; status: string; winning_proposal_id: string | null } | null;
  if (!rfq || !rfq.winning_proposal_id) return { ok: false, error: 'لم نجد المشروع.' };
  if (rfq.status !== 'in_progress') {
    return { ok: false, error: 'لا يمكن تسليم المشروع في حالته الحالية.' };
  }

  const { data: proposalRowRaw } = await admin
    .from('proposals')
    .select('id, supplier_id')
    .eq('id', rfq.winning_proposal_id)
    .single();
  const proposal = proposalRowRaw as { id: string; supplier_id: string } | null;

  const { data: supRowRaw } = await admin
    .from('suppliers')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  const sup = supRowRaw as { id: string } | null;

  if (!proposal || !sup || sup.id !== proposal.supplier_id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا المشروع.' };
  }

  const { data: agRowRaw } = await admin
    .from('agreements')
    .select('id')
    .eq('rfq_id', rfqId)
    .single();
  const ag = agRowRaw as { id: string } | null;
  if (!ag) return { ok: false, error: 'لم نجد الاتفاق.' };

  await admin.from('deliveries').insert({
    rfq_id: rfqId,
    agreement_id: ag.id,
    supplier_id: sup.id,
    delivery_notes: notes || null,
    delivery_photos: photos,
    delivered_at: new Date().toISOString(),
  });

  await admin.from('rfqs').update({ status: 'delivered' }).eq('id', rfqId);

  // Mark escrow delivered
  await admin
    .from('escrow_transactions')
    .update({ status: 'delivered' })
    .eq('rfq_id', rfqId);

  revalidatePath(`/supplier/projects/${rfqId}`);
  revalidatePath(`/dashboard/rfqs/${rfqId}/escrow`);
  return { ok: true };
}

export async function approveDeliveryAction(
  rfqId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  const { data: rfqRowRaw } = await admin
    .from('rfqs')
    .select('id, client_id, status')
    .eq('id', rfqId)
    .single();
  const rfq = rfqRowRaw as { id: string; client_id: string; status: string } | null;
  if (!rfq || rfq.client_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية.' };
  }
  if (rfq.status !== 'delivered') {
    return { ok: false, error: 'لا يمكن الاعتماد في الحالة الحالية.' };
  }

  await admin
    .from('deliveries')
    .update({
      client_approved: true,
      client_approved_at: new Date().toISOString(),
    })
    .eq('rfq_id', rfqId);

  await admin
    .from('escrow_transactions')
    .update({ status: 'final_payment' })
    .eq('rfq_id', rfqId);

  revalidatePath(`/dashboard/rfqs/${rfqId}`);
  return { ok: true };
}

export async function adminReleaseToSupplierAction(
  escrowId: string,
  payoutRef: string
): Promise<ActionResult> {
  if (!payoutRef || payoutRef.trim().length < 4) {
    return { ok: false, error: 'مرجع التحويل البنكي مطلوب.' };
  }
  const { user } = await requireRole(['admin']);
  const admin = createAdminClient();

  const { data: txRowRaw } = await admin
    .from('escrow_transactions')
    .select('id, rfq_id, status, supplier_net')
    .eq('id', escrowId)
    .single();
  const tx = txRowRaw as
    | { id: string; rfq_id: string; status: string; supplier_net: number }
    | null;
  if (!tx) return { ok: false, error: 'لم نجد الإيداع.' };
  if (tx.status !== 'final_payment') {
    return { ok: false, error: 'حالة الإيداع لا تسمح بالإفراج الآن.' };
  }

  await admin
    .from('escrow_transactions')
    .update({
      status: 'released',
      released_at: new Date().toISOString(),
      released_by: user.id,
      release_transaction_ref: payoutRef,
    })
    .eq('id', escrowId);

  await admin.from('escrow_events').insert({
    escrow_id: escrowId,
    rfq_id: tx.rfq_id,
    event_type: 'released_to_supplier',
    amount: tx.supplier_net,
    bank_reference: payoutRef,
    actor_id: user.id,
    actor_role: 'admin',
  });

  await admin.from('rfqs').update({ status: 'completed' }).eq('id', tx.rfq_id);

  revalidatePath('/admin/escrow/pending-releases');
  return { ok: true };
}
