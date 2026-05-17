'use client';

import { useActionState, useEffect, useState, useRef, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { createRfqAction } from '@/app/actions/rfq';
import {
  uploadRfqAttachmentAction,
  deleteRfqAttachmentAction,
  type UploadedRfqAttachment,
} from '@/app/actions/rfq-uploads';
import type { ActionResult } from '@/app/actions/auth';
import { useRfqWizardStore, type ServiceType } from '@/stores/rfq-wizard-store';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { CITIES } from '@/lib/constants/cities';
import { cn } from '@/lib/utils/cn';

const STEPS = ['الخدمة', 'التفاصيل', 'الميزانية', 'الملفات', 'مراجعة ونشر'] as const;

export default function NewRfqPage() {
  const router = useRouter();
  const { data, setField, setDetail, reset } = useRfqWizardStore();
  const [step, setStep] = useState(0);

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createRfqAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      const d = state.data as { rfqId?: string } | undefined;
      if (d?.rfqId) {
        reset();
        router.push(`/dashboard/rfqs/${d.rfqId}`);
      }
    }
  }, [state, reset, router]);

  function next() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        طلب عرض جديد
      </h1>
      <ol className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-8 items-center justify-center rounded-full text-xs font-semibold',
                i < step
                  ? 'bg-[var(--color-success)] text-white'
                  : i === step
                  ? 'bg-[var(--color-action-blue)] text-white'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]'
              )}
            >
              {i + 1}
            </span>
            <span className="text-xs">{label}</span>
            {i < STEPS.length - 1 ? (
              <span className="h-px flex-1 bg-[var(--color-stone-300)]" />
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
        {step === 0 ? <ServiceStep onPick={(t) => { setField('serviceType', t); next(); }} current={data.serviceType} /> : null}
        {step === 1 ? (
          <DetailsStep
            serviceType={data.serviceType as ServiceType}
            details={data.details}
            onChange={setDetail}
            data={data}
            setField={setField}
            onNext={next}
            onPrev={prev}
          />
        ) : null}
        {step === 2 ? <BudgetStep data={data} setField={setField} onNext={next} onPrev={prev} /> : null}
        {step === 3 ? <FilesStep onNext={next} onPrev={prev} /> : null}
        {step === 4 ? (
          <ReviewStep
            data={data}
            formAction={formAction}
            state={state}
            onPrev={prev}
          />
        ) : null}
      </div>
    </div>
  );
}

function ServiceStep({
  onPick,
  current,
}: {
  onPick: (t: ServiceType) => void;
  current: ServiceType | '';
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SERVICE_TYPES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => onPick(s.value as ServiceType)}
          className={cn(
            'rounded-xl border p-4 text-start transition-colors',
            current === s.value
              ? 'border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5'
              : 'border-[var(--color-stone-300)] bg-white hover:border-[var(--color-action-blue)]'
          )}
        >
          <div className="text-sm font-medium">{s.labelAr}</div>
        </button>
      ))}
    </div>
  );
}

function DetailsStep(props: {
  serviceType: ServiceType;
  details: Record<string, unknown>;
  onChange: (k: string, v: unknown) => void;
  data: ReturnType<typeof useRfqWizardStore.getState>['data'];
  setField: ReturnType<typeof useRfqWizardStore.getState>['setField'];
  onNext: () => void;
  onPrev: () => void;
}) {
  const { serviceType, details, onChange, data, setField, onNext, onPrev } = props;
  function get(key: string): string {
    const v = details[key];
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="flex flex-col gap-4"
    >
      <FormField
        label="عنوان الطلب"
        name="title"
        required
        minLength={5}
        value={data.title}
        onChange={(e) => setField('title', e.target.value)}
      />
      <FormField
        label="وصف موجز للطلب"
        name="description"
        value={data.description}
        onChange={(e) => setField('description', e.target.value)}
      />

      {serviceType === 'booth' ? (
        <>
          <FormField
            label="مساحة الجناح (مثال 6x6)"
            value={get('area')}
            onChange={(e) => onChange('area', e.target.value)}
          />
          <FormField
            label="اسم المعرض"
            value={get('exhibitionName')}
            onChange={(e) => onChange('exhibitionName', e.target.value)}
          />
          <FormField
            type="date"
            label="تاريخ المعرض"
            value={get('exhibitionDate')}
            onChange={(e) => onChange('exhibitionDate', e.target.value)}
          />
          <SelectField
            label="عدد الطوابق"
            value={get('floors')}
            options={[
              { value: '1', label: 'طابق واحد' },
              { value: '2', label: 'طابقان' },
            ]}
            onChange={(v) => onChange('floors', v)}
          />
        </>
      ) : null}

      {serviceType === 'gifts' ? (
        <>
          <SelectField
            label="نوع المتلقي"
            value={get('recipientType')}
            options={[
              { value: 'VIP', label: 'VIP' },
              { value: 'general', label: 'عام' },
              { value: 'staff', label: 'موظفون' },
              { value: 'speakers', label: 'متحدثون' },
            ]}
            onChange={(v) => onChange('recipientType', v)}
          />
          <FormField
            type="number"
            label="الكمية"
            value={get('quantity')}
            onChange={(e) => onChange('quantity', Number(e.target.value))}
          />
          <SelectField
            label="الفئة"
            value={get('category')}
            options={[
              { value: 'tech', label: 'تقنية' },
              { value: 'traditional', label: 'تراثية' },
              { value: 'luxury', label: 'فاخرة' },
              { value: 'eco', label: 'صديقة للبيئة' },
              { value: 'custom', label: 'مخصصة' },
            ]}
            onChange={(v) => onChange('category', v)}
          />
          <FormField
            type="date"
            label="تاريخ التسليم"
            value={get('deliveryDate')}
            onChange={(e) => onChange('deliveryDate', e.target.value)}
          />
        </>
      ) : null}

      {serviceType === 'event' ? (
        <>
          <SelectField
            label="نوع الفعالية"
            value={get('eventType')}
            options={[
              { value: 'conference', label: 'مؤتمر' },
              { value: 'seminar', label: 'ندوة' },
              { value: 'gala', label: 'حفل' },
              { value: 'launch', label: 'إطلاق منتج' },
              { value: 'workshop', label: 'ورشة عمل' },
            ]}
            onChange={(v) => onChange('eventType', v)}
          />
          <FormField
            type="number"
            label="عدد الحضور المتوقع"
            value={get('expectedAttendees')}
            onChange={(e) => onChange('expectedAttendees', Number(e.target.value))}
          />
          <FormField
            type="date"
            label="تاريخ الفعالية"
            value={get('eventDate')}
            onChange={(e) => onChange('eventDate', e.target.value)}
          />
          <SelectField
            label="المدة"
            value={get('duration')}
            options={[
              { value: 'half_day', label: 'نصف يوم' },
              { value: 'full_day', label: 'يوم كامل' },
              { value: 'multi_day', label: 'عدة أيام' },
            ]}
            onChange={(v) => onChange('duration', v)}
          />
        </>
      ) : null}

      {serviceType === 'printing' ? (
        <>
          <SelectField
            label="نوع المطبوعة"
            value={get('printType')}
            options={[
              { value: 'brochure', label: 'بروشور' },
              { value: 'banner', label: 'لوحة' },
              { value: 'business_card', label: 'بطاقة عمل' },
              { value: 'catalog', label: 'كتالوج' },
              { value: 'poster', label: 'بوستر' },
              { value: 'flyer', label: 'فلاير' },
              { value: 'sticker', label: 'ملصق' },
              { value: 'other', label: 'أخرى' },
            ]}
            onChange={(v) => onChange('printType', v)}
          />
          <FormField
            type="number"
            label="الكمية"
            value={get('quantity')}
            onChange={(e) => onChange('quantity', Number(e.target.value))}
          />
          <FormField
            label="المقاس"
            value={get('size')}
            onChange={(e) => onChange('size', e.target.value)}
          />
          <FormField
            type="date"
            label="تاريخ التسليم"
            value={get('deliveryDate')}
            onChange={(e) => onChange('deliveryDate', e.target.value)}
          />
        </>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="text-sm text-[var(--color-stone-600)]">
          ← السابق
        </button>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)]"
        >
          التالي
        </button>
      </div>
    </form>
  );
}

function BudgetStep({
  data,
  setField,
  onNext,
  onPrev,
}: {
  data: ReturnType<typeof useRfqWizardStore.getState>['data'];
  setField: ReturnType<typeof useRfqWizardStore.getState>['setField'];
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="flex flex-col gap-4"
    >
      <SelectField
        label="مدينة المعرض / التسليم"
        value={data.exhibitionCity}
        options={CITIES.map((c) => ({ value: c.value, label: c.labelAr }))}
        onChange={(v) => setField('exhibitionCity', v)}
      />
      <FormField
        type="number"
        label="الحد الأدنى للميزانية (﷼)"
        value={data.budgetMin}
        onChange={(e) => setField('budgetMin', e.target.value)}
      />
      <FormField
        type="number"
        label="الحد الأعلى للميزانية (﷼)"
        value={data.budgetMax}
        onChange={(e) => setField('budgetMax', e.target.value)}
      />
      <FormField
        type="datetime-local"
        label="آخر موعد لاستقبال العروض"
        value={data.proposalsDeadline}
        onChange={(e) => setField('proposalsDeadline', e.target.value)}
      />
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={onPrev} className="text-sm text-[var(--color-stone-600)]">
          ← السابق
        </button>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)]"
        >
          التالي
        </button>
      </div>
    </form>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function FilesStep({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const { data, setLogo, addAttachment, removeAttachment } = useRfqWizardStore();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);

  function uploadFile(kind: 'logo' | 'attachment', file: File) {
    setError(null);
    const fd = new FormData();
    fd.set('kind', kind);
    fd.set('file', file);
    startTransition(async () => {
      const res = (await uploadRfqAttachmentAction(null, fd)) as
        | { ok: true; data: UploadedRfqAttachment }
        | { ok: false; error: string };
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (kind === 'logo') {
        setLogo({ path: res.data.path, filename: res.data.filename });
      } else {
        addAttachment({
          path: res.data.path,
          filename: res.data.filename,
          contentType: res.data.contentType,
          sizeBytes: res.data.sizeBytes,
        });
      }
    });
  }

  function deleteFile(path: string, kind: 'logo' | 'attachment') {
    setError(null);
    const fd = new FormData();
    fd.set('path', path);
    startTransition(async () => {
      const res = await deleteRfqAttachmentAction(null, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (kind === 'logo') setLogo(null);
      else removeAttachment(path);
    });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">الملفات والمرفقات</h2>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        ارفع شعار شركتك (اختياري) ومرفقات الطلب (تصاميم مرجعية، مخططات، بريف).
        PDF / JPG / PNG / WebP حتى 10 ميغابايت لكل ملف.
      </p>

      {/* Logo */}
      <section className="mt-6 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          شعار الشركة
        </h3>
        {data.logoPath ? (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--color-stone-100)] p-3">
            <ImageIcon className="size-5 shrink-0 text-[var(--color-midnight-green)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{data.logoFilename}</p>
              <p className="text-xs text-[var(--color-stone-600)]">تم الرفع</p>
            </div>
            <button
              type="button"
              onClick={() => deleteFile(data.logoPath as string, 'logo')}
              disabled={pending}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-100)]"
              aria-label="حذف الشعار"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            disabled={pending}
            className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] px-4 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Upload className="size-4" aria-hidden />
            )}
            رفع شعار
          </button>
        )}
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile('logo', f);
            e.target.value = '';
          }}
        />
      </section>

      {/* Attachments */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h3 className="text-sm font-semibold text-[var(--color-midnight-green)]">
          المرفقات
        </h3>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          مخططات، تصاميم مرجعية، بريف، أو أي مستند يحتاج المورد لقراءته قبل تقديم العرض.
        </p>
        {data.attachments.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {data.attachments.map((a) => (
              <li
                key={a.path}
                className="flex items-center gap-3 rounded-xl bg-[var(--color-stone-100)] p-3"
              >
                <FileText className="size-5 shrink-0 text-[var(--color-midnight-green)]" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{a.filename}</p>
                  <p className="text-xs text-[var(--color-stone-600)] num">
                    {formatBytes(a.sizeBytes)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteFile(a.path, 'attachment')}
                  disabled={pending}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[var(--color-danger)] hover:bg-[var(--color-danger-100)]"
                  aria-label={`حذف ${a.filename}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <button
          type="button"
          onClick={() => attachInputRef.current?.click()}
          disabled={pending}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-[var(--color-stone-300)] bg-[var(--color-cream)] px-4 text-xs font-medium text-[var(--color-midnight-green)] hover:border-[var(--color-action-blue)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Upload className="size-4" aria-hidden />
          )}
          إضافة مرفق
        </button>
        <input
          ref={attachInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadFile('attachment', f);
            e.target.value = '';
          }}
        />
      </section>

      {error ? (
        <p className="mt-3 text-xs text-[var(--color-danger)]">{error}</p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="text-sm text-[var(--color-stone-600)]"
        >
          ← السابق
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-medium text-[var(--color-cream)]"
        >
          التالي
        </button>
      </div>
    </div>
  );
}

const SERVICE_AR_LABEL: Record<ServiceType, string> = {
  booth: 'تصميم وتنفيذ أجنحة',
  gifts: 'هدايا ترويجية',
  event: 'تنظيم فعاليات',
  printing: 'مطبوعات',
};

const DETAIL_LABELS: Record<string, { label: string; map?: Record<string, string> }> = {
  // booth
  area: { label: 'مساحة الجناح' },
  exhibitionName: { label: 'اسم المعرض' },
  exhibitionDate: { label: 'تاريخ المعرض' },
  floors: { label: 'عدد الطوابق', map: { '1': 'طابق واحد', '2': 'طابقان' } },
  // gifts
  recipientType: {
    label: 'نوع المتلقي',
    map: { VIP: 'VIP', general: 'عام', staff: 'موظفون', speakers: 'متحدثون' },
  },
  quantity: { label: 'الكمية' },
  category: {
    label: 'الفئة',
    map: {
      tech: 'تقنية',
      traditional: 'تراثية',
      luxury: 'فاخرة',
      eco: 'صديقة للبيئة',
      custom: 'مخصصة',
    },
  },
  deliveryDate: { label: 'تاريخ التسليم' },
  // event
  eventType: {
    label: 'نوع الفعالية',
    map: {
      conference: 'مؤتمر',
      seminar: 'ندوة',
      gala: 'حفل',
      launch: 'إطلاق منتج',
      workshop: 'ورشة عمل',
    },
  },
  expectedAttendees: { label: 'عدد الحضور المتوقع' },
  eventDate: { label: 'تاريخ الفعالية' },
  duration: {
    label: 'المدة',
    map: { half_day: 'نصف يوم', full_day: 'يوم كامل', multi_day: 'عدة أيام' },
  },
  // printing
  printType: {
    label: 'نوع المطبوعة',
    map: {
      brochure: 'بروشور',
      banner: 'لوحة',
      business_card: 'بطاقة عمل',
      catalog: 'كتالوج',
      poster: 'بوستر',
      flyer: 'فلاير',
      sticker: 'ملصق',
      other: 'أخرى',
    },
  },
  size: { label: 'المقاس' },
};

const SERVICE_FIELD_ORDER: Record<ServiceType, string[]> = {
  booth: ['area', 'floors', 'exhibitionName', 'exhibitionDate'],
  gifts: ['recipientType', 'category', 'quantity', 'deliveryDate'],
  event: ['eventType', 'duration', 'expectedAttendees', 'eventDate'],
  printing: ['printType', 'size', 'quantity', 'deliveryDate'],
};

function formatDetailValue(key: string, raw: unknown): string {
  if (raw == null || raw === '') return '—';
  const meta = DETAIL_LABELS[key];
  const str = String(raw);
  if (meta?.map?.[str]) return meta.map[str];
  // Try parse as date (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(new Date(str));
    } catch {
      return str;
    }
  }
  return str;
}

function formatDeadline(value: string): string {
  if (!value) return '—';
  // datetime-local is "YYYY-MM-DDTHH:MM"
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return value;
  }
}

function formatBudget(min: string, max: string): string {
  function fmt(v: string): string {
    if (!v) return '?';
    const n = Number(v);
    if (!Number.isFinite(n)) return v;
    return new Intl.NumberFormat('ar-SA').format(n);
  }
  return `${fmt(min)} – ${fmt(max)} ﷼`;
}

function ReviewStep({
  data,
  formAction,
  state,
  onPrev,
}: {
  data: ReturnType<typeof useRfqWizardStore.getState>['data'];
  formAction: (formData: FormData) => void;
  state: ActionResult | null;
  onPrev: () => void;
}) {
  function buildPayload(publish: boolean) {
    return {
      serviceType: data.serviceType,
      title: data.title,
      description: data.description || undefined,
      exhibitionCity: data.exhibitionCity || undefined,
      exhibitionDate: data.exhibitionDate || undefined,
      budgetMin: data.budgetMin ? Number(data.budgetMin) : null,
      budgetMax: data.budgetMax ? Number(data.budgetMax) : null,
      proposalsDeadline: data.proposalsDeadline || null,
      details: data.details,
      logoPath: data.logoPath,
      attachments: data.attachments,
      publishImmediately: publish,
    };
  }

  const serviceAr = data.serviceType
    ? SERVICE_AR_LABEL[data.serviceType as ServiceType]
    : '—';
  const city = data.exhibitionCity
    ? CITIES.find((c) => c.value === data.exhibitionCity)?.labelAr ??
      data.exhibitionCity
    : null;
  const detailKeys = data.serviceType
    ? SERVICE_FIELD_ORDER[data.serviceType as ServiceType] ?? []
    : [];

  return (
    <div>
      <h2 className="text-lg font-semibold">مراجعة الطلب</h2>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        راجع التفاصيل قبل النشر. يمكنك العودة لتعديل أي خطوة.
      </p>

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="نوع الخدمة" value={serviceAr} />
        <Row label="العنوان" value={data.title || '—'} />
        {data.description ? (
          <Row label="الوصف" value={data.description} />
        ) : null}
        {city ? <Row label="المدينة" value={city} /> : null}
        {detailKeys.map((k) => {
          const v = data.details[k];
          if (v == null || v === '') return null;
          const label = DETAIL_LABELS[k]?.label ?? k;
          return <Row key={k} label={label} value={formatDetailValue(k, v)} />;
        })}
        {data.budgetMin || data.budgetMax ? (
          <Row label="الميزانية" value={formatBudget(data.budgetMin, data.budgetMax)} />
        ) : null}
        {data.proposalsDeadline ? (
          <Row label="آخر موعد لاستقبال العروض" value={formatDeadline(data.proposalsDeadline)} />
        ) : null}
        {data.logoFilename ? <Row label="الشعار" value={data.logoFilename} /> : null}
        {data.attachments.length > 0 ? (
          <Row
            label="المرفقات"
            value={`${data.attachments.length} ملف · ${data.attachments
              .map((a) => a.filename)
              .join(' · ')}`}
          />
        ) : null}
      </dl>

      {state && !state.ok ? (
        <p className="mt-4 text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={onPrev} className="text-sm text-[var(--color-stone-600)]">
          ← السابق
        </button>
        <div className="flex flex-wrap gap-2">
          <form noValidate action={formAction}>
            <input type="hidden" name="payload" value={JSON.stringify(buildPayload(false))} />
            <SubmitButton className="bg-[var(--color-stone-600)] hover:bg-[var(--color-charcoal)]">
              حفظ كمسودة
            </SubmitButton>
          </form>
          <form noValidate action={formAction}>
            <input type="hidden" name="payload" value={JSON.stringify(buildPayload(true))} />
            <SubmitButton>انشر الطلب</SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-stone-100)] py-2">
      <dt className="text-[var(--color-stone-600)]">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm"
      >
        <option value="">اختر…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
