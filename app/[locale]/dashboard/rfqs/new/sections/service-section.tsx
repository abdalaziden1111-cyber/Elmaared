'use client';

import { FormField } from '@/components/ui/form-field';
import { SERVICE_TYPES } from '@/lib/constants/service-types';
import { cn } from '@/lib/utils/cn';
import { useRfqWizardStore, type ServiceType } from '@/stores/rfq-wizard-store';
import { SelectField } from './select-field';

/**
 * "نوع الخدمة + التفاصيل الأساسية" — the always-open first section of the
 * RFQ single-screen view (Sprint 2 S2.2). The user picks a service type and
 * the form below morphs to that service's specific fields (booth area,
 * gift recipient type, etc.).
 *
 * Self-contained: reads / writes to the shared Zustand store, no props.
 * The legacy 5-step wizard still uses inline copies of these steps; this
 * component replaces them when FF_RFQ_SINGLE_SCREEN is on (wired in S2.3).
 */
export function ServiceSection() {
  const { data, setField, setDetail } = useRfqWizardStore();
  const serviceType = data.serviceType as ServiceType | '';

  function get(key: string): string {
    const v = data.details[key];
    return typeof v === 'string' ? v : v == null ? '' : String(v);
  }

  return (
    <div className="flex flex-col gap-4" data-component="service-section">
      <p className="text-xs text-[var(--color-stone-600)]">
        اختر نوع الخدمة، ثم املأ التفاصيل. كل التفاصيل تتكيّف مع الخدمة المختارة.
      </p>

      {/* Service picker */}
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="نوع الخدمة">
        {SERVICE_TYPES.map((s) => {
          const selected = serviceType === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setField('serviceType', s.value as ServiceType)}
              className={cn(
                'rounded-xl border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]',
                selected
                  ? 'border-[var(--color-action-blue)] bg-[var(--color-action-blue)]/5'
                  : 'border-[var(--color-stone-300)] bg-white hover:border-[var(--color-action-blue)]',
              )}
            >
              <div className="text-sm font-medium">{s.labelAr}</div>
            </button>
          );
        })}
      </div>

      {/* Common fields — visible only after a service is picked */}
      {serviceType ? (
        <>
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
        </>
      ) : null}

      {/* Service-specific fields */}
      {serviceType === 'booth' ? (
        <>
          <FormField
            label="مساحة الجناح (مثال 6x6)"
            value={get('area')}
            onChange={(e) => setDetail('area', e.target.value)}
          />
          <FormField
            label="اسم المعرض"
            value={get('exhibitionName')}
            onChange={(e) => setDetail('exhibitionName', e.target.value)}
          />
          <FormField
            type="date"
            label="تاريخ المعرض"
            value={get('exhibitionDate')}
            onChange={(e) => setDetail('exhibitionDate', e.target.value)}
          />
          <SelectField
            label="عدد الطوابق"
            value={get('floors')}
            options={[
              { value: '1', label: 'طابق واحد' },
              { value: '2', label: 'طابقان' },
            ]}
            onChange={(v) => setDetail('floors', v)}
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
            onChange={(v) => setDetail('recipientType', v)}
          />
          <FormField
            type="number"
            label="الكمية"
            value={get('quantity')}
            onChange={(e) => setDetail('quantity', Number(e.target.value))}
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
            onChange={(v) => setDetail('category', v)}
          />
          <FormField
            type="date"
            label="تاريخ التسليم"
            value={get('deliveryDate')}
            onChange={(e) => setDetail('deliveryDate', e.target.value)}
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
            onChange={(v) => setDetail('eventType', v)}
          />
          <FormField
            type="number"
            label="عدد الحضور المتوقع"
            value={get('expectedAttendees')}
            onChange={(e) => setDetail('expectedAttendees', Number(e.target.value))}
          />
          <FormField
            type="date"
            label="تاريخ الفعالية"
            value={get('eventDate')}
            onChange={(e) => setDetail('eventDate', e.target.value)}
          />
          <SelectField
            label="المدة"
            value={get('duration')}
            options={[
              { value: 'half_day', label: 'نصف يوم' },
              { value: 'full_day', label: 'يوم كامل' },
              { value: 'multi_day', label: 'عدة أيام' },
            ]}
            onChange={(v) => setDetail('duration', v)}
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
            onChange={(v) => setDetail('printType', v)}
          />
          <FormField
            type="number"
            label="الكمية"
            value={get('quantity')}
            onChange={(e) => setDetail('quantity', Number(e.target.value))}
          />
          <FormField
            label="المقاس"
            value={get('size')}
            onChange={(e) => setDetail('size', e.target.value)}
          />
          <FormField
            type="date"
            label="تاريخ التسليم"
            value={get('deliveryDate')}
            onChange={(e) => setDetail('deliveryDate', e.target.value)}
          />
        </>
      ) : null}
    </div>
  );
}
