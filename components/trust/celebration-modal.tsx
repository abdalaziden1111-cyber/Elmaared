'use client';

import { useEffect, useState, useTransition } from 'react';
import { PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { claimMilestoneAction } from '@/app/actions/milestones';
import { flags } from '@/lib/feature-flags';
import type { MilestoneType } from '@/lib/supabase/types';

/**
 * Emotional Trust Layer (UX Plan v2 §4 + Decision #13, Sprint 3 S3.4).
 *
 * Celebrates the four committee-approved milestones with confetti +
 * Saudi-green palette (Δ4) + a one-line congratulatory message. Three
 * critical UX guarantees:
 *
 * 1. **Idempotent** — a `user_milestones` row guards each milestone.
 *    Confetti fires exactly once per user per milestone, regardless of
 *    how many times the page re-renders.
 * 2. **Reduce-motion respect** — when `prefers-reduced-motion: reduce`
 *    is set, the modal still appears but skips the confetti animation.
 * 3. **Feature-flagged** — `FF_CELEBRATION` flips the whole layer off
 *    in case the celebrations feel out-of-place for a particular cohort
 *    (Plan v2 §11 Marketplace cold-start phase).
 */

interface Props {
  open: boolean;
  milestone: MilestoneType;
  onClose: () => void;
}

const COPY: Record<MilestoneType, { title: string; body: string }> = {
  first_rfq: {
    title: 'مبروك أول طلب — انطلقتِ!',
    body: 'وصل طلبك للمزوّدين. سترين العروض خلال 24 ساعة. نحن معك خطوة بخطوة.',
  },
  first_proposal_received: {
    title: 'أول عرض وصلكِ ✉',
    body: 'تم استلام أول عرض على طلبك. قارني الأسعار وافتحي محادثة مع من تختارينه.',
  },
  first_chat_opened: {
    title: 'أول محادثة بدأت 💬',
    body: 'فتحتِ أول محادثة مع مزوّد. تذكّري: Admin طرف ثالث صامت في كل شات لحمايتكم.',
  },
  first_agreement_signed: {
    title: 'أول اتفاق موقّع ✍',
    body: 'تمّ توقيع أول اتفاق لك. أمانة Elmaared™ جاهزة لحماية المبلغ حتى الاعتماد.',
  },
  first_escrow_funded: {
    title: 'أول إيداع في الأمانة 🛡',
    body: 'تمّ تأكيد إيداعك في حساب أمانة Elmaared™. المزوّد بدأ العمل وأنتِ آمنة.',
  },
  first_project_completed: {
    title: 'أول مشروع مكتمل 🎯',
    body: 'تمّ اعتماد التسليم وإغلاق المشروع بنجاح. شكراً لثقتك بـ Elmaared.',
  },
  // Legacy — Phase U seeded rows still reference this; new code emits
  // `first_agreement_signed`. Keep the copy in case an old row surfaces.
  first_deal: {
    title: 'صفقة Elmaared الأولى ✨',
    body: 'تمّ توقيع أول عقد لك. أمانة Elmaared™ تحمي مالك حتى الاعتماد.',
  },
  '100k_gmv': {
    title: '١٠٠ ألف ﷼ — أنتِ من رواد Elmaared',
    body: 'تجاوزت إجمالي ١٠٠ ألف ﷼ من الصفقات الناجحة. شرّفتنا.',
  },
  '500k_gmv': {
    title: '٥٠٠ ألف ﷼ — Elmaared Elite',
    body: 'تجاوزت نصف مليون ﷼ من الصفقات الموثّقة. إنجاز يستحق الاحتفاء.',
  },
  '1m_gmv': {
    title: 'مليون ﷼ — وسام Elmaared 🏆',
    body: 'تجاوزت المليون ريال. أنتِ من أوائل من بنوا اقتصاد المعارض الذكي معنا.',
  },
  yearly_anniversary: {
    title: 'سنة كاملة معكِ ❤',
    body: 'سنة من الفعاليات الناجحة. خصومات تجديد متوفّرة الآن في إعدادات الحساب.',
  },
};

// Saudi-green forward palette (Δ4) for the confetti — accent only, not the
// primary brand stack. The lucide PartyPopper sits on top in midnight-green.
const CONFETTI_PALETTE = ['#006C35', '#FE7002', '#C8A24C', '#0E3B43', '#FFFFFF'];

export function CelebrationModal({ open, milestone, onClose }: Props) {
  const [fired, setFired] = useState(false);
  const [, startTransition] = useTransition();

  const copy = COPY[milestone];

  useEffect(() => {
    if (!open || fired) return;
    if (!flags.CELEBRATION_MODALS) {
      // Flag is off — close immediately without fanfare so the parent's
      // "modal-open" state doesn't get stuck.
      onClose();
      return;
    }
    setFired(true);

    // jsdom (and old browsers) may not have matchMedia — fall through to
    // "motion OK" rather than crash. Real browsers always have it.
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
      // Lazy-load canvas-confetti so the ~5kB doesn't ride along on every
      // page — only the surfaces that *might* fire a celebration pay it,
      // and only when the celebration actually fires.
      import('canvas-confetti').then((mod) => {
        const confetti = mod.default;
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: CONFETTI_PALETTE,
        });
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: CONFETTI_PALETTE,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: CONFETTI_PALETTE,
        });
      });
    }

    // Persist the milestone in the background so the celebration doesn't fire
    // again on the next visit. The action is idempotent; if a previous load
    // already claimed it (race / multiple tabs) we just no-op.
    startTransition(async () => {
      await claimMilestoneAction(milestone);
    });
  }, [open, fired, milestone, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        data-component="celebration-modal"
        data-milestone={milestone}
        className="text-center"
      >
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--color-saudi-green-100,#E0F5ED)] text-[var(--color-saudi-green,#006C35)]">
          <PartyPopper className="size-8" aria-hidden />
        </div>
        <DialogTitle className="mt-4 text-center text-xl font-semibold text-[var(--color-midnight-green)]">
          {copy.title}
        </DialogTitle>
        <DialogDescription className="mt-2 text-center text-sm leading-relaxed text-[var(--color-stone-600)]">
          {copy.body}
        </DialogDescription>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--color-action-blue)] px-6 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]"
        >
          استلام
        </button>
      </DialogContent>
    </Dialog>
  );
}
