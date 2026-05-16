'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { openDisputeAction } from '@/app/actions/review';
import type { ActionResult } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { TriangleAlert, X } from 'lucide-react';

// Formal dispute creation. Distinct from the in-chat panic button:
//   - Panic = quick "Admin, look at this chat" flag, mid-conversation
//   - Dispute = formal grievance that flips rfq.status → 'disputed' and
//     creates a record in the `disputes` table. Admin resolves via
//     /admin/disputes/[id] using adminResolveDisputeAction.
//
// Categorized so admin can triage quickly. Description is required
// (min 30 chars) so the dispute has enough context to act on.

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'quality', label: 'جودة التنفيذ' },
  { value: 'timeliness', label: 'تأخير في التسليم' },
  { value: 'scope', label: 'اختلاف عن المتفق عليه' },
  { value: 'communication', label: 'انقطاع التواصل' },
  { value: 'payment', label: 'مشكلة دفع/استرداد' },
  { value: 'other', label: 'أخرى' },
];

export function OpenDisputeForm({
  rfqId,
  raiserRole,
}: {
  rfqId: string;
  raiserRole: 'client' | 'supplier';
}) {
  const router = useRouter();
  const [stage, setStage] = useState<'closed' | 'open'>('closed');
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    openDisputeAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-100)]/30 p-5 text-sm">
        <p className="font-medium text-[var(--color-danger)]">
          🚨 تم رفع النزاع. Admin سيراجع ويتواصل معك خلال 24 ساعة عمل.
        </p>
      </div>
    );
  }

  if (stage === 'closed') {
    return (
      <button
        type="button"
        onClick={() => setStage('open')}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--color-danger)] bg-white px-4 text-sm font-medium text-[var(--color-danger)] hover:bg-[var(--color-danger-100)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
      >
        <TriangleAlert className="size-4" aria-hidden />
        رفع نزاع رسمي
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-[var(--color-danger)] bg-[var(--color-danger-100)]/30 p-5"
    >
      <input type="hidden" name="rfqId" value={rfqId} />
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-danger)]">
          رفع نزاع رسمي
        </h3>
        <button
          type="button"
          onClick={() => setStage('closed')}
          aria-label="إغلاق"
          className="text-[var(--color-stone-600)] hover:text-[var(--color-charcoal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--color-stone-600)]">
        النزاع الرسمي يوقف حركة الضمان (Escrow) ويُحوِّل الطلب لمراجعة Admin. استخدمه
        فقط عند فشل التواصل المباشر مع الطرف الآخر.{' '}
        {raiserRole === 'client'
          ? 'لا يمكن التراجع تلقائياً — قرار Admin نهائي.'
          : 'لا يمكن التراجع تلقائياً — قرار Admin نهائي.'}
      </p>

      <div className="mt-4 grid gap-3">
        <div>
          <label
            htmlFor="dispute-category"
            className="text-xs text-[var(--color-stone-600)]"
          >
            فئة النزاع *
          </label>
          <select
            id="dispute-category"
            name="category"
            required
            defaultValue=""
            className="mt-1 h-10 w-full rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            <option value="" disabled>
              — اختر فئة —
            </option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="dispute-description"
            className="text-xs text-[var(--color-stone-600)]"
          >
            وصف تفصيلي (30 حرفاً على الأقل) *
          </label>
          <textarea
            id="dispute-description"
            name="description"
            rows={5}
            minLength={30}
            maxLength={4000}
            required
            placeholder="ما الذي حدث؟ متى؟ ما الذي توقعته؟"
            className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          />
        </div>

        <div>
          <label
            htmlFor="dispute-evidence"
            className="text-xs text-[var(--color-stone-600)]"
          >
            روابط الأدلة (اختياري — رابط في كل سطر، حتى 10 روابط)
          </label>
          <textarea
            id="dispute-evidence"
            name="evidenceUrls"
            rows={3}
            placeholder={'https://drive.google.com/...\nhttps://example.com/photo.jpg'}
            className="mt-1 w-full rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
            dir="ltr"
          />
          <p className="mt-1 text-[10px] text-[var(--color-stone-600)]">
            تُقبل روابط https://… فقط. أمثلة: صور، فيديو، PDF.
          </p>
        </div>
      </div>

      {state && !state.ok ? (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {state.error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <SubmitButton className="bg-[var(--color-danger)] hover:opacity-90">
          أرسل النزاع
        </SubmitButton>
        <button
          type="button"
          onClick={() => setStage('closed')}
          className="h-11 rounded-xl px-4 text-sm text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
}
