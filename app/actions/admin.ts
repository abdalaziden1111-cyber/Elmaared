'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/require-role';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAudit } from '@/lib/audit/record';
import type { ActionResult } from './auth';

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
