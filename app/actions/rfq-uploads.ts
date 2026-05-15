'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { recordAudit } from '@/lib/audit/record';
import {
  RFQ_ATTACHMENTS_BUCKET,
  RFQ_ATTACHMENT_MAX_BYTES,
  RFQ_ATTACHMENT_MIME_EXT,
  RFQ_ATTACHMENT_KINDS,
  type RfqAttachmentKind,
} from '@/lib/storage/rfq-attachments';
import type { ActionResult } from './auth';

function isRfqAttachmentKind(v: string): v is RfqAttachmentKind {
  return (RFQ_ATTACHMENT_KINDS as string[]).includes(v);
}

export interface UploadedRfqAttachment {
  path: string;
  kind: RfqAttachmentKind;
  filename: string;
  contentType: string;
  sizeBytes: number;
}

export async function uploadRfqAttachmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult<UploadedRfqAttachment>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const kindRaw = (formData.get('kind') ?? '').toString();
  if (!isRfqAttachmentKind(kindRaw)) {
    return { ok: false, error: 'نوع الملف غير معروف (logo أو attachment).' };
  }
  const kind = kindRaw;

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'يرجى اختيار ملف للرفع.' };
  }
  if (file.size > RFQ_ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: 'حجم الملف يتجاوز الحد الأقصى (10 ميغابايت).' };
  }
  const ext = RFQ_ATTACHMENT_MIME_EXT[file.type];
  if (!ext) {
    return {
      ok: false,
      error: 'الصيغة غير مدعومة. اقبل PDF أو JPG أو PNG أو WebP فقط.',
    };
  }

  // Verify the user is actually a client — only clients create RFQs.
  const admin = createAdminClient();
  const { data: profileRaw } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const profile = profileRaw as { role: string } | null;
  if (!profile || profile.role !== 'client') {
    return { ok: false, error: 'هذه العملية متاحة للعملاء فقط.' };
  }

  // Embed a slug of the original filename in the path so the supplier-side
  // display layer can reconstruct a friendly name without hitting any extra
  // storage metadata API. Strip the extension, lowercase, replace non-alnum
  // with hyphens, truncate.
  const stem = file.name.replace(/\.[^.]+$/, '');
  const slug =
    stem
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9؀-ۿ]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'file';
  const path = `${user.id}/${kind}-${Date.now()}-${slug}.${ext}`;

  const { error: uploadErr } = await admin.storage
    .from(RFQ_ATTACHMENTS_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: 'فشل رفع الملف. حاول مرة أخرى.' };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'client',
    action: 'rfq_attachment_uploaded',
    resourceType: 'storage_object',
    resourceId: path,
    metadata: {
      kind,
      bucket: RFQ_ATTACHMENTS_BUCKET,
      filename: file.name,
      size_bytes: file.size,
      content_type: file.type,
    },
  });

  return {
    ok: true,
    data: {
      path,
      kind,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    },
  };
}

/**
 * Remove an attachment previously uploaded by the current client. Used when
 * the user removes a file from the wizard before submitting the RFQ.
 */
export async function deleteRfqAttachmentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const path = (formData.get('path') ?? '').toString();
  if (!path) return { ok: false, error: 'مسار الملف مطلوب.' };

  // Path must be inside the user's own folder.
  if (!path.startsWith(`${user.id}/`)) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الملف.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.storage.from(RFQ_ATTACHMENTS_BUCKET).remove([path]);
  if (error) {
    return { ok: false, error: 'فشل حذف الملف.' };
  }

  return { ok: true };
}
