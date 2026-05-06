'use client';

import { useActionState } from 'react';
import { uploadInitialReceiptAction } from '@/app/actions/escrow';
import type { ActionResult } from '@/app/actions/auth';
import { FormField } from '@/components/ui/form-field';
import { SubmitButton } from '@/components/ui/submit-button';

export function ReceiptUploadForm({
  escrowId,
  status,
}: {
  escrowId: string;
  status: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    uploadInitialReceiptAction,
    null
  );

  if (status === 'deposit_received') {
    return (
      <p className="rounded-xl bg-[var(--color-warning-100)] p-3 text-sm text-[var(--color-warning)]">
        تمّ استلام الإيصال. ينتظر تأكيد Admin خلال 24 ساعة عمل.
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="escrowId" value={escrowId} />
      <FormField
        label="رابط إيصال التحويل البنكي"
        name="receiptUrl"
        type="url"
        placeholder="https://..."
        required
        hint="الصق رابطاً عاماً (مثل Drive أو Dropbox) أو رابط الصورة من البنك"
      />
      {state && !state.ok ? (
        <p className="text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}
      <SubmitButton>أرسل الإيصال للتأكيد</SubmitButton>
    </form>
  );
}
