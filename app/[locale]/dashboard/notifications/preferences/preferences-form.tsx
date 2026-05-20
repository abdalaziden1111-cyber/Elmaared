'use client';

import { useState, useTransition } from 'react';
import {
  NOTIFICATION_CATEGORY_LABELS,
  categoryOf,
  type NotificationType,
} from '@/lib/notifications/category';
import {
  ALL_TYPES,
  updatePreferencesAction,
  type NotificationPreferencesInput,
} from '@/app/actions/notification-preferences';

// V4.2 — Per-type opt-out toggles + quiet hours + digest + sound.
//
// Note the inverted semantics: the form lets you toggle each type ON/OFF
// visually (default ON), but the DB stores the *disabled* list (smaller
// payload, defaults are correct without backfill).

const TYPE_LABEL_AR: Record<NotificationType, string> = {
  rfq_new: 'طلب جديد',
  rfq_match: 'طلب يطابق تخصصك',
  proposal_received: 'استلام عرض',
  proposal_shortlisted: 'تم ترشيح عرضي',
  proposal_accepted: 'قبول العرض',
  proposal_rejected: 'رفض العرض',
  agreement_pending: 'اتفاق ينتظر',
  escrow_deposit_required: 'مطلوب إيداع',
  escrow_received: 'تأكيد الإيداع',
  work_started: 'بدء العمل',
  delivery_pending: 'تسليم ينتظر',
  delivery_approved: 'تم اعتماد التسليم',
  panic_button: 'تصعيد 🚨',
  message: 'رسالة جديدة',
  system: 'إشعار من النظام',
};

interface Props {
  initial: NotificationPreferencesInput;
}

export function PreferencesForm({ initial }: Props) {
  const [emailDisabled, setEmailDisabled] = useState<Set<NotificationType>>(
    new Set(initial.emailDisabledTypes)
  );
  const [inAppDisabled, setInAppDisabled] = useState<Set<NotificationType>>(
    new Set(initial.inAppDisabledTypes)
  );
  const [quietStart, setQuietStart] = useState(initial.quietHoursStart ?? '');
  const [quietEnd, setQuietEnd] = useState(initial.quietHoursEnd ?? '');
  const [digest, setDigest] = useState<'off' | 'daily' | 'weekly'>(
    initial.digestFrequency
  );
  const [soundEnabled, setSoundEnabled] = useState(initial.soundEnabled);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function toggle(set: Set<NotificationType>, val: NotificationType) {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updatePreferencesAction({
        emailDisabledTypes: Array.from(emailDisabled),
        inAppDisabledTypes: Array.from(inAppDisabled),
        quietHoursStart: quietStart || null,
        quietHoursEnd: quietEnd || null,
        digestFrequency: digest,
        soundEnabled,
      });
      setMessage(result.ok ? 'تم الحفظ.' : result.error ?? 'فشل');
    });
  }

  // Group by category for readability.
  const grouped = ALL_TYPES.reduce<Record<string, NotificationType[]>>(
    (acc, t) => {
      const cat = categoryOf(t);
      acc[cat] = acc[cat] ?? [];
      acc[cat].push(t);
      return acc;
    },
    {}
  );

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          اختر الإشعارات
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          يمكنك التحكم في كل نوع على حدة — داخل التطبيق وعبر البريد.
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-[10px] text-[var(--color-stone-600)]">
              <th className="text-start font-medium">النوع</th>
              <th className="px-2 text-center font-medium">داخل التطبيق</th>
              <th className="px-2 text-center font-medium">بريد إلكتروني</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-stone-300)]">
            {Object.entries(grouped).map(([cat, types]) => (
              <>
                <tr key={`group-${cat}`}>
                  <td
                    colSpan={3}
                    className="bg-[var(--color-stone-100)] px-2 py-1 text-[10px] font-semibold uppercase text-[var(--color-stone-600)]"
                  >
                    {NOTIFICATION_CATEGORY_LABELS[
                      cat as keyof typeof NOTIFICATION_CATEGORY_LABELS
                    ] ?? cat}
                  </td>
                </tr>
                {types.map((t) => {
                  const inAppOn = !inAppDisabled.has(t);
                  const emailOn = !emailDisabled.has(t);
                  return (
                    <tr key={t}>
                      <td className="py-2 text-xs">{TYPE_LABEL_AR[t]}</td>
                      <td className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={inAppOn}
                          onChange={() =>
                            setInAppDisabled((s) => toggle(s, t))
                          }
                          className="size-4"
                          aria-label={`داخل التطبيق: ${TYPE_LABEL_AR[t]}`}
                        />
                      </td>
                      <td className="px-2 text-center">
                        <input
                          type="checkbox"
                          checked={emailOn}
                          onChange={() =>
                            setEmailDisabled((s) => toggle(s, t))
                          }
                          className="size-4"
                          aria-label={`بريد: ${TYPE_LABEL_AR[t]}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          ساعات الهدوء (UTC)
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          خلال هذه الفترة، الإشعارات تظل تصلك داخل التطبيق لكن البريد يُؤجَّل. اتركهما فارغين لتعطيل الميزة.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs">
            من
            <input
              type="time"
              value={quietStart}
              onChange={(e) => setQuietStart(e.target.value)}
              className="rounded-lg border border-[var(--color-stone-300)] px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            إلى
            <input
              type="time"
              value={quietEnd}
              onChange={(e) => setQuietEnd(e.target.value)}
              className="rounded-lg border border-[var(--color-stone-300)] px-2 py-1 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          ملخّص دوري بدلاً من فردي
        </h2>
        <p className="mt-1 text-xs text-[var(--color-stone-600)]">
          حدّد كم مرة تريد استلام ملخّص بالإيميل بدلاً من رسالة لكل حدث.
        </p>
        <div className="mt-3 flex gap-2">
          {(['off', 'daily', 'weekly'] as const).map((freq) => (
            <button
              key={freq}
              type="button"
              onClick={() => setDigest(freq)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                digest === freq
                  ? 'bg-[var(--color-action-blue)] text-[var(--color-cream)]'
                  : 'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]'
              }`}
            >
              {freq === 'off'
                ? 'إيقاف الملخّص'
                : freq === 'daily'
                ? 'يومي'
                : 'أسبوعي'}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--color-stone-300)] bg-white p-5">
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          صوت الإشعار في صفحة الإشعارات
        </h2>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => setSoundEnabled(e.target.checked)}
            className="size-4"
          />
          تشغيل صوت قصير عند وصول إشعار جديد
        </label>
      </section>

      <div className="flex items-center justify-end gap-3">
        {message ? (
          <span className="text-sm text-[var(--color-stone-600)]">{message}</span>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center rounded-xl bg-[var(--color-action-blue)] px-5 text-sm font-semibold text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)] disabled:opacity-50"
        >
          {pending ? 'يحفظ…' : 'حفظ التفضيلات'}
        </button>
      </div>
    </form>
  );
}
