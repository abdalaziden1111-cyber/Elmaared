'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  loginSchema,
  signupClientSchema,
  signupSupplierSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from '@/schemas/auth';
import { getDashboardPath } from '@/lib/auth/permissions';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { normalizeSaudiPhone } from '@/lib/utils/phone';
import { recordAudit } from '@/lib/audit/record';
import type { Database } from '@/lib/supabase/types';

type UserRole = Database['public']['Enums']['user_role'];

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

// ───────────────────────────────────────────────────────────
// LOGIN
// ───────────────────────────────────────────────────────────
export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { ok: false, error: 'بيانات الدخول غير صحيحة. تحقق من البريد وكلمة المرور.' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'فشل في جلب بيانات المستخدم.' };

  const { data: profileRaw } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const profile = profileRaw as { role: UserRole } | null;
  if (!profile) return { ok: false, error: 'لم نجد ملفك الشخصي. تواصل مع Admin.' };

  redirect(getDashboardPath(profile.role));
}

// ───────────────────────────────────────────────────────────
// SIGN UP CLIENT
// ───────────────────────────────────────────────────────────
export async function signupClientAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // Canonicalize phone before validation so users can enter local-format
  // (0512..., +966 51 234 5678, etc.) and our regex schema still passes.
  const phoneInput = formData.get('phone');
  const normalizedPhone =
    typeof phoneInput === 'string' ? normalizeSaudiPhone(phoneInput) : null;

  const parsed = signupClientSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    phone: normalizedPhone ?? phoneInput,
    companyName: formData.get('companyName'),
    legalName: formData.get('legalName') || undefined,
    crNumber: formData.get('crNumber'),
    vatNumber: formData.get('vatNumber') || undefined,
    size: formData.get('size'),
    industry: formData.get('industry') || undefined,
    city: formData.get('city'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: { full_name: parsed.data.fullName, role: 'client' },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { ok: false, error: 'هذا البريد مسجّل بالفعل. سجّل دخولك أو استخدم بريداً آخر.' };
    }
    return { ok: false, error: 'حدث خطأ في إنشاء الحساب. حاول مرة أخرى.' };
  }

  // 1. Create profile (must come first for RLS / company.owner_id FK)
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    role: 'client',
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: 'فشل في إنشاء الملف الشخصي.' };
  }

  // 2. Create company
  const { data: companyRaw, error: companyError } = await admin
    .from('companies')
    .insert({
      owner_id: authData.user.id,
      name: parsed.data.companyName,
      legal_name: parsed.data.legalName,
      cr_number: parsed.data.crNumber,
      vat_number: parsed.data.vatNumber,
      size: parsed.data.size,
      industry: parsed.data.industry,
      city: parsed.data.city,
    })
    .select('id')
    .single();
  const company = companyRaw as { id: string } | null;

  if (companyError || !company) {
    // Roll back the auth user + profile to keep the row counts consistent
    await admin.from('profiles').delete().eq('id', authData.user.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    const friendly = mapPostgresError(companyError, 'تسجيل بيانات الشركة');
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: authData.user.id,
    actorRole: 'client',
    action: 'signup_client',
    resourceType: 'profile',
    resourceId: authData.user.id,
    metadata: { company_id: company.id },
  });

  return { ok: true, data: { redirectTo: '/auth/verify-email' } };
}

// ───────────────────────────────────────────────────────────
// SIGN UP SUPPLIER
// ───────────────────────────────────────────────────────────
export async function signupSupplierAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const specializationsRaw = formData.get('specializations');
  const citiesRaw = formData.get('cities');

  let specializations: string[] = [];
  let cities: string[] = [];
  try {
    specializations = specializationsRaw
      ? JSON.parse(specializationsRaw as string)
      : [];
    cities = citiesRaw ? JSON.parse(citiesRaw as string) : [];
  } catch {
    return { ok: false, error: 'بيانات التخصصات أو المدن غير صحيحة.' };
  }

  const phoneInput = formData.get('phone');
  const normalizedPhone =
    typeof phoneInput === 'string' ? normalizeSaudiPhone(phoneInput) : null;

  const parsed = signupSupplierSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: formData.get('fullName'),
    phone: normalizedPhone ?? phoneInput,
    companyName: formData.get('companyName'),
    legalName: formData.get('legalName') || undefined,
    crNumber: formData.get('crNumber'),
    vatNumber: formData.get('vatNumber') || undefined,
    specializations,
    cities,
    bio: formData.get('bio') || undefined,
    website: formData.get('website') || '',
    bankName: formData.get('bankName') || undefined,
    iban: formData.get('iban') || '',
    accountHolderName: formData.get('accountHolderName') || undefined,
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      data: { full_name: parsed.data.fullName, role: 'supplier' },
    },
  });

  if (authError || !authData.user) {
    if (authError?.message?.includes('already registered')) {
      return { ok: false, error: 'هذا البريد مسجّل بالفعل.' };
    }
    return { ok: false, error: 'حدث خطأ في إنشاء الحساب.' };
  }

  // 1. Create profile (supplier role)
  const { error: profileError } = await admin.from('profiles').insert({
    id: authData.user.id,
    full_name: parsed.data.fullName,
    phone: parsed.data.phone,
    role: 'supplier',
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    return { ok: false, error: 'فشل في إنشاء الملف الشخصي.' };
  }

  // 2. Create supplier (status: pending_review)
  const { error: supplierError } = await admin.from('suppliers').insert({
    owner_id: authData.user.id,
    company_name: parsed.data.companyName,
    legal_name: parsed.data.legalName,
    cr_number: parsed.data.crNumber,
    vat_number: parsed.data.vatNumber,
    status: 'pending_review',
    specializations: parsed.data.specializations,
    cities: parsed.data.cities,
    bio: parsed.data.bio,
    website: parsed.data.website || null,
    bank_name: parsed.data.bankName,
    iban: parsed.data.iban || null,
    account_holder_name: parsed.data.accountHolderName,
  });

  if (supplierError) {
    await admin.from('profiles').delete().eq('id', authData.user.id);
    await admin.auth.admin.deleteUser(authData.user.id);
    const friendly = mapPostgresError(supplierError, 'تسجيل بيانات المورد');
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: authData.user.id,
    actorRole: 'supplier',
    action: 'signup_supplier',
    resourceType: 'supplier',
    resourceId: authData.user.id,
    metadata: {
      specializations: parsed.data.specializations,
      cities: parsed.data.cities,
    },
  });

  return { ok: true, data: { redirectTo: '/auth/verify-email' } };
}

// ───────────────────────────────────────────────────────────
// LOGOUT
// ───────────────────────────────────────────────────────────
export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}

// ───────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ───────────────────────────────────────────────────────────
export async function forgotPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });

  return { ok: true };
}

// ───────────────────────────────────────────────────────────
// UPDATE PASSWORD
// ───────────────────────────────────────────────────────────
export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, error: 'فشل في تحديث كلمة المرور. حاول مرة أخرى.' };

  return { ok: true, data: { redirectTo: '/login' } };
}
