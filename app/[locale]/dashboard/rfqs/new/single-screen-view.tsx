'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from '@/lib/i18n/routing';

import { createRfqAction } from '@/app/actions/rfq';
import type { ActionResult } from '@/app/actions/auth';
import { useRfqWizardStore, type ServiceType } from '@/stores/rfq-wizard-store';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ServiceSection } from './sections/service-section';
import { BudgetSection } from './sections/budget-section';
import { FilesSection } from './sections/files-section';

/**
 * UX Plan v2 Decision #02, Sprint 2 S2.3 — single-screen RFQ creation.
 *
 * Replaces the 5-step wizard (Service → Details → Budget → Files → Review)
 * with one scrollable page anchored by a sticky submit button. The two
 * optional sections (Budget, Files) live inside a collapsible accordion so
 * a confident user can submit in seconds, while a thorough user can expand
 * everything. The first section (Service + service-specific Details) is
 * always visible — it's the gate.
 *
 * Smart Defaults (S2.4) will prefill budgetMin/Max into the BudgetSection
 * after the user picks a service + city. The accordion items default to:
 *
 *   1. Service + Details — always visible, no accordion (must be filled).
 *   2. Budget & Deadline — collapsible, OPEN by default once Service is set.
 *   3. Files & Attachments — collapsible, CLOSED by default (optional).
 */
export function SingleScreenView() {
  const router = useRouter();
  const { data, reset } = useRfqWizardStore();

  const [state, formAction] = useActionState<ActionResult | null, FormData>(
    createRfqAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      const d = state.data as { rfqId?: string } | undefined;
      if (d?.rfqId) {
        reset();
        router.push(`/dashboard/rfqs/${d.rfqId}`);
      }
    }
  }, [state, reset, router]);

  const hasService = Boolean(data.serviceType);
  const hasTitle = data.title.trim().length >= 5;
  const canSubmit = hasService && hasTitle;

  // The Budget section starts OPEN as soon as Service is picked — it's the
  // expected next step. Files stays closed; it's truly optional.
  const defaultOpen = hasService ? ['budget'] : [];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--color-midnight-green)]">
        طلب عرض جديد
      </h1>
      <p className="mt-2 text-sm text-[var(--color-stone-600)]">
        املأ القسم الأول وستستطيع إرسال طلبك في ثوانٍ. الميزانية والمرفقات اختياريان —
        افتحهما لو احتجت ضبطاً أدق.
      </p>

      {/* Section 1 — always visible */}
      <section
        className="mt-6 rounded-2xl bg-white p-6 shadow-sm"
        data-section="service"
        aria-label="نوع الخدمة وتفاصيلها"
      >
        <h2 className="text-base font-semibold text-[var(--color-midnight-green)]">
          ١) نوع الخدمة وتفاصيلها
        </h2>
        <div className="mt-4">
          <ServiceSection />
        </div>
      </section>

      {/* Sections 2 + 3 — collapsible */}
      <Accordion
        type="multiple"
        defaultValue={defaultOpen}
        className="mt-4 rounded-2xl bg-white px-6 shadow-sm"
      >
        <AccordionItem value="budget" data-section="budget">
          <AccordionTrigger>
            ٢) الميزانية والمواعيد{' '}
            <span className="text-xs font-normal text-[var(--color-stone-600)]">
              (اختياري — سنستخدم تقديرات السوق إذا تركته)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <BudgetSection />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="files" data-section="files">
          <AccordionTrigger>
            ٣) ملفات ومرفقات{' '}
            <span className="text-xs font-normal text-[var(--color-stone-600)]">
              (اختياري)
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <FilesSection />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {state && !state.ok ? (
        <p className="mt-4 text-sm text-[var(--color-danger)]">{state.error}</p>
      ) : null}

      {/* Sticky-ish submit bar */}
      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-end">
        <form noValidate action={formAction}>
          <input
            type="hidden"
            name="payload"
            value={JSON.stringify(buildPayload(data, false))}
          />
          <SubmitButton
            disabled={!canSubmit}
            className="bg-[var(--color-stone-600)] hover:bg-[var(--color-charcoal)]"
          >
            احفظ كمسودة
          </SubmitButton>
        </form>
        <form noValidate action={formAction}>
          <input
            type="hidden"
            name="payload"
            value={JSON.stringify(buildPayload(data, true))}
          />
          <SubmitButton disabled={!canSubmit}>أرسلي الطلب الآن</SubmitButton>
        </form>
      </div>

      {!canSubmit ? (
        <p className="mt-2 text-end text-xs text-[var(--color-stone-600)]">
          {!hasService
            ? 'اختر نوع الخدمة أولاً.'
            : 'العنوان مطلوب (٥ أحرف على الأقل).'}
        </p>
      ) : null}
    </div>
  );
}

function buildPayload(
  data: ReturnType<typeof useRfqWizardStore.getState>['data'],
  publish: boolean,
) {
  return {
    serviceType: data.serviceType as ServiceType | '',
    title: data.title,
    description: data.description || undefined,
    exhibitionCity: data.exhibitionCity || undefined,
    exhibitionDate: data.exhibitionDate || undefined,
    budgetMin: data.budgetMin ? Number(data.budgetMin) : null,
    budgetMax: data.budgetMax ? Number(data.budgetMax) : null,
    proposalsDeadline: data.proposalsDeadline || null,
    details: data.details,
    logoPath: data.logoPath,
    attachments: data.attachments,
    publishImmediately: publish,
  };
}
