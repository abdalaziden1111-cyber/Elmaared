'use client';

// Phase V5.3 — Social share buttons for blog articles.
//
// Three providers + copy-link. Each opens in a new tab. The "copy" button
// uses navigator.clipboard with a 1.5s "تم النسخ" confirmation.

import { useState } from 'react';
// lucide-react v1.x dropped branded icons; we render short text labels
// for X / LinkedIn / WhatsApp instead.
import { Copy, Send } from 'lucide-react';

interface Props {
  url: string;
  title: string;
}

export function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const enc = encodeURIComponent;
  const twitter = `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`;
  const whatsapp = `https://wa.me/?text=${enc(`${title} ${url}`)}`;

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Older browsers — silently no-op.
    }
  }

  return (
    <div className="flex items-center gap-2" data-component="share-buttons">
      <a
        href={twitter}
        target="_blank"
        rel="noopener"
        aria-label="مشاركة على X (Twitter)"
        className="inline-flex h-8 items-center rounded-md border border-[var(--color-stone-300)] px-2 text-xs font-semibold text-[var(--color-stone-600)] hover:text-[var(--color-action-blue)]"
      >
        X
      </a>
      <a
        href={linkedin}
        target="_blank"
        rel="noopener"
        aria-label="مشاركة على LinkedIn"
        className="inline-flex h-8 items-center rounded-md border border-[var(--color-stone-300)] px-2 text-xs font-semibold text-[var(--color-stone-600)] hover:text-[var(--color-action-blue)]"
      >
        in
      </a>
      <a
        href={whatsapp}
        target="_blank"
        rel="noopener"
        aria-label="مشاركة على واتساب"
        className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--color-stone-300)] px-2 text-xs text-[var(--color-stone-600)] hover:text-[var(--color-action-blue)]"
      >
        <Send className="size-3.5" />
        واتساب
      </a>
      <button
        type="button"
        onClick={copyToClipboard}
        aria-label="نسخ الرابط"
        className="inline-flex items-center gap-1 rounded-md border border-[var(--color-stone-300)] px-2 py-2 text-xs text-[var(--color-stone-600)] hover:text-[var(--color-action-blue)]"
      >
        <Copy className="size-3.5" />
        {copied ? 'تم النسخ' : 'نسخ'}
      </button>
    </div>
  );
}
