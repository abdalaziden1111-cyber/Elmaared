'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import { flags } from '@/lib/feature-flags';

/**
 * PDPL consent banner (UX Plan v2 Decision #11, Sprint 5 S5.4).
 *
 * Renders on first visit when FF_PDPL_CONSENT is on. Localstorage-backed
 * — once the user makes a choice, the banner stays dismissed across
 * sessions. Wires nothing fancy back to the server (no events table yet);
 * the regulatory record-keeping is a follow-up wire when the consents
 * table lands.
 *
 * Why localStorage and not a cookie: cookies require the consent we're
 * asking for. PDPL allows essential storage (preferences) without
 * consent — localStorage is the right primitive here.
 */

const STORAGE_KEY = 'elmaared:pdpl-consent-v1';

type ConsentState = 'unknown' | 'accepted' | 'declined';

function readConsent(): ConsentState {
  if (typeof window === 'undefined') return 'unknown';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === 'accepted' || v === 'declined') return v;
  } catch {
    // localStorage unavailable (Safari private mode, etc.) — fall through.
  }
  return 'unknown';
}

function writeConsent(state: 'accepted' | 'declined') {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Best-effort. If write fails, the banner reappears next visit —
    // worse UX but never a privacy violation.
  }
}

export function PDPLConsentBanner() {
  const [state, setState] = useState<ConsentState>('unknown');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setState(readConsent());
  }, []);

  if (!flags.PDPL_CONSENT) return null;
  // Don't render until we've checked localStorage to avoid a flash-of-banner.
  if (!mounted) return null;
  if (state !== 'unknown') return null;

  function decide(choice: 'accepted' | 'declined') {
    writeConsent(choice);
    setState(choice);
  }

  return (
    <div
      role="dialog"
      aria-labelledby="pdpl-consent-title"
      data-component="pdpl-consent-banner"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-3xl rounded-2xl border border-[var(--color-stone-300)] bg-white p-5 shadow-lg"
    >
      <h2
        id="pdpl-consent-title"
        className="text-sm font-semibold text-[var(--color-midnight-green)]"
      >
        موافقة استخدام البيانات
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-stone-600)]">
        نستخدم بيانات الاستخدام والتفضيلات (مدينة، فئة الخدمة، تفاعلاتك مع
        العروض) لتحسين تجربتك على Elmaared وفقاً لنظام حماية البيانات
        الشخصية السعودي (PDPL). لك الحق في الاطلاع، التصحيح، أو حذف
        بياناتك في أي وقت من{' '}
        <Link
          href="/legal/data-rights"
          className="font-medium text-[var(--color-action-blue)] underline"
        >
          مركز حقوق البيانات
        </Link>
        .
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide('accepted')}
          data-testid="pdpl-accept"
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-action-blue)] px-4 text-xs font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          أوافق
        </button>
        <button
          type="button"
          onClick={() => decide('declined')}
          data-testid="pdpl-decline"
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-stone-100)] px-4 text-xs font-semibold text-[var(--color-stone-600)] hover:bg-[var(--color-stone-300)]"
        >
          رفض غير الأساسي
        </button>
      </div>
    </div>
  );
}
