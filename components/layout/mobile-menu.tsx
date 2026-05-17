'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { usePathname } from '@/lib/i18n/routing';
import { Menu, X } from 'lucide-react';

// Slide-in drawer for mobile/tablet (hidden on lg+). The same sidebar nav
// content is rendered both in the desktop aside and inside the drawer —
// the parent layout decides what to pass as children.
export function MobileMenu({
  children,
  title,
  variant = 'light',
}: {
  children: ReactNode;
  title: string;
  variant?: 'light' | 'dark';
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer when the user navigates to a new route.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const isDark = variant === 'dark';
  const triggerTone = isDark
    ? 'border-[var(--color-cream)]/30 text-[var(--color-cream)] hover:bg-white/10'
    : 'border-[var(--color-stone-300)] text-[var(--color-midnight-green)] hover:bg-[var(--color-stone-100)]';
  const headerTone = isDark
    ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]'
    : 'bg-white text-[var(--color-midnight-green)] border-b border-[var(--color-stone-300)]';
  const drawerTone = isDark
    ? 'bg-[var(--color-midnight-green)] text-[var(--color-cream)]'
    : 'bg-white text-[var(--color-midnight-green)]';

  return (
    <>
      <div
        className={`flex items-center justify-between gap-3 ${headerTone} px-4 py-3 lg:hidden`}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="افتح القائمة"
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          className={`inline-flex h-10 items-center justify-center rounded-lg border px-3 ${triggerTone} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]`}
        >
          <Menu className="size-5" aria-hidden />
        </button>
        <span className="text-sm font-semibold">{title}</span>
        <span aria-hidden className="w-10" />
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="أغلق القائمة"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          />
          <aside
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`fixed inset-y-0 start-0 z-50 flex w-72 flex-col ${drawerTone} p-6 shadow-2xl lg:hidden`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-base font-semibold">{title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="أغلق"
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-[var(--color-stone-100)]'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]`}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <div className="mt-6 flex-1 overflow-y-auto">{children}</div>
          </aside>
        </>
      ) : null}
    </>
  );
}
