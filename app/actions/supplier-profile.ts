'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateSupplierProfileSchema } from '@/schemas/supplier';
import { recordAudit } from '@/lib/audit/record';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import type { ActionResult } from '@/app/actions/auth';

type FormSnapshot = Record<string, unknown>;

function intOrUndef(v: FormDataEntryValue | null): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function updateSupplierProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const parsed = updateSupplierProfileSchema.safeParse({
    companyName: formData.get('companyName'),
    legalName: (formData.get('legalName') ?? '').toString() || undefined,
    vatNumber: (formData.get('vatNumber') ?? '').toString() || undefined,
    bio: (formData.get('bio') ?? '').toString() || undefined,
    website: (formData.get('website') ?? '').toString() || undefined,
    teamSize: intOrUndef(formData.get('teamSize')),
    yearsOfExperience: intOrUndef(formData.get('yearsOfExperience')),
    minOrderValue: intOrUndef(formData.get('minOrderValue')),
    specializations: formData.getAll('specializations'),
    cities: formData.getAll('cities'),
    bankName: (formData.get('bankName') ?? '').toString() || undefined,
    iban: (formData.get('iban') ?? '').toString() || undefined,
    accountHolderName:
      (formData.get('accountHolderName') ?? '').toString() || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'بيانات غير صحيحة. راجع الحقول المظللة.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const admin = createAdminClient();

  const { data: currentRaw } = await admin
    .from('suppliers')
    .select(
      'id, owner_id, status, company_name, legal_name, vat_number, bio, website, team_size, years_of_experience, min_order_value, specializations, cities, bank_name, iban, account_holder_name'
    )
    .eq('owner_id', user.id)
    .single();
  const current = currentRaw as
    | (FormSnapshot & {
        id: string;
        owner_id: string;
        status: string;
        bank_name: string | null;
        iban: string | null;
        account_holder_name: string | null;
      })
    | null;

  if (!current) return { ok: false, error: 'لم نجد ملف المورد.' };
  if (current.owner_id !== user.id) {
    return { ok: false, error: 'ليس لديك صلاحية على هذا الملف.' };
  }

  // Bank info changes trigger re-review: status → pending_review.
  const bankChanged =
    (parsed.data.bankName ?? '') !== (current.bank_name ?? '') ||
    (parsed.data.iban ?? '') !== (current.iban ?? '') ||
    (parsed.data.accountHolderName ?? '') !== (current.account_holder_name ?? '');

  const nextStatus = bankChanged && current.status === 'approved'
    ? 'pending_review'
    : current.status;

  const update = {
    company_name: parsed.data.companyName,
    legal_name: parsed.data.legalName || null,
    vat_number: parsed.data.vatNumber || null,
    bio: parsed.data.bio || null,
    website: parsed.data.website || null,
    team_size: parsed.data.teamSize ?? null,
    years_of_experience: parsed.data.yearsOfExperience ?? null,
    min_order_value: parsed.data.minOrderValue ?? null,
    specializations: parsed.data.specializations,
    cities: parsed.data.cities,
    bank_name: parsed.data.bankName || null,
    iban: parsed.data.iban || null,
    account_holder_name: parsed.data.accountHolderName || null,
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  const { error } = await admin
    .from('suppliers')
    .update(update)
    .eq('id', current.id);

  if (error) {
    const friendly = mapPostgresError(error);
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'supplier',
    action: bankChanged ? 'supplier_profile_bank_changed' : 'supplier_profile_updated',
    resourceType: 'supplier',
    resourceId: current.id,
    metadata: {
      bank_changed: bankChanged,
      status_changed: bankChanged && current.status === 'approved',
      previous_status: current.status,
      next_status: nextStatus,
    },
  });

  revalidatePath('/supplier/profile/portfolio');
  revalidatePath('/supplier/profile/edit');
  if (bankChanged && current.status === 'approved') {
    revalidatePath('/admin/suppliers/pending');
  }

  return {
    ok: true,
    data: {
      bankChanged,
      statusFlipped: bankChanged && current.status === 'approved',
    },
  };
}
