'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  updateClientProfileSchema,
  updateClientCompanySchema,
} from '@/schemas/profile';
import { normalizeSaudiPhone } from '@/lib/utils/phone';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { recordAudit } from '@/lib/audit/record';
import type { ActionResult } from '@/app/actions/auth';

export async function updateClientProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const phoneInput = formData.get('phone');
  const normalizedPhone =
    typeof phoneInput === 'string' ? normalizeSaudiPhone(phoneInput) : null;

  const parsed = updateClientProfileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: normalizedPhone ?? phoneInput,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'بيانات غير صحيحة. راجع الحقول المظللة.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    const friendly = mapPostgresError(error);
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'client',
    action: 'client_profile_updated',
    resourceType: 'profile',
    resourceId: user.id,
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings/profile');
  return { ok: true };
}

export async function updateClientCompanyAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const parsed = updateClientCompanySchema.safeParse({
    companyName: formData.get('companyName'),
    legalName: (formData.get('legalName') ?? '').toString() || undefined,
    crNumber: formData.get('crNumber'),
    vatNumber: (formData.get('vatNumber') ?? '').toString() || undefined,
    size: formData.get('size'),
    industry: (formData.get('industry') ?? '').toString() || undefined,
    city: formData.get('city'),
    address: (formData.get('address') ?? '').toString() || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'بيانات غير صحيحة. راجع الحقول المظللة.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();
  const { data: companyRaw } = await admin
    .from('companies')
    .select('id, owner_id')
    .eq('owner_id', user.id)
    .single();
  const company = companyRaw as { id: string; owner_id: string } | null;
  if (!company) return { ok: false, error: 'لم نجد ملف الشركة.' };
  if (company.owner_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الملف.' };
  }

  const { error } = await admin
    .from('companies')
    .update({
      name: parsed.data.companyName,
      legal_name: parsed.data.legalName || null,
      cr_number: parsed.data.crNumber,
      vat_number: parsed.data.vatNumber || null,
      size: parsed.data.size,
      industry: parsed.data.industry || null,
      city: parsed.data.city,
      address: parsed.data.address || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.id);

  if (error) {
    const friendly = mapPostgresError(error);
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'client',
    action: 'client_company_updated',
    resourceType: 'company',
    resourceId: company.id,
  });

  revalidatePath('/dashboard/settings/company');
  return { ok: true };
}
