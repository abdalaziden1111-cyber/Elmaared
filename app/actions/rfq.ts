'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { safeAfter } from '@/lib/utils/safe-after';
import { createAdminClient } from '@/lib/supabase/admin';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';
import { sendEmail } from '@/lib/email/resend';
import { rfqMatchEmail } from '@/lib/email/templates';
import { mapPostgresError } from '@/lib/utils/postgres-errors';
import { recordAudit } from '@/lib/audit/record';
import {
  filterMatchingSuppliers,
  type MatchCandidate,
} from '@/lib/matching/suppliers';
import type { ActionResult } from './auth';

type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';

const SERVICE_AR: Record<ServiceType, string> = {
  booth: 'تصميم وتنفيذ أجنحة',
  gifts: 'هدايا ترويجية',
  event: 'تنظيم فعاليات',
  printing: 'مطبوعات',
};

interface CreateRfqInput {
  serviceType: ServiceType;
  title: string;
  description?: string;
  exhibitionName?: string;
  exhibitionCity?: string;
  exhibitionDate?: string;
  deliveryLocation?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  proposalsDeadline?: string | null;
  details: Record<string, unknown>;
  publishImmediately?: boolean;
}

const SERVICE_DETAILS_SCHEMAS = {
  booth: boothDetailsSchema,
  gifts: giftsDetailsSchema,
  event: eventDetailsSchema,
  printing: printingDetailsSchema,
} as const;

export async function createRfqAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const payloadRaw = formData.get('payload');
  if (typeof payloadRaw !== 'string') {
    return { ok: false, error: 'بيانات الطلب غير صحيحة.' };
  }

  let input: CreateRfqInput;
  try {
    input = JSON.parse(payloadRaw) as CreateRfqInput;
  } catch {
    return { ok: false, error: 'فشل في قراءة بيانات الطلب.' };
  }

  // Service-specific validation
  const detailsSchema = SERVICE_DETAILS_SCHEMAS[input.serviceType];
  if (!detailsSchema) {
    return { ok: false, error: 'نوع خدمة غير معروف.' };
  }
  const detailsParsed = detailsSchema.safeParse(input.details);
  if (!detailsParsed.success) {
    return {
      ok: false,
      error: 'تفاصيل الطلب ناقصة أو غير صحيحة.',
      fieldErrors: detailsParsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  if (!input.title || input.title.trim().length < 5) {
    return { ok: false, error: 'عنوان الطلب يجب أن يكون 5 أحرف على الأقل.' };
  }

  // Look up the company
  const { data: companyRaw } = await supabase
    .from('companies')
    .select('id')
    .eq('owner_id', user.id)
    .single();
  const company = companyRaw as { id: string } | null;
  if (!company) return { ok: false, error: 'لم نجد الشركة المرتبطة بحسابك.' };

  const status = input.publishImmediately ? 'open' : 'draft';

  const admin = createAdminClient();
  const { data: rfqRaw, error: rfqError } = await admin
    .from('rfqs')
    .insert({
      client_id: user.id,
      company_id: company.id,
      service_type: input.serviceType,
      title: input.title,
      description: input.description ?? null,
      details: input.details,
      exhibition_name: input.exhibitionName ?? null,
      exhibition_city: input.exhibitionCity ?? null,
      exhibition_date: input.exhibitionDate ?? null,
      delivery_location: input.deliveryLocation ?? null,
      budget_min: input.budgetMin ?? null,
      budget_max: input.budgetMax ?? null,
      proposals_deadline: input.proposalsDeadline ?? null,
      status,
    })
    .select('id, rfq_number, exhibition_city, proposals_deadline')
    .single();
  const rfq = rfqRaw as
    | { id: string; rfq_number: string; exhibition_city: string | null; proposals_deadline: string | null }
    | null;

  if (rfqError || !rfq) {
    const friendly = mapPostgresError(rfqError, 'حفظ الطلب');
    return { ok: false, error: friendly.messageAr };
  }

  await recordAudit(admin, {
    actorId: user.id,
    actorRole: 'client',
    action: status === 'open' ? 'rfq_published' : 'rfq_drafted',
    resourceType: 'rfq',
    resourceId: rfq.id,
  });

  // Fan out emails to matching suppliers — fire-and-forget but logged
  // via safeAfter so any send failure surfaces in the structured logger.
  if (status === 'open') {
    safeAfter(
      'rfq_match_fanout',
      () =>
        fanoutRfqMatchEmails({
          rfqId: rfq.id,
          rfqNumber: rfq.rfq_number,
          serviceType: input.serviceType,
          city: rfq.exhibition_city,
          budgetMin: input.budgetMin ?? null,
          budgetMax: input.budgetMax ?? null,
          deadline: rfq.proposals_deadline,
        }),
      { rfq_id: rfq.id }
    );
  }

  revalidatePath('/dashboard/rfqs');
  revalidatePath('/supplier/rfqs');
  return { ok: true, data: { rfqId: rfq.id, rfqNumber: rfq.rfq_number } };
}

async function fanoutRfqMatchEmails(args: {
  rfqId: string;
  rfqNumber: string;
  serviceType: ServiceType;
  city: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  deadline: string | null;
}) {
  const admin = createAdminClient();

  // Pull approved suppliers whose specializations contain the service type
  // and (if RFQ has a city) whose cities contain the RFQ's city.
  const { data: matchesRaw } = await admin
    .from('suppliers')
    .select('id, owner_id, company_name, cities, specializations')
    .eq('status', 'approved')
    .contains('specializations', [args.serviceType]);

  const matches = (matchesRaw ?? []) as MatchCandidate[];

  const filtered = filterMatchingSuppliers(matches, {
    serviceType: args.serviceType,
    city: args.city,
  });
  if (filtered.length === 0) return;

  // Look up emails via auth.admin
  const emailLookups = await Promise.allSettled(
    filtered.map(async (s) => {
      const { data } = await admin.auth.admin.getUserById(s.owner_id);
      return { supplier: s, email: data.user?.email ?? null };
    })
  );

  const budgetRange =
    args.budgetMin && args.budgetMax
      ? `${args.budgetMin.toLocaleString('en')}–${args.budgetMax.toLocaleString('en')} ﷼`
      : args.budgetMax
      ? `حتى ${args.budgetMax.toLocaleString('en')} ﷼`
      : null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const rfqUrl = `${baseUrl}/ar/supplier/rfqs/${args.rfqId}`;
  const deadline = args.deadline
    ? new Date(args.deadline).toLocaleDateString('ar-SA')
    : 'لم يُحدّد';

  await Promise.allSettled(
    emailLookups.map(async (result) => {
      if (result.status !== 'fulfilled' || !result.value.email) return;
      const { supplier, email } = result.value;
      const { subject, html } = rfqMatchEmail({
        supplierName: supplier.company_name,
        rfqNumber: args.rfqNumber,
        serviceTypeAr: SERVICE_AR[args.serviceType],
        city: args.city ?? 'غير محدد',
        budgetRange,
        deadline,
        rfqUrl,
      });
      await sendEmail({ to: email, subject, html });
    })
  );
}

export async function publishRfqAction(rfqId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'يجب تسجيل الدخول.' };

  const admin = createAdminClient();
  const { data: rfqRaw, error } = await admin
    .from('rfqs')
    .update({ status: 'open' })
    .eq('id', rfqId)
    .eq('client_id', user.id)
    .select('id, rfq_number, service_type, exhibition_city, proposals_deadline, budget_min, budget_max')
    .single();
  const rfq = rfqRaw as
    | {
        id: string;
        rfq_number: string;
        service_type: ServiceType;
        exhibition_city: string | null;
        proposals_deadline: string | null;
        budget_min: number | null;
        budget_max: number | null;
      }
    | null;

  if (error || !rfq) return { ok: false, error: 'فشل في نشر الطلب.' };

  safeAfter(
    'rfq_match_fanout',
    () =>
      fanoutRfqMatchEmails({
        rfqId: rfq.id,
        rfqNumber: rfq.rfq_number,
        serviceType: rfq.service_type,
        city: rfq.exhibition_city,
        budgetMin: rfq.budget_min,
        budgetMax: rfq.budget_max,
        deadline: rfq.proposals_deadline,
      }),
    { rfq_id: rfq.id }
  );

  revalidatePath(`/dashboard/rfqs/${rfqId}`);
  revalidatePath('/supplier/rfqs');
  return { ok: true };
}

export async function redirectAfterRfqCreate(rfqId: string): Promise<never> {
  redirect(`/dashboard/rfqs/${rfqId}`);
}
