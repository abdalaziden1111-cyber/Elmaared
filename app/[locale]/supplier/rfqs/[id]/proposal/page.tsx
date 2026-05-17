'use client';

import { useActionState, useEffect, use } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { submitProposalAction } from '@/app/actions/proposal';
import type { ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export default function SupplierProposalFormPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const router = useRouter();
  const { id: rfqId } = use(params);

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitProposalAction,
    null
  );

  useEffect(() => {
    if (state?.ok) {
      const d = state.data as { rfqId?: string } | undefined;
      if (d?.rfqId) {
        router.push(`/supplier/rfqs/${d.rfqId}`);
      }
    }
  }, [state, router]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        قدّم عرضك
      </h1>
      <p className="mt-1 text-sm text-[var(--color-stone-600)]">
        نَصِف العرض بدقة. يقيّمه الذكاء الاصطناعي لمساعدة العميل في المقارنة.
      </p>

      <form noValidate action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="rfqId" value={rfqId} />

        <FormField
          type="number"
          name="totalPrice"
          label="السعر الإجمالي (﷼)"
          required
          min={1}
          step="0.01"
          error={state && !state.ok ? state.fieldErrors?.totalPrice?.[0] : undefined}
        />
        <FormField
          type="number"
          name="deliveryDays"
          label="مدة التسليم (أيام)"
          required
          min={1}
          error={state && !state.ok ? state.fieldErrors?.deliveryDays?.[0] : undefined}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="description">
            وصف العرض
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            minLength={50}
            required
            className="rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm"
          />
          <p className="text-xs text-[var(--color-stone-600)]">50 حرفاً على الأقل</p>
          {state && !state.ok && state.fieldErrors?.description ? (
            <p className="text-xs text-[var(--color-danger)]">
              {state.fieldErrors.description[0]}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="scopeOfWork">
            نطاق العمل بالتفصيل
          </label>
          <textarea
            id="scopeOfWork"
            name="scopeOfWork"
            rows={6}
            minLength={100}
            required
            aria-invalid={Boolean(state && !state.ok && state.fieldErrors?.scopeOfWork)}
            className={`rounded-xl border bg-white p-3 text-sm ${
              state && !state.ok && state.fieldErrors?.scopeOfWork
                ? 'border-[var(--color-danger)]'
                : 'border-[var(--color-stone-300)]'
            }`}
          />
          {state && !state.ok && state.fieldErrors?.scopeOfWork ? (
            <p className="text-xs text-[var(--color-danger)]">
              {state.fieldErrors.scopeOfWork[0]}
            </p>
          ) : (
            <p className="text-xs text-[var(--color-stone-600)]">100 حرف على الأقل</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="excludedItems">
            ما لا يشمله العرض (اختياري)
          </label>
          <textarea
            id="excludedItems"
            name="excludedItems"
            rows={2}
            aria-invalid={Boolean(state && !state.ok && state.fieldErrors?.excludedItems)}
            className={`rounded-xl border bg-white p-3 text-sm ${
              state && !state.ok && state.fieldErrors?.excludedItems
                ? 'border-[var(--color-danger)]'
                : 'border-[var(--color-stone-300)]'
            }`}
          />
          {state && !state.ok && state.fieldErrors?.excludedItems ? (
            <p className="text-xs text-[var(--color-danger)]">
              {state.fieldErrors.excludedItems[0]}
            </p>
          ) : null}
        </div>

        <FormField
          name="paymentTerms"
          label="شروط الدفع"
          required
          minLength={10}
          placeholder="50% مقدماً، 50% عند التسليم"
          error={state && !state.ok ? state.fieldErrors?.paymentTerms?.[0] : undefined}
        />

        <FormField
          type="number"
          name="validityDays"
          label="مدة صلاحية العرض (أيام)"
          defaultValue={14}
          min={7}
          max={30}
        />

        {state && !state.ok && !state.fieldErrors ? (
          <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
        ) : null}

        <SubmitButton>أرسل العرض</SubmitButton>
      </form>
    </div>
  );
}
