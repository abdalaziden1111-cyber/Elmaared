'use client';

import { useState, useRef, useTransition } from 'react';
import { useRouter } from '@/lib/i18n/routing';
import { uploadSupplierDocAction } from '@/app/actions/supplier-uploads';
import type { SupplierDocField } from '@/lib/storage/supplier-docs';
import { Loader2, FileUp, Check } from 'lucide-react';

const MAX_BYTES_DISPLAY = '10 ميغابايت';

export function UploadDoc({
  field,
  label,
  helper,
  currentUrl,
  uploaded,
}: {
  field: SupplierDocField;
  label: string;
  helper: string;
  currentUrl: string | null;
  uploaded: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setSuccess(false);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError(`الحجم يتجاوز ${MAX_BYTES_DISPLAY}.`);
      e.target.value = '';
      return;
    }
    if (
      file.type !== 'application/pdf' &&
      file.type !== 'image/jpeg' &&
      file.type !== 'image/png'
    ) {
      setError('اقبل PDF أو JPG أو PNG فقط.');
      e.target.value = '';
      return;
    }

    const fd = new FormData();
    fd.set('field', field);
    fd.set('file', file);

    startTransition(async () => {
      const r = await uploadSupplierDocAction(null, fd);
      if (r.ok) {
        setSuccess(true);
        if (inputRef.current) inputRef.current.value = '';
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className="rounded-xl border border-[var(--color-stone-300)] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--color-stone-600)]">{helper}</p>
          <p className="mt-0.5 text-xs text-[var(--color-stone-600)]">
            PDF / JPG / PNG · حتى {MAX_BYTES_DISPLAY}
          </p>
        </div>
        {uploaded && currentUrl ? (
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[var(--color-action-blue)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
          >
            <Check className="size-3" aria-hidden /> اعرض الملف الحالي
          </a>
        ) : (
          <span className="text-xs text-[var(--color-warning)]">لم يُرفع بعد</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-stone-300)] bg-white px-4 text-sm font-medium hover:border-[var(--color-action-blue)] focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--color-action-blue)] ${pending ? 'pointer-events-none opacity-60' : ''}`}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FileUp className="size-4" aria-hidden />
          )}
          {uploaded ? 'استبدل الملف' : 'اختر ملفاً'}
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            disabled={pending}
            onChange={onFile}
            className="sr-only"
          />
        </label>
        {success ? (
          <span
            role="status"
            className="text-xs text-[var(--color-success)]"
          >
            ✓ تم الرفع
          </span>
        ) : null}
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
