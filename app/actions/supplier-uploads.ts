'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAudit } from '@/lib/audit/record';
import {
  SUPPLIER_DOCS_BUCKET,
  SUPPLIER_DOC_COLUMN,
  type SupplierDocField,
} from '@/lib/storage/supplier-docs';
import type { ActionResult } from './auth';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const ALLOWED_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};
const VALID_FIELDS: SupplierDocField[] = ['cr', 'vat', 'portfolio'];

function isSupplierDocField(v: string): v is SupplierDocField {
  return (VALID_FIELDS as string[]).includes(v);
}

export async function uploadSupplierDocAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const fieldRaw = (formData.get('field') ?? '').toString();
  if (!isSupplierDocField(fieldRaw)) {
    return { ok: false, error: 'نوع المستند غير معروف.' };
  }
  const field = fieldRaw;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'يرجى اختيار ملف للرفع.' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'حجم الملف يتجاوز الحد الأقصى (10 ميغابايت).' };
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return {
      ok: false,
      error: 'الصيغة غير مدعومة. اقبل PDF أو JPG أو PNG فقط.',
    };
  }

  const admin = createAdminClient();

  const { data: supplierRaw } = await admin
    .from('suppliers')
    .select('id, owner_id, status')
    .eq('owner_id', user.id)
    .maybeSingle();
  const supplier = supplierRaw as
    | { id: string; owner_id: string; status: string }
    | null;
  if (!supplier) return { ok: false, error: 'لم نجد ملف المورد.' };
  if (supplier.owner_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الملف.' };
  }

  const ext = ALLOWED_EXT[file.type] ?? 'bin';
  const path = `${user.id}/${field}-${Date.now()}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(SUPPLIER_DOCS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: 'فشل رفع الملف. حاول مرة أخرى.' };
  }

  const column = SUPPLIER_DOC_COLUMN[field];

  const { error: updateErr } = await admin
    .from('suppliers')
    .update({ [column]: path, updated_at: new Date().toISOString() })
    .eq('id', supplier.id);
  if (updateErr) {
    // Cleanup orphaned upload — best-effort, swallow errors.
    await admin.storage.from(SUPPLIER_DOCS_BUCKET).remove([path]);
    return { ok: false, error: 'فشل تحديث الملف بعد الرفع.' };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'supplier',
    action: 'supplier_doc_uploaded',
    resourceType: 'supplier',
    resourceId: supplier.id,
    metadata: {
      field,
      path,
      size_bytes: file.size,
      content_type: file.type,
    },
  });

  revalidatePath('/supplier/profile/portfolio');
  revalidatePath('/supplier/profile/edit');
  revalidatePath('/admin/suppliers/pending');

  return { ok: true, data: { field, path } };
}
