'use client';

import { useRef, useState, useTransition } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';

import {
  uploadRfqAttachmentAction,
  deleteRfqAttachmentAction,
  type UploadedRfqAttachment,
} from '@/app/actions/rfq-uploads';
import { useRfqWizardStore } from '@/stores/rfq-wizard-store';

/**
 * "الملفات والمرفقات" — third (optional) section of the RFQ single-screen
 * view (Sprint 2 S2.2). Identical mechanics to the legacy wizard step:
 * uploads a logo + arbitrary attachments via the existing server actions,
 * shows progress + error states. Self-contained — no props.
 */
export function FilesSection() {
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
    <div data-component="files-section">
      <p className="text-xs text-[var(--color-stone-600)]">
        ارفع شعار شركتك (اختياري) ومرفقات الطلب (تصاميم مرجعية، مخططات، بريف).
        PDF / JPG / PNG / WebP حتى 10 ميغابايت لكل ملف.
      </p>

      {/* Logo */}
      <section className="mt-4 rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
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
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
