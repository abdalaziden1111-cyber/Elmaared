'use client';

import { useState, useTransition } from 'react';
import { ThumbsDown, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { submitAiFeedbackAction } from '@/app/actions/ai-feedback';
import type { AiFeedbackReason } from '@/lib/supabase/types';

/**
 * "أنا لا أوافق" — three-button pushback widget (UX Plan v2 Decision #01, S1.4).
 *
 * Per Josh Clark in Debate 01: every AI suggestion must offer a way to push
 * back. The popover gives the user three plain-language reasons and an
 * optional free-text note. State is persisted via `submitAiFeedbackAction`
 * to the `ai_feedback` table for ML retraining.
 *
 * Idempotent — re-submitting upserts on (proposal_id, user_id). After the
 * first successful submit the trigger stays disabled with a "تم استلام
 * ملاحظتك" label so the user knows it's recorded.
 */

const REASONS: Array<{ key: AiFeedbackReason; label: string }> = [
  { key: 'price_too_high', label: 'السعر مرتفع' },
  { key: 'price_too_low', label: 'السعر منخفض' },
  { key: 'illogical', label: 'غير منطقي' },
];

interface Props {
  proposalId: string;
  className?: string;
}

export function AIDisagreeButton({ proposalId, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<AiFeedbackReason | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) return;
    startTransition(async () => {
      const result = await submitAiFeedbackAction({
        proposalId,
        reason,
        comment: comment.trim() || undefined,
      });
      if (result.ok) {
        setSubmitted(true);
        setOpen(false);
        toast.success('شكراً — استلمنا ملاحظتك على تقييم AI.');
      } else {
        toast.error(result.error ?? 'تعذّر إرسال ملاحظتك.');
      }
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={submitted}
          className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--color-stone-300)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-stone-600)] transition hover:border-[var(--color-warning)] hover:text-[var(--color-warning)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-warning)] disabled:cursor-default disabled:opacity-70 ${className}`}
          aria-label={
            submitted
              ? 'تم إرسال ملاحظتك على تقييم AI'
              : 'فتح نموذج عدم الموافقة على تقييم AI'
          }
        >
          <ThumbsDown className="size-3.5" aria-hidden />
          {submitted ? 'تم استلام ملاحظتك' : 'أنا لا أوافق'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-[var(--color-midnight-green)]">
            ما الذي يبدو غير صحيح؟
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-[var(--color-stone-600)] hover:text-[var(--color-charcoal)]"
            aria-label="إغلاق"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">سبب عدم الموافقة</legend>
          {REASONS.map((r) => (
            <label
              key={r.key}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                reason === r.key
                  ? 'border-[var(--color-warning)] bg-[var(--color-warning-100)] text-[var(--color-warning)]'
                  : 'border-[var(--color-stone-300)] bg-white hover:border-[var(--color-stone-600)]'
              }`}
            >
              <input
                type="radio"
                name={`ai-disagree-reason-${proposalId}`}
                value={r.key}
                checked={reason === r.key}
                onChange={() => setReason(r.key)}
                className="size-4"
              />
              <span>{r.label}</span>
            </label>
          ))}
        </fieldset>

        <label
          htmlFor={`ai-feedback-comment-${proposalId}`}
          className="mt-3 block text-xs font-medium text-[var(--color-stone-600)]"
        >
          ملاحظة إضافية (اختيارية)
        </label>
        <textarea
          id={`ai-feedback-comment-${proposalId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="اشرح لنا ما الذي يبدو غير دقيق…"
          className="mt-1 w-full rounded-lg border border-[var(--color-stone-300)] bg-white p-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        />

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-stone-600)] hover:bg-[var(--color-stone-100)]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || pending}
            className="rounded-lg bg-[var(--color-action-blue)] px-3 py-1.5 text-xs font-medium text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-60"
          >
            {pending ? 'جارٍ الإرسال…' : 'أرسل'}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
