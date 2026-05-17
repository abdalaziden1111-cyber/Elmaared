'use client';

import { useActionState, useState } from 'react';
import { submitUnderstandingAction } from '@/app/actions/agreement';
import type { ActionResult } from '@/app/actions/auth';
import { SubmitButton } from '@/components/ui/submit-button';

export function UnderstandingForm({
  agreementId,
  initial,
  submitted,
}: {
  agreementId: string;
  initial: string;
  submitted: boolean;
}) {
  const [editing, setEditing] = useState(!submitted);
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    submitUnderstandingAction,
    null
  );

  if (!editing && submitted) {
    return (
      <div className="mt-2 rounded-xl bg-white p-4 text-sm">
        <p className="whitespace-pre-line">{initial}</p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-xs text-[var(--color-action-blue)]"
        >
          تعديل
        </button>
      </div>
    );
  }

  return (
    <form noValidate action={formAction} className="mt-2 flex flex-col gap-3">
      <input type="hidden" name="agreementId" value={agreementId} />
      <textarea
        name="understanding"
        rows={8}
        defaultValue={initial}
        minLength={100}
        required
        placeholder="اكتب فهمك للمشروع بكلماتك: ما الذي ستحصل عليه، ومتى، وبأي شروط…"
        className="rounded-xl border border-[var(--color-stone-300)] bg-white p-3 text-sm"
      />
      <p className="text-xs text-[var(--color-stone-600)]">100 حرف على الأقل</p>
      {state && !state.ok ? (
        <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      <div className="flex justify-end">
        <SubmitButton>{submitted ? 'حفظ التعديل' : 'أرسل فهمي'}</SubmitButton>
      </div>
    </form>
  );
}
