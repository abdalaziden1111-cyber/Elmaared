'use client';

import { useActionState, useState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { submitDeliveryAction } from '@/app/actions/escrow';
import type { ActionResult } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';
import { Plus, X } from 'lucide-react';

// Supplier-side delivery submission. Becomes available only when the RFQ
// status reaches `in_progress` (admin confirmed deposit, supplier is the
// winner). Submitting flips status → `delivered`, which gates the client's
// "approve delivery" action.
//
// Photos come in as URLs (Drive/Dropbox/etc) — the action expects a JSON
// array of strings in formData.photos. A storage-backed multi-upload is
// nicer UX but isn't required for V1: most suppliers already have these
// photos in their existing project workflows.
export function SubmitDeliveryForm({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [photos, setPhotos] = useState<string[]>(['']);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitDeliveryAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state, router]);

  function setPhoto(i: number, value: string) {
    setPhotos((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }
  function addPhoto() {
    setPhotos((prev) => [...prev, '']);
  }
  function removePhoto(i: number) {
    setPhotos((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  const cleanPhotos = photos.map((p) => p.trim()).filter((p) => p.length > 0);
  const canSubmit = cleanPhotos.length > 0;

  return (
    <form noValidate action={formAction} className="grid gap-3">
      <input type="hidden" name="rfqId" value={rfqId} />
      <input type="hidden" name="photos" value={JSON.stringify(cleanPhotos)} />

      <div>
        <label className="text-xs text-[var(--color-stone-600)]">
          روابط صور التسليم (واحد على الأقل) *
        </label>
        <div className="mt-2 grid gap-2">
          {photos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="url"
                value={p}
                onChange={(e) => setPhoto(i, e.target.value)}
                placeholder="https://..."
                className="num h-10 flex-1 rounded-xl border border-[var(--color-stone-300)] bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
              />
              {photos.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  aria-label={`احذف الصورة ${i + 1}`}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-stone-300)] text-[var(--color-stone-600)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            onClick={addPhoto}
            className="inline-flex h-9 items-center gap-1 self-start rounded-lg border border-dashed border-[var(--color-stone-300)] px-3 text-xs text-[var(--color-stone-600)] hover:border-[var(--color-action-blue)] hover:text-[var(--color-action-blue)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            <Plus className="size-3" aria-hidden />
            أضف صورة
          </button>
        </div>
        {state && !state.ok && state.fieldErrors?.photos ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">
            {state.fieldErrors.photos[0]}
          </p>
        ) : (
          <p className="mt-1 text-xs text-[var(--color-stone-600)]">
            روابط عامة (Drive / Dropbox / صور البنك). تُحفظ مع سجل التسليم.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="text-xs text-[var(--color-stone-600)]">
          ملاحظات (اختياري)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          placeholder="مثال: تم التركيب في الوقت المحدد، تسلّمه العميل في الموقع."
          aria-invalid={Boolean(state && !state.ok && state.fieldErrors?.notes)}
          className={`mt-1 w-full rounded-xl border bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)] ${
            state && !state.ok && state.fieldErrors?.notes
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-stone-300)]'
          }`}
        />
        {state && !state.ok && state.fieldErrors?.notes ? (
          <p className="mt-1 text-xs text-[var(--color-danger)]">
            {state.fieldErrors.notes[0]}
          </p>
        ) : null}
      </div>

      {state && !state.ok && !state.fieldErrors ? (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-danger)] bg-[var(--color-danger-100)] p-3 text-sm text-[var(--color-danger)]"
        >
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-success)] bg-[var(--color-success-100)] p-3 text-sm text-[var(--color-success)]"
        >
          تم تسجيل التسليم. العميل سيراجعه ويعتمده.
        </p>
      ) : null}

      <div className="flex justify-end">
        <SubmitButton disabled={!canSubmit}>أعلن التسليم</SubmitButton>
      </div>
    </form>
  );
}
