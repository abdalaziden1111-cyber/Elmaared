# Phase 2 — RFQ Creation & Discovery (Weeks 5-6)

> **Goal**: A client can create an RFQ for any of the 4 service types. Approved suppliers matching the RFQ are notified by email and in-app, and can open the full RFQ details to decide if they'll bid.

> **Prerequisite**: Phase 1 complete. Auth + role-based dashboards work. Supplier approval flow works.

---

## What this phase delivers

By end of Week 6:

1. `/[locale]/dashboard/rfqs/new` — 4-step RFQ wizard (service type → details → files → review).
2. Service-type forms: **booth, gifts, event, printing**, each with their own validation.
3. File upload to Supabase Storage with progress + size limits.
4. `/[locale]/dashboard/rfqs` — list of client's RFQs (draft + open).
5. `/[locale]/dashboard/rfqs/[id]` — RFQ details page.
6. `/[locale]/discover` and `/[locale]/discover/[id]` — supplier directory + public profile.
7. `/[locale]/supplier/rfqs` — list of RFQs matching this supplier's specializations + cities.
8. `/[locale]/supplier/rfqs/[id]` — RFQ details for supplier (read-only, no proposal yet).
9. Resend email on RFQ publish: every matching supplier gets `rfq-match.tsx` email.
10. In-app notifications for matching suppliers.
11. Settings pages: `/[locale]/dashboard/settings/profile` + `/[locale]/dashboard/settings/company` (and supplier equivalents).
12. ~30 new unit + integration tests + 2 E2E tests.

---

## Step 2.1 — Resend setup + email templates

Add Resend dependency:

```bash
pnpm add resend react-email
pnpm add -D @react-email/components
```

### File: `lib/email/resend.ts`

```ts
import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey && process.env.NODE_ENV === 'production') {
  throw new Error('RESEND_API_KEY missing in production');
}

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL = process.env.EMAIL_FROM ?? 'noreply@app-exhibition.sa';
export const FROM_NAME = 'تطبيق المعارض';

export async function sendEmail({
  to,
  subject,
  react,
  replyTo,
}: {
  to: string | string[];
  subject: string;
  react: React.ReactElement;
  replyTo?: string;
}) {
  if (!resend) {
    console.log('[email] (no RESEND_API_KEY) Would send:', subject, 'to', to);
    return { id: 'dev-mode', skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: Array.isArray(to) ? to : [to],
    subject,
    react,
    replyTo,
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`Email failed: ${error.message}`);
  }

  return { id: data?.id, skipped: false };
}
```

### File: `lib/email/templates/_shared.tsx`

```tsx
import { Html, Head, Body, Container, Section, Text, Hr } from '@react-email/components';
import type { ReactNode } from 'react';

const styles = {
  body: { backgroundColor: '#FAF8F4', fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 },
  container: { maxWidth: '560px', margin: '40px auto', padding: '24px', backgroundColor: '#F2EEE7', borderRadius: '12px' },
  brand: { fontSize: '14px', fontWeight: 700 as const, color: '#0E3B43', marginBottom: '16px' },
  h1: { fontSize: '20px', fontWeight: 700 as const, color: '#0E3B43', margin: '0 0 12px 0' },
  text: { fontSize: '14px', lineHeight: 1.6, color: '#1A1A1A', margin: '0 0 12px 0' },
  ctaWrap: { textAlign: 'center' as const, padding: '16px 0' },
  cta: {
    display: 'inline-block',
    padding: '10px 20px',
    backgroundColor: '#0E3B43',
    color: '#FAF8F4',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600 as const,
  },
  hr: { borderColor: '#D8D2C7', margin: '20px 0' },
  footer: { fontSize: '12px', color: '#7A766F', textAlign: 'center' as const },
};

export function EmailLayout({ preview, children }: { preview: string; children: ReactNode }) {
  return (
    <Html dir="rtl" lang="ar">
      <Head>
        <meta name="x-apple-disable-message-reformatting" />
      </Head>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.brand}>تطبيق المعارض</Text>
          {children}
          <Hr style={styles.hr} />
          <Text style={styles.footer}>
            وصلتك هذه الرسالة لأنك مسجّل في تطبيق المعارض.
            <br />
            لتعديل تفضيلات الإشعارات: <a href="https://app-exhibition.sa/dashboard/settings/notifications">إعدادات الإشعارات</a>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = styles;
```

### File: `lib/email/templates/rfq-match.tsx`

```tsx
import { Section, Text } from '@react-email/components';
import { EmailLayout, emailStyles as s } from './_shared';

interface Props {
  supplierName: string;
  rfqNumber: string;
  serviceType: string;
  city: string;
  budgetRange: string | null;
  deadline: string;
  rfqUrl: string;
  hoursToRespond: number;
}

export default function RfqMatchEmail({
  supplierName, rfqNumber, serviceType, city, budgetRange, deadline, rfqUrl, hoursToRespond,
}: Props) {
  return (
    <EmailLayout preview={`طلب جديد يطابق تخصصك (${rfqNumber})`}>
      <Text style={s.h1}>طلب جديد يناسب خبرتك</Text>
      <Text style={s.text}>مرحباً {supplierName},</Text>
      <Text style={s.text}>
        وصلنا طلب RFQ جديد يطابق تخصصاتك. تفاصيل سريعة:
      </Text>
      <Section style={{ backgroundColor: '#FAF8F4', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
        <Row label="رقم الطلب" value={rfqNumber} />
        <Row label="نوع الخدمة" value={serviceType} />
        <Row label="المدينة" value={city} />
        <Row label="الميزانية" value={budgetRange ?? 'لم تُحدد'} />
        <Row label="آخر موعد" value={deadline} />
      </Section>
      <Text style={s.text}>
        <strong>بقي {hoursToRespond} ساعة</strong> لتقديم عرضك. كلما تقدّمت أسرع، كلما زادت فرصك.
      </Text>
      <Section style={s.ctaWrap}>
        <a href={rfqUrl} style={s.cta}>افتح الطلب وقدّم عرضك ←</a>
      </Section>
    </EmailLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '13px' }}>
      <span style={{ color: '#7A766F' }}>{label}</span>
      <span style={{ color: '#1A1A1A', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
```

### File: `lib/email/send-rfq-match.ts`

```ts
import { sendEmail } from './resend';
import RfqMatchEmail from './templates/rfq-match';
import { createAdminClient } from '@/lib/supabase/admin';

interface RfqMatchPayload {
  rfqId: string;
  supplierIds: string[];
}

export async function sendRfqMatchNotifications({ rfqId, supplierIds }: RfqMatchPayload) {
  if (supplierIds.length === 0) return;

  const admin = createAdminClient();
  const { data: rfq } = await admin
    .from('rfqs')
    .select('rfq_number, service_type, city, budget_min, budget_max, deadline')
    .eq('id', rfqId)
    .single();

  if (!rfq) return;

  const { data: suppliers } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', supplierIds);

  if (!suppliers) return;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app-exhibition.sa';
  const rfqUrl = `${baseUrl}/ar/supplier/rfqs/${rfqId}`;
  const deadline = new Date(rfq.deadline);
  const now = new Date();
  const hoursToRespond = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 3_600_000));
  const budgetRange =
    rfq.budget_min && rfq.budget_max
      ? `${rfq.budget_min.toLocaleString('en')}–${rfq.budget_max.toLocaleString('en')} ﷼`
      : null;

  // Fan-out: parallel sends, but don't block the request more than 3s
  await Promise.allSettled(
    suppliers.map((s) =>
      sendEmail({
        to: s.email,
        subject: `طلب جديد يطابق تخصصك (${rfq.rfq_number})`,
        react: RfqMatchEmail({
          supplierName: s.full_name ?? 'مرحباً',
          rfqNumber: rfq.rfq_number,
          serviceType: rfq.service_type,
          city: rfq.city,
          budgetRange,
          deadline: deadline.toLocaleDateString('ar-SA'),
          rfqUrl,
          hoursToRespond,
        }),
      })
    )
  );

  // In-app notifications (one batch insert)
  await admin.from('notifications').insert(
    suppliers.map((s) => ({
      user_id: s.id,
      type: 'rfq_match' as const,
      title: 'طلب جديد يناسب خبرتك',
      body: `${rfq.service_type} · ${rfq.city} · ${budgetRange ?? 'الميزانية غير محددة'}`,
      link: `/supplier/rfqs/${rfqId}`,
    }))
  );
}
```

---

## Step 2.2 — File upload helper

### File: `lib/storage/upload.ts`

```ts
import { createClient } from '@/lib/supabase/client';

export interface UploadOptions {
  bucket: 'rfq-files' | 'proposal-files' | 'delivery-photos' | 'receipts' | 'portfolio';
  path: string; // relative to bucket root, e.g. `rfq/${rfqId}/${filename}`
  file: File;
  onProgress?: (pct: number) => void;
}

export interface UploadedFile {
  path: string;
  url: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50MB
export const ALLOWED_MIME = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export async function uploadFile({ bucket, path, file, onProgress }: UploadOptions): Promise<UploadedFile> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('الملف أكبر من 50MB. اضغطه أو قسّمه ثم حاول مرة أخرى.');
  }
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`نوع الملف غير مدعوم: ${file.type}`);
  }

  const supabase = createClient();
  // Supabase JS upload doesn't expose progress on the standard upload — for true progress
  // use the resumable Tus client. For Phase 2 we accept "indeterminate" progress.
  onProgress?.(10);
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw new Error(`فشل رفع الملف: ${error.message}`);
  onProgress?.(100);

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    path: data.path,
    url: urlData.publicUrl,
    filename: file.name,
    sizeBytes: file.size,
    mimeType: file.type,
  };
}

export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient();
  await supabase.storage.from(bucket).remove([path]);
}
```

### File: `components/ui/file-uploader.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { uploadFile, type UploadedFile } from '@/lib/storage/upload';
import { cn } from '@/lib/utils/cn';

interface Props {
  bucket: 'rfq-files' | 'proposal-files' | 'delivery-photos' | 'receipts' | 'portfolio';
  pathPrefix: string;
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
  accept?: string;
  label?: string;
}

export function FileUploader({
  bucket, pathPrefix, files, onChange, maxFiles = 10, accept, label,
}: Props) {
  const [uploading, setUploading] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList) return;
    setError(null);
    const newFiles = Array.from(fileList);

    if (files.length + newFiles.length > maxFiles) {
      setError(`الحد الأقصى ${maxFiles} ملفات.`);
      return;
    }

    const uploaded: UploadedFile[] = [];
    for (const file of newFiles) {
      const id = `${file.name}-${Date.now()}`;
      setUploading((u) => [...u, id]);
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${pathPrefix}/${Date.now()}_${safeName}`;
        const result = await uploadFile({ bucket, path, file });
        uploaded.push(result);
      } catch (e: any) {
        setError(e.message ?? 'فشل رفع الملف.');
      } finally {
        setUploading((u) => u.filter((x) => x !== id));
      }
    }
    onChange([...files, ...uploaded]);
  };

  const removeFile = (path: string) => {
    onChange(files.filter((f) => f.path !== path));
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-charcoal">{label}</label>}

      <label
        className={cn(
          'flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed border-stone-300 bg-stone-100 hover:border-action-blue transition-colors cursor-pointer',
          uploading.length > 0 && 'opacity-50 pointer-events-none'
        )}
      >
        {uploading.length > 0 ? (
          <Loader2 className="size-6 text-action-blue animate-spin" />
        ) : (
          <Upload className="size-6 text-stone-600" />
        )}
        <span className="text-sm text-stone-600">
          اضغط لاختيار الملفات (PDF, صور, Word, Excel — حتى 50MB لكل ملف)
        </span>
        <input
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={uploading.length > 0}
        />
      </label>

      {error && <p className="text-xs text-danger">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => {
            const isImage = f.mimeType.startsWith('image/');
            return (
              <li key={f.path} className="flex items-center gap-2 px-3 py-2 bg-cream border border-stone-300 rounded-md">
                {isImage ? <ImageIcon className="size-4 text-stone-600" /> : <FileText className="size-4 text-stone-600" />}
                <span className="flex-1 text-sm text-charcoal truncate">{f.filename}</span>
                <span className="text-xs text-stone-600 num">{(f.sizeBytes / 1024 / 1024).toFixed(2)}MB</span>
                <button
                  type="button"
                  onClick={() => removeFile(f.path)}
                  className="text-stone-600 hover:text-danger"
                  aria-label={`حذف ${f.filename}`}
                >
                  <X className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

---

## Step 2.3 — Storage buckets and RLS

### File: `supabase/migrations/20260516000001_storage_buckets.sql`

```sql
-- RFQ files: clients upload, suppliers in matching specialization can read
INSERT INTO storage.buckets (id, name, public) VALUES
  ('rfq-files', 'rfq-files', false),
  ('proposal-files', 'proposal-files', false),
  ('delivery-photos', 'delivery-photos', true),
  ('receipts', 'receipts', false),
  ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects
CREATE POLICY "rfq_files_owner_can_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'rfq-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "rfq_files_authenticated_can_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'rfq-files'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "portfolio_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_supplier_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND auth.user_role() = 'supplier'
  );

CREATE POLICY "delivery_photos_public_read" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'delivery-photos');

CREATE POLICY "delivery_photos_supplier_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'delivery-photos'
    AND auth.user_role() = 'supplier'
  );

CREATE POLICY "receipts_owner_only" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'receipts' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'receipts' AND owner = auth.uid());

CREATE POLICY "proposal_files_authenticated" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'proposal-files')
  WITH CHECK (bucket_id = 'proposal-files');
```

> Production note: tighten `rfq_files_authenticated_can_read` to filter by RFQ ownership / supplier match. For Phase 2 we ship the permissive version and revisit before launch.

---

## Step 2.4 — RFQ creation Server Action

### File: `app/actions/rfq.ts`

```ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireRole } from '@/lib/auth/require-role';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';
import { sendRfqMatchNotifications } from '@/lib/email/send-rfq-match';

export type ActionResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const baseRfqSchema = z.object({
  serviceType: z.enum(['booth', 'gifts', 'event', 'printing']),
  title: z.string().min(10, 'العنوان قصير جداً').max(140),
  city: z.string().min(2),
  deadline: z.string().refine((v) => new Date(v) > new Date(), 'تاريخ التسليم يجب أن يكون في المستقبل'),
  budgetMin: z.coerce.number().nonnegative().optional().nullable(),
  budgetMax: z.coerce.number().nonnegative().optional().nullable(),
  details: z.unknown(), // validated per service-type below
  files: z.array(z.object({
    path: z.string(),
    url: z.string(),
    filename: z.string(),
    sizeBytes: z.number(),
    mimeType: z.string(),
  })).default([]),
});

function validateDetails(serviceType: string, details: unknown) {
  switch (serviceType) {
    case 'booth': return boothDetailsSchema.safeParse(details);
    case 'gifts': return giftsDetailsSchema.safeParse(details);
    case 'event': return eventDetailsSchema.safeParse(details);
    case 'printing': return printingDetailsSchema.safeParse(details);
    default: return { success: false as const, error: { flatten: () => ({ fieldErrors: { serviceType: ['غير معروف'] } }) } };
  }
}

export async function createRfqAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const user = await requireRole(['client']);
  const parsed = baseRfqSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Validation failed',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const detailsParsed = validateDetails(parsed.data.serviceType, parsed.data.details);
  if (!detailsParsed.success) {
    return {
      ok: false,
      error: 'تفاصيل الخدمة غير مكتملة',
      fieldErrors: detailsParsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  if (
    parsed.data.budgetMin != null &&
    parsed.data.budgetMax != null &&
    parsed.data.budgetMin > parsed.data.budgetMax
  ) {
    return { ok: false, error: 'الحد الأدنى للميزانية أكبر من الحد الأقصى.' };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  // Get the user's company_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return { ok: false, error: 'لم نجد بيانات شركتك. أكمل ملفك أولاً.' };
  }

  const { data: rfq, error } = await supabase
    .from('rfqs')
    .insert({
      client_id: user.id,
      company_id: profile.company_id,
      service_type: parsed.data.serviceType,
      title: parsed.data.title,
      city: parsed.data.city,
      deadline: parsed.data.deadline,
      budget_min: parsed.data.budgetMin,
      budget_max: parsed.data.budgetMax,
      details: detailsParsed.data,
      files: parsed.data.files,
      status: 'open', // skip 'draft' for MVP — wizard always publishes
      published_at: new Date().toISOString(),
    })
    .select('id, rfq_number, service_type, city')
    .single();

  if (error || !rfq) {
    console.error('createRfq error:', error);
    return { ok: false, error: 'فشل في إنشاء الطلب. حاول مرة أخرى.' };
  }

  // Audit
  await admin.from('audit_logs').insert({
    user_id: user.id,
    action: 'create_rfq',
    resource_type: 'rfq',
    resource_id: rfq.id,
    metadata: { service_type: rfq.service_type, city: rfq.city },
  });

  // Match suppliers (specialization + city overlap, status=approved)
  // The DB trigger from Phase 0 (notify_matching_suppliers) handles in-app notifications,
  // but we also send emails here for MVP simplicity.
  const { data: matchingSuppliers } = await admin
    .from('suppliers')
    .select('id')
    .eq('status', 'approved')
    .contains('specializations', [rfq.service_type])
    .contains('cities', [rfq.city]);

  const supplierIds = (matchingSuppliers ?? []).map((s) => s.id);

  // Fire-and-forget: don't block the redirect on email fan-out
  sendRfqMatchNotifications({ rfqId: rfq.id, supplierIds }).catch((e) =>
    console.error('rfq-match emails failed:', e)
  );

  revalidatePath('/dashboard/rfqs');
  return { ok: true, data: { id: rfq.id } };
}
```

---

## Step 2.5 — RFQ Wizard

### File: `lib/stores/rfq-wizard-store.ts`

```ts
import { create } from 'zustand';
import type { UploadedFile } from '@/lib/storage/upload';

type ServiceType = 'booth' | 'gifts' | 'event' | 'printing';

interface RfqWizardState {
  serviceType: ServiceType | null;
  title: string;
  city: string;
  deadline: string;
  budgetMin: string;
  budgetMax: string;
  details: Record<string, unknown>;
  files: UploadedFile[];
  setField: <K extends keyof RfqWizardState>(key: K, value: RfqWizardState[K]) => void;
  setDetail: (key: string, value: unknown) => void;
  reset: () => void;
}

const initial = {
  serviceType: null as ServiceType | null,
  title: '', city: '', deadline: '', budgetMin: '', budgetMax: '',
  details: {} as Record<string, unknown>,
  files: [] as UploadedFile[],
};

export const useRfqWizardStore = create<RfqWizardState>((set) => ({
  ...initial,
  setField: (key, value) => set({ [key]: value } as never),
  setDetail: (key, value) =>
    set((state) => ({ details: { ...state.details, [key]: value } })),
  reset: () => set(initial),
}));
```

### File: `app/[locale]/(client)/dashboard/rfqs/new/layout.tsx`

```tsx
import type { ReactNode } from 'react';

export default function NewRfqLayout({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto space-y-6">{children}</div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/new/page.tsx` (Step 1: pick service type)

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { Tag, Gift, CalendarDays, Printer } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const STEPS = [
  { label: 'النوع' },
  { label: 'التفاصيل' },
  { label: 'الملفات' },
  { label: 'المراجعة' },
];

const ICONS = { booth: Tag, gifts: Gift, event: CalendarDays, printing: Printer };

export default function NewRfqStep1Page() {
  const router = useRouter();
  const store = useRfqWizardStore();

  const onSelect = (type: 'booth' | 'gifts' | 'event' | 'printing') => {
    store.setField('serviceType', type);
    store.setField('details', {});
    router.push('/dashboard/rfqs/new/details');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={1} />
      <div>
        <h1 className="text-xl font-semibold text-midnight-green">ما الذي تحتاجه؟</h1>
        <p className="text-sm text-stone-600 mt-1">اختر نوع الخدمة لنرسل طلبك للموردين المناسبين فقط.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {SERVICE_TYPES.map((s) => {
          const Icon = ICONS[s.value as keyof typeof ICONS];
          const active = store.serviceType === s.value;
          return (
            <button
              key={s.value}
              onClick={() => onSelect(s.value as any)}
              className={cn(
                'p-4 text-start rounded-xl border-2 transition-colors',
                active
                  ? 'border-midnight-green bg-midnight-green-100'
                  : 'border-stone-300 bg-stone-100 hover:border-stone-600'
              )}
            >
              <Icon className="size-6 text-midnight-green mb-2" />
              <div className="font-semibold text-charcoal">{s.ar}</div>
              <div className="text-xs text-stone-600 mt-1">{s.description}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}
```

### File: `lib/constants/service-types.ts` — extend with descriptions

```ts
export const SERVICE_TYPES = [
  { value: 'booth', ar: 'تصميم وتنفيذ جناح', en: 'Booth design & build', description: 'تصميم، إنشاء، تجهيز جناحك في المعرض' },
  { value: 'gifts', ar: 'هدايا ترويجية', en: 'Promotional gifts', description: 'هدايا للزوار، عملاء، حضور الفعالية' },
  { value: 'event', ar: 'تنظيم فعالية', en: 'Event organization', description: 'إدارة فعالية كاملة من البداية للنهاية' },
  { value: 'printing', ar: 'طباعة وتصميم', en: 'Print & design', description: 'بروشورات، روول-أب، كتالوجات، كروت' },
] as const;
```

### File: `app/[locale]/(client)/dashboard/rfqs/new/details/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { CITIES } from '@/lib/constants/cities';
import { BoothDetailsForm } from '@/components/rfq/forms/booth-form';
import { GiftsDetailsForm } from '@/components/rfq/forms/gifts-form';
import { EventDetailsForm } from '@/components/rfq/forms/event-form';
import { PrintingDetailsForm } from '@/components/rfq/forms/printing-form';

const STEPS = [{ label: 'النوع' }, { label: 'التفاصيل' }, { label: 'الملفات' }, { label: 'المراجعة' }];

export default function NewRfqDetailsPage() {
  const router = useRouter();
  const store = useRfqWizardStore();

  useEffect(() => {
    if (!store.serviceType) router.replace('/dashboard/rfqs/new');
  }, [store.serviceType, router]);

  if (!store.serviceType) return null;

  const onNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!store.title || !store.city || !store.deadline) {
      alert('أكمل الحقول المطلوبة');
      return;
    }
    router.push('/dashboard/rfqs/new/files');
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={2} />
      <h1 className="text-xl font-semibold text-midnight-green">تفاصيل الطلب</h1>
      <form onSubmit={onNext} className="space-y-5">
        <FormField
          label="عنوان الطلب"
          value={store.title}
          onChange={(e) => store.setField('title', e.target.value)}
          placeholder="مثال: جناح 6×6 لمعرض LEAP 2026"
          required
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-charcoal">المدينة</label>
            <select
              value={store.city}
              onChange={(e) => store.setField('city', e.target.value)}
              className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300 text-charcoal text-sm"
              required
            >
              <option value="">اختر</option>
              {CITIES.map((c) => <option key={c.value} value={c.value}>{c.ar}</option>)}
            </select>
          </div>
          <FormField
            label="آخر موعد للتنفيذ"
            type="date"
            value={store.deadline}
            onChange={(e) => store.setField('deadline', e.target.value)}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            label="الميزانية من (﷼)"
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={store.budgetMin}
            onChange={(e) => store.setField('budgetMin', e.target.value)}
            placeholder="50000"
          />
          <FormField
            label="إلى (﷼)"
            type="number"
            inputMode="numeric"
            dir="ltr"
            value={store.budgetMax}
            onChange={(e) => store.setField('budgetMax', e.target.value)}
            placeholder="120000"
          />
        </div>

        <div className="border-t border-stone-300 pt-5">
          <h2 className="font-semibold text-midnight-green mb-3">تفاصيل الخدمة</h2>
          {store.serviceType === 'booth' && <BoothDetailsForm />}
          {store.serviceType === 'gifts' && <GiftsDetailsForm />}
          {store.serviceType === 'event' && <EventDetailsForm />}
          {store.serviceType === 'printing' && <PrintingDetailsForm />}
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
            ← السابق
          </Button>
          <Button type="submit" variant="brand" size="lg" className="flex-1">
            التالي ←
          </Button>
        </div>
      </form>
    </>
  );
}
```

### File: `components/rfq/forms/booth-form.tsx`

```tsx
'use client';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { FormField } from '@/components/ui/form-field';

export function BoothDetailsForm() {
  const { details, setDetail } = useRfqWizardStore();
  return (
    <div className="space-y-4">
      <FormField
        label="مساحة الجناح (متر مربع)"
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={(details.area as number | undefined) ?? ''}
        onChange={(e) => setDetail('area', Number(e.target.value))}
        placeholder="36"
        required
      />
      <FormField
        label="اسم المعرض"
        value={(details.exhibitionName as string) ?? ''}
        onChange={(e) => setDetail('exhibitionName', e.target.value)}
        placeholder="LEAP 2026"
        required
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-charcoal">عدد الطوابق</label>
        <select
          value={(details.floors as string) ?? '1'}
          onChange={(e) => setDetail('floors', e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300"
        >
          <option value="1">طابق واحد</option>
          <option value="2">طابقان</option>
        </select>
      </div>
      <FormField
        label="ميزات إضافية (اختياري)"
        value={(details.features as string) ?? ''}
        onChange={(e) => setDetail('features', e.target.value)}
        placeholder="شاشة LED، طاولة استقبال، 4 كراسي بار…"
      />
    </div>
  );
}
```

### File: `components/rfq/forms/gifts-form.tsx`

```tsx
'use client';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { FormField } from '@/components/ui/form-field';

export function GiftsDetailsForm() {
  const { details, setDetail } = useRfqWizardStore();
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-charcoal">للمتلقي</label>
        <select
          value={(details.recipientType as string) ?? ''}
          onChange={(e) => setDetail('recipientType', e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300"
          required
        >
          <option value="">اختر</option>
          <option value="visitors">زوّار المعرض</option>
          <option value="vip">VIP</option>
          <option value="staff">الموظفين</option>
        </select>
      </div>
      <FormField
        label="الكمية"
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={(details.quantity as number | undefined) ?? ''}
        onChange={(e) => setDetail('quantity', Number(e.target.value))}
        placeholder="500"
        required
      />
      <FormField
        label="نوع الهدية"
        value={(details.category as string) ?? ''}
        onChange={(e) => setDetail('category', e.target.value)}
        placeholder="باور بانك، أكواب، بنرات…"
        required
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-charcoal">نوع الطباعة/البراندنج</label>
        <select
          value={(details.brandingType as string) ?? ''}
          onChange={(e) => setDetail('brandingType', e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300"
        >
          <option value="">اختر</option>
          <option value="print">طباعة فلكس / حبر</option>
          <option value="laser">حفر ليزر</option>
          <option value="embroidery">تطريز</option>
        </select>
      </div>
    </div>
  );
}
```

### File: `components/rfq/forms/event-form.tsx`

```tsx
'use client';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { FormField } from '@/components/ui/form-field';

export function EventDetailsForm() {
  const { details, setDetail } = useRfqWizardStore();
  return (
    <div className="space-y-4">
      <FormField
        label="نوع الفعالية"
        value={(details.eventType as string) ?? ''}
        onChange={(e) => setDetail('eventType', e.target.value)}
        placeholder="إطلاق منتج، ملتقى، ورشة عمل…"
        required
      />
      <FormField
        label="عدد الحضور المتوقع"
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={(details.expectedAttendees as number | undefined) ?? ''}
        onChange={(e) => setDetail('expectedAttendees', Number(e.target.value))}
        placeholder="200"
        required
      />
      <FormField
        label="مدة الفعالية (ساعات)"
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={(details.duration as number | undefined) ?? ''}
        onChange={(e) => setDetail('duration', Number(e.target.value))}
        placeholder="4"
        required
      />
    </div>
  );
}
```

### File: `components/rfq/forms/printing-form.tsx`

```tsx
'use client';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { FormField } from '@/components/ui/form-field';

export function PrintingDetailsForm() {
  const { details, setDetail } = useRfqWizardStore();
  return (
    <div className="space-y-4">
      <FormField
        label="نوع المطبوع"
        value={(details.printType as string) ?? ''}
        onChange={(e) => setDetail('printType', e.target.value)}
        placeholder="بروشور، روول-أب، كتالوج، كرت أعمال…"
        required
      />
      <FormField
        label="الكمية"
        type="number"
        inputMode="numeric"
        dir="ltr"
        value={(details.quantity as number | undefined) ?? ''}
        onChange={(e) => setDetail('quantity', Number(e.target.value))}
        placeholder="1000"
        required
      />
      <FormField
        label="المقاس"
        value={(details.size as string) ?? ''}
        onChange={(e) => setDetail('size', e.target.value)}
        placeholder="A4، A5، 9×5cm…"
        required
      />
      <FormField
        label="نوع الورق"
        value={(details.paperType as string) ?? ''}
        onChange={(e) => setDetail('paperType', e.target.value)}
        placeholder="كوشيه 200gsm، مقوّى…"
        required
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-charcoal">الألوان</label>
        <select
          value={(details.colorType as string) ?? ''}
          onChange={(e) => setDetail('colorType', e.target.value)}
          className="w-full h-10 px-3 rounded-md bg-cream border border-stone-300"
          required
        >
          <option value="">اختر</option>
          <option value="full">ألوان كاملة</option>
          <option value="bw">أبيض وأسود</option>
          <option value="2color">لونان</option>
        </select>
      </div>
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/new/files/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/ui/file-uploader';

const STEPS = [{ label: 'النوع' }, { label: 'التفاصيل' }, { label: 'الملفات' }, { label: 'المراجعة' }];

export default function NewRfqFilesPage() {
  const router = useRouter();
  const store = useRfqWizardStore();
  // Use a temp ID for the path until the RFQ is created. After creation, files
  // are referenced by their stored URL only — the path remains stable.
  const tempId = 'draft-' + (typeof window !== 'undefined' ? localStorage.getItem('rfq-draft-id') ?? Date.now() : Date.now());
  if (typeof window !== 'undefined') localStorage.setItem('rfq-draft-id', tempId);

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={3} />
      <div>
        <h1 className="text-xl font-semibold text-midnight-green">المرفقات (اختياري)</h1>
        <p className="text-sm text-stone-600 mt-1">
          ارفع المخططات، الشعار، أو أي ملف يساعد المورد. الموردون مع NDA يلتزمون بالسرية.
        </p>
      </div>
      <FileUploader
        bucket="rfq-files"
        pathPrefix={tempId}
        files={store.files}
        onChange={(files) => store.setField('files', files)}
        maxFiles={10}
      />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
          ← السابق
        </Button>
        <Button onClick={() => router.push('/dashboard/rfqs/new/review')} variant="brand" size="lg" className="flex-1">
          التالي ←
        </Button>
      </div>
    </>
  );
}
```

### File: `app/[locale]/(client)/dashboard/rfqs/new/review/page.tsx`

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useRfqWizardStore } from '@/lib/stores/rfq-wizard-store';
import { WizardStepper } from '@/components/ui/wizard-stepper';
import { Button } from '@/components/ui/button';
import { createRfqAction } from '@/app/actions/rfq';

const STEPS = [{ label: 'النوع' }, { label: 'التفاصيل' }, { label: 'الملفات' }, { label: 'المراجعة' }];

export default function NewRfqReviewPage() {
  const router = useRouter();
  const store = useRfqWizardStore();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPublish = () => {
    start(async () => {
      const res = await createRfqAction({
        serviceType: store.serviceType,
        title: store.title,
        city: store.city,
        deadline: store.deadline,
        budgetMin: store.budgetMin ? Number(store.budgetMin) : null,
        budgetMax: store.budgetMax ? Number(store.budgetMax) : null,
        details: store.details,
        files: store.files,
      });
      if (!res.ok) { setError(res.error); return; }
      store.reset();
      if (typeof window !== 'undefined') localStorage.removeItem('rfq-draft-id');
      router.push(`/dashboard/rfqs/${res.data!.id}`);
    });
  };

  return (
    <>
      <WizardStepper steps={STEPS} currentStep={4} />
      <h1 className="text-xl font-semibold text-midnight-green">راجع طلبك</h1>
      <div className="bg-stone-100 rounded-xl p-4 space-y-3 text-sm">
        <Row label="نوع الخدمة" value={store.serviceType ?? ''} />
        <Row label="العنوان" value={store.title} />
        <Row label="المدينة" value={store.city} />
        <Row label="آخر موعد" value={store.deadline} dir="ltr" />
        <Row label="الميزانية" value={store.budgetMin && store.budgetMax ? `${store.budgetMin} - ${store.budgetMax} ﷼` : 'لم تُحدد'} dir="ltr" />
        <Row label="المرفقات" value={`${store.files.length} ملف`} />
      </div>
      <div className="bg-warning-100 border border-warning/30 rounded-md p-3 text-xs text-warning">
        بمجرد النشر، سيُرسل طلبك للموردين المؤهلين. لا يمكنك تعديل تفاصيل أساسية بعد ذلك (يمكنك إضافة ملاحظات في المحادثة لاحقاً).
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="lg" className="flex-1" onClick={() => router.back()}>
          ← السابق
        </Button>
        <Button onClick={onPublish} variant="brand" size="lg" className="flex-1" disabled={pending}>
          {pending ? 'جارٍ النشر…' : 'انشر الطلب'}
        </Button>
      </div>
    </>
  );
}

function Row({ label, value, dir }: { label: string; value: string; dir?: 'ltr' | 'rtl' }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-stone-600">{label}</span>
      <span className="font-medium text-charcoal text-end" dir={dir}>{value || '—'}</span>
    </div>
  );
}
```

---

## Step 2.6 — RFQ list and details (client side)

### File: `app/[locale]/(client)/dashboard/rfqs/page.tsx`

```tsx
import Link from 'next/link';
import { Plus, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { Button } from '@/components/ui/button';
import { RfqStatusBadge } from '@/components/rfq/status-badge';
import { formatDate } from '@/lib/utils/format';

export default async function ClientRfqsPage() {
  const user = await requireRole(['client']);
  const supabase = await createClient();
  const { data: rfqs } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, service_type, status, created_at, deadline')
    .eq('client_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-midnight-green">طلباتي</h1>
        <Button asChild variant="brand">
          <Link href="/dashboard/rfqs/new">
            <Plus className="size-4" />
            <span className="hidden sm:inline">طلب جديد</span>
          </Link>
        </Button>
      </div>
      {!rfqs || rfqs.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center space-y-4">
          <FileText className="size-12 text-stone-600 mx-auto" />
          <h2 className="font-semibold">لم تنشئ أي طلب بعد</h2>
          <p className="text-sm text-stone-600">ابدأ بطلب جديد — العروض ستصلك خلال 24 ساعة.</p>
          <Button asChild variant="brand"><Link href="/dashboard/rfqs/new">أنشئ طلباً</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rfqs.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/rfqs/${r.id}`}
              className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-4 border border-stone-300"
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="font-mono num">{r.rfq_number}</span>
                    <span>·</span>
                    <span>{r.service_type}</span>
                  </div>
                  <h3 className="font-semibold text-charcoal truncate">{r.title}</h3>
                  <div className="text-xs text-stone-600">
                    أُنشئ {formatDate(r.created_at, 'ar')} · آخر موعد {formatDate(r.deadline, 'ar')}
                  </div>
                </div>
                <RfqStatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `components/rfq/status-badge.tsx`

```tsx
import { cn } from '@/lib/utils/cn';

const LABELS: Record<string, { ar: string; className: string }> = {
  draft:        { ar: 'مسودة',      className: 'bg-stone-100 text-stone-600 border-stone-300' },
  open:         { ar: 'مفتوح',      className: 'bg-info-100 text-info border-info/30' },
  negotiating:  { ar: 'تفاوض',      className: 'bg-warning-100 text-warning border-warning/30' },
  awarded:      { ar: 'تم الإسناد',  className: 'bg-success-100 text-success border-success/30' },
  in_escrow:    { ar: 'في الضمان',  className: 'bg-dune-gold-100 text-dune-gold-700 border-dune-gold/40' },
  in_progress:  { ar: 'قيد التنفيذ', className: 'bg-action-blue/10 text-action-blue border-action-blue/30' },
  delivered:    { ar: 'مُسلّم',      className: 'bg-success-100 text-success border-success/30' },
  completed:    { ar: 'مكتمل',      className: 'bg-success-100 text-success border-success/30' },
  cancelled:    { ar: 'ملغي',       className: 'bg-stone-100 text-stone-600 border-stone-300' },
  disputed:     { ar: 'نزاع',       className: 'bg-danger-100 text-danger border-danger/30' },
};

export function RfqStatusBadge({ status }: { status: string }) {
  const info = LABELS[status] ?? { ar: status, className: 'bg-stone-100 text-stone-600 border-stone-300' };
  return (
    <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs border whitespace-nowrap', info.className)}>
      {info.ar}
    </span>
  );
}
```

### File: `lib/utils/format.ts` — extend formatDate to accept (date, locale) tuple

(If you wrote it as `formatDate(date, locale)` in Phase 0, this works as-is. Otherwise update the signature.)

### File: `app/[locale]/(client)/dashboard/rfqs/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Calendar, MapPin, DollarSign, Paperclip } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { RfqStatusBadge } from '@/components/rfq/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default async function RfqDetailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(['client']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('*')
    .eq('id', id)
    .eq('client_id', user.id)
    .single();

  if (!rfq) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/dashboard/rfqs"><ArrowRight className="size-4 rotate-180" /> العودة للطلبات</Link>
      </Button>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span className="font-mono num">{rfq.rfq_number}</span>
          <span>·</span>
          <span>{rfq.service_type}</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-midnight-green">{rfq.title}</h1>
          <RfqStatusBadge status={rfq.status} />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Stat icon={MapPin} label="المدينة" value={rfq.city} />
        <Stat icon={Calendar} label="آخر موعد" value={formatDate(rfq.deadline, 'ar')} />
        <Stat
          icon={DollarSign}
          label="الميزانية"
          value={
            rfq.budget_min && rfq.budget_max
              ? `${formatCurrency(rfq.budget_min)} – ${formatCurrency(rfq.budget_max)}`
              : 'لم تُحدد'
          }
        />
      </div>

      {/* Service-specific details */}
      <div className="bg-stone-100 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-midnight-green">تفاصيل الخدمة</h2>
        <dl className="grid sm:grid-cols-2 gap-2 text-sm">
          {Object.entries(rfq.details ?? {}).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 py-1 border-b border-stone-300/40 last:border-0">
              <dt className="text-stone-600">{key}</dt>
              <dd className="text-charcoal font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Files */}
      {Array.isArray(rfq.files) && rfq.files.length > 0 && (
        <div className="bg-stone-100 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-midnight-green flex items-center gap-2">
            <Paperclip className="size-4" /> المرفقات
          </h2>
          <ul className="space-y-1.5">
            {(rfq.files as any[]).map((f, i) => (
              <li key={i}>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-action-blue hover:underline"
                >
                  {f.filename} <span className="text-xs text-stone-600 num">({(f.sizeBytes / 1024 / 1024).toFixed(2)}MB)</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Proposals placeholder for Phase 3 */}
      <div className="bg-stone-100 rounded-xl p-6 text-center text-sm text-stone-600">
        لم تصل عروض بعد. سنشعرك فور وصول أول عرض.
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-stone-100 rounded-xl p-3 flex items-center gap-3">
      <Icon className="size-5 text-midnight-green" />
      <div>
        <div className="text-xs text-stone-600">{label}</div>
        <div className="text-sm font-semibold text-charcoal">{value}</div>
      </div>
    </div>
  );
}
```

---

## Step 2.7 — Discover (supplier directory) + public profile

### File: `app/[locale]/(marketing)/discover/page.tsx`

```tsx
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { CITIES } from '@/lib/constants/cities';

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; city?: string }>;
}) {
  const { service, city } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('suppliers')
    .select(`
      id, specializations, cities, rating_avg, total_reviews, total_completed_projects,
      companies!inner(name, city, logo_url)
    `)
    .eq('status', 'approved');

  if (service) query = query.contains('specializations', [service]);
  if (city) query = query.contains('cities', [city]);

  const { data: suppliers } = await query.limit(48);

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">الموردون المعتمدون</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterPill label="الكل" href="/discover" active={!service && !city} />
        {SERVICE_TYPES.map((s) => (
          <FilterPill
            key={s.value}
            label={s.ar}
            href={`/discover?service=${s.value}${city ? `&city=${city}` : ''}`}
            active={service === s.value}
          />
        ))}
      </div>

      {!suppliers || suppliers.length === 0 ? (
        <p className="text-stone-600 text-sm">لا يوجد موردون يطابقون اختيارك.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s: any) => (
            <Link
              key={s.id}
              href={`/discover/${s.id}`}
              className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-4 border border-stone-300"
            >
              <h3 className="font-semibold text-midnight-green">{s.companies.name}</h3>
              <p className="text-xs text-stone-600 mt-1">{s.companies.city}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {s.specializations.slice(0, 3).map((spec: string) => (
                  <span key={spec} className="text-xs px-2 py-0.5 bg-cream rounded-full">{spec}</span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs text-stone-600">
                <span>⭐ <span className="num">{(s.rating_avg ?? 0).toFixed(1)}</span> ({s.total_reviews})</span>
                <span>·</span>
                <span><span className="num">{s.total_completed_projects}</span> مشروع</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        'px-3 py-1.5 rounded-full text-xs border ' +
        (active
          ? 'bg-midnight-green text-cream border-midnight-green'
          : 'bg-stone-100 text-charcoal border-stone-300 hover:border-stone-600')
      }
    >
      {label}
    </Link>
  );
}
```

### File: `app/[locale]/(marketing)/discover/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Image from 'next/image';

export default async function PublicSupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: supplier } = await supabase
    .from('suppliers')
    .select(`
      id, specializations, cities, rating_avg, total_reviews, total_completed_projects, bio,
      companies!inner(name, city, logo_url, cover_url),
      supplier_portfolio(id, title, description, images, completed_at)
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (!supplier) notFound();

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-4xl">
      {/* Header */}
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-midnight-green">{(supplier.companies as any).name}</h1>
        <p className="text-sm text-stone-600">{(supplier.companies as any).city}</p>
        <div className="flex items-center gap-4 text-sm">
          <span>⭐ <span className="num font-semibold">{(supplier.rating_avg ?? 0).toFixed(1)}</span> ({supplier.total_reviews} تقييم)</span>
          <span><span className="num font-semibold">{supplier.total_completed_projects}</span> مشروع مكتمل</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {supplier.specializations.map((s: string) => (
            <span key={s} className="text-xs px-2 py-1 bg-stone-100 rounded-full">{s}</span>
          ))}
        </div>
      </div>

      {supplier.bio && (
        <section>
          <h2 className="font-semibold text-midnight-green mb-2">عن الشركة</h2>
          <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">{supplier.bio}</p>
        </section>
      )}

      {/* Portfolio */}
      {Array.isArray(supplier.supplier_portfolio) && supplier.supplier_portfolio.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold text-midnight-green">سابقة الأعمال</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {supplier.supplier_portfolio.map((p: any) => (
              <article key={p.id} className="bg-stone-100 rounded-xl overflow-hidden">
                {Array.isArray(p.images) && p.images[0] && (
                  <div className="relative aspect-[4/3] bg-stone-300">
                    <Image src={p.images[0]} alt={p.title} fill className="object-cover" />
                  </div>
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-sm">{p.title}</h3>
                  <p className="text-xs text-stone-600 mt-1 line-clamp-2">{p.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
```

---

## Step 2.8 — Supplier-side RFQ list + details

### File: `app/[locale]/(supplier)/supplier/rfqs/page.tsx`

```tsx
import Link from 'next/link';
import { Inbox } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { RfqStatusBadge } from '@/components/rfq/status-badge';
import { formatDate } from '@/lib/utils/format';

export default async function SupplierRfqsPage() {
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  // Get supplier's specializations + cities
  const { data: supplier } = await supabase
    .from('suppliers')
    .select('specializations, cities, status')
    .eq('id', user.id)
    .single();

  if (supplier?.status !== 'approved') {
    return (
      <div className="max-w-md mx-auto mt-12 text-center text-sm text-stone-600">
        حسابك قيد المراجعة. لن تستطيع رؤية الطلبات حتى الاعتماد.
      </div>
    );
  }

  // Get matching open RFQs
  const { data: rfqs } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, service_type, city, deadline, budget_min, budget_max, created_at, status')
    .eq('status', 'open')
    .in('service_type', supplier.specializations)
    .in('city', supplier.cities)
    .order('created_at', { ascending: false })
    .limit(30);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">الطلبات المتاحة</h1>
      {!rfqs || rfqs.length === 0 ? (
        <div className="bg-stone-100 rounded-xl p-8 text-center space-y-3">
          <Inbox className="size-10 text-stone-600 mx-auto" />
          <h2 className="font-semibold">لا طلبات جديدة الآن</h2>
          <p className="text-sm text-stone-600">سنشعرك بالبريد عند وصول طلب يطابق تخصصك.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rfqs.map((r) => (
            <Link
              key={r.id}
              href={`/supplier/rfqs/${r.id}`}
              className="block bg-stone-100 hover:bg-stone-200 rounded-xl p-4 border border-stone-300"
            >
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <span className="font-mono num">{r.rfq_number}</span>
                    <span>·</span>
                    <span>{r.service_type}</span>
                    <span>·</span>
                    <span>{r.city}</span>
                  </div>
                  <h3 className="font-semibold text-charcoal">{r.title}</h3>
                  <div className="text-xs text-stone-600">
                    آخر موعد: {formatDate(r.deadline, 'ar')}
                    {r.budget_min && r.budget_max && (
                      <> · ميزانية: <span className="num" dir="ltr">{r.budget_min}–{r.budget_max} ﷼</span></>
                    )}
                  </div>
                </div>
                <RfqStatusBadge status={r.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

### File: `app/[locale]/(supplier)/supplier/rfqs/[id]/page.tsx`

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/require-role';
import { RfqStatusBadge } from '@/components/rfq/status-badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils/format';

export default async function SupplierRfqDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole(['supplier']);
  const supabase = await createClient();

  const { data: rfq } = await supabase
    .from('rfqs')
    .select('id, rfq_number, title, service_type, city, deadline, budget_min, budget_max, details, files, status')
    .eq('id', id)
    .single();

  if (!rfq) notFound();

  // Check if this supplier has already submitted a proposal (for Phase 3 — placeholder for now)
  // const { data: existing } = await supabase.from('proposals').select('id').eq('rfq_id', id).eq('supplier_id', user.id).maybeSingle();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link href="/supplier/rfqs"><ArrowRight className="size-4 rotate-180" /> العودة للطلبات</Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span className="font-mono num">{rfq.rfq_number}</span>
            <span>·</span>
            <span>{rfq.service_type}</span>
          </div>
          <h1 className="text-2xl font-bold text-midnight-green">{rfq.title}</h1>
        </div>
        <RfqStatusBadge status={rfq.status} />
      </div>

      <div className="bg-stone-100 rounded-xl p-4 space-y-2 text-sm">
        <Row label="المدينة" value={rfq.city} />
        <Row label="آخر موعد" value={formatDate(rfq.deadline, 'ar')} />
        <Row
          label="الميزانية"
          value={rfq.budget_min && rfq.budget_max ? `${formatCurrency(rfq.budget_min)} – ${formatCurrency(rfq.budget_max)}` : 'لم تُحدد'}
        />
      </div>

      <div className="bg-stone-100 rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-midnight-green text-sm mb-2">تفاصيل الخدمة</h2>
        <dl className="grid sm:grid-cols-2 gap-2 text-sm">
          {Object.entries(rfq.details ?? {}).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 py-1 border-b border-stone-300/40 last:border-0">
              <dt className="text-stone-600">{key}</dt>
              <dd className="text-charcoal font-medium">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      {Array.isArray(rfq.files) && rfq.files.length > 0 && (
        <div className="bg-stone-100 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-midnight-green text-sm">المرفقات</h2>
          <ul className="space-y-1.5">
            {(rfq.files as any[]).map((f, i) => (
              <li key={i}>
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm text-action-blue hover:underline">
                  {f.filename}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA: submit proposal — wired in Phase 3 */}
      <div className="bg-action-blue/5 border border-action-blue/30 rounded-xl p-4 text-center space-y-2">
        <p className="text-sm">جاهز لتقديم عرضك؟</p>
        <Button variant="brand" disabled>
          قدّم عرضك (متاح في Phase 3)
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 border-b border-stone-300/40 last:border-0">
      <span className="text-stone-600">{label}</span>
      <span className="text-charcoal font-medium">{value}</span>
    </div>
  );
}
```

---

## Step 2.9 — Settings pages (Profile + Company)

### File: `app/actions/profile.ts`

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/get-user';
import type { ActionResult } from './auth';

const profileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().regex(/^\+9665\d{8}$/, 'استخدم +9665XXXXXXXX'),
  jobTitle: z.string().optional(),
});

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    fullName: formData.get('fullName'),
    phone: formData.get('phone'),
    jobTitle: formData.get('jobTitle'),
  });

  if (!parsed.success) {
    return { ok: false, error: 'Validation failed', fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      job_title: parsed.data.jobTitle,
    })
    .eq('id', user.id);

  if (error) return { ok: false, error: 'فشل في حفظ التغييرات.' };

  revalidatePath('/dashboard/settings/profile');
  return { ok: true };
}
```

### File: `app/[locale]/(client)/dashboard/settings/profile/page.tsx`

```tsx
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/get-user';
import { ProfileForm } from './profile-form';

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, email, job_title')
    .eq('id', user.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-midnight-green">معلوماتي الشخصية</h1>
      <ProfileForm initial={profile ?? { full_name: '', phone: '', email: '', job_title: '' }} />
    </div>
  );
}
```

### File: `app/[locale]/(client)/dashboard/settings/profile/profile-form.tsx`

```tsx
'use client';

import { useActionState } from 'react';
import { updateProfileAction } from '@/app/actions/profile';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

interface Props {
  initial: { full_name: string | null; phone: string | null; email: string; job_title: string | null };
}

export function ProfileForm({ initial }: Props) {
  const [state, action] = useActionState(updateProfileAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormField name="fullName" label="الاسم الكامل" defaultValue={initial.full_name ?? ''} required error={state?.fieldErrors?.fullName?.[0]} />
      <FormField name="phone" label="رقم الجوال" defaultValue={initial.phone ?? ''} dir="ltr" placeholder="+9665XXXXXXXX" required error={state?.fieldErrors?.phone?.[0]} />
      <FormField name="jobTitle" label="المسمى الوظيفي (اختياري)" defaultValue={initial.job_title ?? ''} />
      <FormField label="البريد الإلكتروني (لا يمكن تغييره)" defaultValue={initial.email} disabled dir="ltr" />
      {state?.ok && <p className="text-sm text-success">تم حفظ التغييرات.</p>}
      {state && !state.ok && !state.fieldErrors && <p className="text-sm text-danger">{state.error}</p>}
      <SubmitButton variant="brand">حفظ</SubmitButton>
    </form>
  );
}
```

(Repeat the same pattern for `/dashboard/settings/company` — fields: company name, CR number (read-only), city, industry, logo upload.)

---

## Step 2.10 — Tests

### File: `tests/unit/actions/rfq.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { boothDetailsSchema } from '@/schemas/rfq/booth';
import { giftsDetailsSchema } from '@/schemas/rfq/gifts';
import { eventDetailsSchema } from '@/schemas/rfq/event';
import { printingDetailsSchema } from '@/schemas/rfq/printing';

describe('RFQ detail schemas', () => {
  it('booth: requires positive area', () => {
    const r = boothDetailsSchema.safeParse({ area: 0, exhibitionName: 'LEAP', floors: '1' });
    expect(r.success).toBe(false);
  });
  it('booth: accepts valid', () => {
    const r = boothDetailsSchema.safeParse({ area: 36, exhibitionName: 'LEAP', floors: '1' });
    expect(r.success).toBe(true);
  });
  it('gifts: rejects zero quantity', () => {
    const r = giftsDetailsSchema.safeParse({ recipientType: 'visitors', quantity: 0, category: 'cups', brandingType: 'print' });
    expect(r.success).toBe(false);
  });
  it('event: requires expectedAttendees', () => {
    const r = eventDetailsSchema.safeParse({ eventType: 'launch', duration: 4 });
    expect(r.success).toBe(false);
  });
  it('printing: accepts valid', () => {
    const r = printingDetailsSchema.safeParse({
      printType: 'بروشور', quantity: 1000, size: 'A4', paperType: 'كوشيه', colorType: 'full',
    });
    expect(r.success).toBe(true);
  });
});
```

### File: `tests/unit/storage/upload.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { MAX_FILE_BYTES, ALLOWED_MIME } from '@/lib/storage/upload';

describe('upload constraints', () => {
  it('max file size is 50MB', () => {
    expect(MAX_FILE_BYTES).toBe(50 * 1024 * 1024);
  });
  it('allows common business document types', () => {
    expect(ALLOWED_MIME).toContain('application/pdf');
    expect(ALLOWED_MIME).toContain('image/jpeg');
    expect(ALLOWED_MIME).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
  it('does not allow executable files', () => {
    expect(ALLOWED_MIME).not.toContain('application/x-msdownload');
    expect(ALLOWED_MIME).not.toContain('application/x-sh');
  });
});
```

### File: `tests/integration/rfq-creation.test.ts`

```ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

describe.skipIf(!process.env.RUN_INTEGRATION)('rfq creation', () => {
  it('inserts an RFQ and DB trigger generates rfq_number', async () => {
    // Seed a client
    const { data: u } = await admin.auth.admin.createUser({
      email: `client-int-${Date.now()}@test.local`,
      password: 'longenough1',
      email_confirm: true,
    });
    const userId = u.user!.id;

    const { data: company } = await admin
      .from('companies')
      .insert({ name: 'Test Co', cr_number: '1010' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'), city: 'riyadh', created_by: userId })
      .select('id').single();

    await admin.from('profiles').insert({ id: userId, email: u.user!.email!, full_name: 'Test', role: 'client', company_id: company!.id });

    const { data: rfq, error } = await admin.from('rfqs').insert({
      client_id: userId, company_id: company!.id,
      service_type: 'booth', title: 'Test RFQ Booth 6x6',
      city: 'riyadh', deadline: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { area: 36, exhibitionName: 'LEAP', floors: '1' },
      status: 'open',
    }).select('id, rfq_number').single();

    expect(error).toBeNull();
    expect(rfq?.rfq_number).toMatch(/^RFQ-\d+$/);

    // Cleanup
    await admin.from('rfqs').delete().eq('id', rfq!.id);
    await admin.from('profiles').delete().eq('id', userId);
    await admin.from('companies').delete().eq('id', company!.id);
    await admin.auth.admin.deleteUser(userId);
  });
});
```

### File: `tests/e2e/create-rfq.spec.ts`

```ts
import { test, expect } from '@playwright/test';

// This test assumes a seeded client account exists at TEST_CLIENT_EMAIL with TEST_CLIENT_PASSWORD
test.skip(!process.env.TEST_CLIENT_EMAIL, 'requires seeded client account');

test('client creates a booth RFQ', async ({ page }) => {
  await page.goto('/ar/login');
  await page.getByLabel('البريد الإلكتروني').fill(process.env.TEST_CLIENT_EMAIL!);
  await page.getByLabel('كلمة المرور').fill(process.env.TEST_CLIENT_PASSWORD!);
  await page.getByRole('button', { name: 'ادخل' }).click();
  await expect(page).toHaveURL(/dashboard/);

  // Open new RFQ wizard
  await page.goto('/ar/dashboard/rfqs/new');
  await page.getByText('تصميم وتنفيذ جناح').click();

  // Step 2: details
  await expect(page).toHaveURL(/details/);
  await page.getByLabel('عنوان الطلب').fill('جناح اختبار E2E 6×6');
  await page.getByLabel('المدينة').selectOption('riyadh');
  // Set deadline 30 days out
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  await page.getByLabel('آخر موعد للتنفيذ').fill(future);
  await page.getByLabel('مساحة الجناح (متر مربع)').fill('36');
  await page.getByLabel('اسم المعرض').fill('LEAP 2026');
  await page.getByRole('button', { name: 'التالي' }).click();

  // Step 3: files (skip)
  await page.getByRole('button', { name: 'التالي' }).click();

  // Step 4: review and publish
  await page.getByRole('button', { name: 'انشر الطلب' }).click();
  await expect(page).toHaveURL(/dashboard\/rfqs\/[0-9a-f-]+$/);
  await expect(page.getByText('جناح اختبار E2E')).toBeVisible();
});
```

---

## Step 2.11 — Acceptance checklist

- [ ] `pnpm dev` starts without errors
- [ ] Client can complete the 4-step wizard for **booth, gifts, event, printing**
- [ ] Files upload successfully and appear in Supabase Storage console
- [ ] Created RFQ has `rfq_number` auto-generated (e.g., RFQ-1)
- [ ] `/ar/dashboard/rfqs` shows newly created RFQ
- [ ] `/ar/dashboard/rfqs/[id]` shows full details + service-specific fields + files
- [ ] Approved supplier matching the specialization + city sees the RFQ at `/ar/supplier/rfqs`
- [ ] In-app notification row created for matching suppliers
- [ ] If `RESEND_API_KEY` is set, matching suppliers receive an email
- [ ] Profile + Company settings update correctly
- [ ] `/ar/discover` lists approved suppliers, filterable by service + city
- [ ] `/ar/discover/[id]` renders public profile
- [ ] RLS holds: Client A cannot read Client B's RFQs (test via SQL editor)
- [ ] All Phase 0 + Phase 1 + Phase 2 unit tests pass
- [ ] At least one integration test passes (`RUN_INTEGRATION=1 pnpm test:integration`)
- [ ] At least one new E2E test passes (or is skipped due to missing seed account)
- [ ] `pnpm build` succeeds
- [ ] Mobile (375px): wizard is usable, file uploader works
- [ ] RTL: arrows in step buttons point correctly (← previous, → next)

---

## Files created in Phase 2 (summary)

```
app/actions/rfq.ts
app/actions/profile.ts
app/[locale]/(client)/dashboard/rfqs/page.tsx
app/[locale]/(client)/dashboard/rfqs/[id]/page.tsx
app/[locale]/(client)/dashboard/rfqs/new/layout.tsx
app/[locale]/(client)/dashboard/rfqs/new/page.tsx
app/[locale]/(client)/dashboard/rfqs/new/details/page.tsx
app/[locale]/(client)/dashboard/rfqs/new/files/page.tsx
app/[locale]/(client)/dashboard/rfqs/new/review/page.tsx
app/[locale]/(client)/dashboard/settings/profile/page.tsx
app/[locale]/(client)/dashboard/settings/profile/profile-form.tsx
app/[locale]/(supplier)/supplier/rfqs/page.tsx
app/[locale]/(supplier)/supplier/rfqs/[id]/page.tsx
app/[locale]/(marketing)/discover/page.tsx
app/[locale]/(marketing)/discover/[id]/page.tsx
components/ui/file-uploader.tsx
components/rfq/status-badge.tsx
components/rfq/forms/booth-form.tsx
components/rfq/forms/gifts-form.tsx
components/rfq/forms/event-form.tsx
components/rfq/forms/printing-form.tsx
lib/email/resend.ts
lib/email/templates/_shared.tsx
lib/email/templates/rfq-match.tsx
lib/email/send-rfq-match.ts
lib/storage/upload.ts
lib/stores/rfq-wizard-store.ts
supabase/migrations/20260516000001_storage_buckets.sql
tests/unit/actions/rfq.test.ts
tests/unit/storage/upload.test.ts
tests/integration/rfq-creation.test.ts
tests/e2e/create-rfq.spec.ts
```

**Lines of code (estimate)**: ~2,400 implementation, ~250 tests.

**End of Phase 2.** Clients can publish RFQs. Approved suppliers in matching specialization + city receive notifications and can view full details. Phase 3 adds the proposal submission, AI scoring, and side-by-side comparison.
