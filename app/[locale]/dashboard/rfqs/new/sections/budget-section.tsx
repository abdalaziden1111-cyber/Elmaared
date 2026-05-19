'use client';

import { useEffect, useState, useTransition } from 'react';
import { Wand2, Check } from 'lucide-react';

import { FormField } from '@/components/ui/form-field';
import { CITIES } from '@/lib/constants/cities';
import { useRfqWizardStore } from '@/stores/rfq-wizard-store';
import { getRfqSmartDefaultsAction } from '@/app/actions/smart-defaults';
import type { SmartDefaults } from '@/lib/rfq/smart-defaults';
import { formatCurrency } from '@/lib/utils/format';
import { AIOverride } from '@/components/ai/ai-override';
import { SelectField } from './select-field';

/**
 * "الميزانية والمواعيد" — second section of the RFQ single-screen view
 * (Sprint 2 S2.2). Collapsible — opens automatically when the user has
 * picked a service.
 *
 * Smart Defaults (S2.4): on serviceType change, this fetches a suggestion
 * from the server action. If the suggestion lands and the user hasn't
 * typed anything in the budget fields yet, we surface a one-click "تطبيق
 * الاقتراح" banner. The user can ignore it (continue typing) or apply it
 * and then edit — exactly the override pattern from S1.6.
 */
export function BudgetSection() {
  const { data, setField } = useRfqWizardStore();
  const [suggestion, setSuggestion] = useState<SmartDefaults | null>(null);
  const [applied, setApplied] = useState(false);
  const [, startTransition] = useTransition();

  // Refetch the suggestion every time the user changes serviceType. We don't
  // refetch on city change because Smart Defaults is service-scoped — city
  // narrows the sample too aggressively in early marketplace life.
  useEffect(() => {
    if (!data.serviceType) {
      setSuggestion(null);
      setApplied(false);
      return;
    }
    startTransition(async () => {
      const result = await getRfqSmartDefaultsAction(data.serviceType);
      setSuggestion(result);
      setApplied(false);
    });
  }, [data.serviceType]);

  function applySuggestion() {
    if (!suggestion) return;
    setField('budgetMin', String(suggestion.budgetMin));
    setField('budgetMax', String(suggestion.budgetMax));
    if (!data.proposalsDeadline) {
      setField('proposalsDeadline', suggestion.proposalsDeadline);
    }
    setApplied(true);
  }

  const userHasTypedBudget =
    data.budgetMin.trim().length > 0 || data.budgetMax.trim().length > 0;
  const showSuggestionBanner =
    suggestion !== null && !applied && !userHasTypedBudget;

  return (
    <div className="flex flex-col gap-4" data-component="budget-section">
      {showSuggestionBanner ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-info-100)] p-3 text-sm text-[var(--color-info)]"
          data-component="smart-defaults-banner"
          role="status"
        >
          <span className="flex items-center gap-2">
            <Wand2 className="size-4 shrink-0" aria-hidden />
            <span>
              اقتراح من سوق Elmaared: <span className="num font-semibold">{formatCurrency(suggestion!.budgetMin)}</span> –{' '}
              <span className="num font-semibold">{formatCurrency(suggestion!.budgetMax)}</span>
              {' '}({confidenceLabel(suggestion!.confidence)})
            </span>
          </span>
          <button
            type="button"
            onClick={applySuggestion}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-info)] hover:bg-[var(--color-info-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-info)]"
          >
            <Check className="size-3.5" aria-hidden />
            تطبيق الاقتراح
          </button>
        </div>
      ) : null}

      {applied ? (
        <p className="rounded-xl bg-[var(--color-success-100)] px-3 py-2 text-xs text-[var(--color-success)]">
          ✓ طُبّق الاقتراح. يمكنك تعديل القيم في أي وقت.
        </p>
      ) : null}

      <SelectField
        label="مدينة المعرض / التسليم"
        value={data.exhibitionCity}
        options={CITIES.map((c) => ({ value: c.value, label: c.labelAr }))}
        onChange={(v) => setField('exhibitionCity', v)}
      />
      {/* Phase U4.4 — AIOverride wraps the budget fields after the user
          accepts a Smart Defaults suggestion. The chip shows the AI value;
          when the typed number diverges from it, a "تجاوزت اقتراح AI"
          banner + reset button appears. Hidden until applied; once the
          user resets, the banner clears. */}
      {applied && suggestion ? (
        <AIOverride
          aiSuggestion={`${formatCurrency(suggestion.budgetMin)} – ${formatCurrency(suggestion.budgetMax)}`}
          userValueDiffers={
            Number(data.budgetMin) !== suggestion.budgetMin ||
            Number(data.budgetMax) !== suggestion.budgetMax
          }
          onResetToAi={() => {
            setField('budgetMin', String(suggestion.budgetMin));
            setField('budgetMax', String(suggestion.budgetMax));
          }}
          label="الميزانية المقترحة"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              type="number"
              label="الحد الأدنى للميزانية (﷼)"
              value={data.budgetMin}
              onChange={(e) => setField('budgetMin', e.target.value)}
            />
            <FormField
              type="number"
              label="الحد الأعلى للميزانية (﷼)"
              value={data.budgetMax}
              onChange={(e) => setField('budgetMax', e.target.value)}
            />
          </div>
        </AIOverride>
      ) : (
        <>
          <FormField
            type="number"
            label="الحد الأدنى للميزانية (﷼)"
            value={data.budgetMin}
            onChange={(e) => setField('budgetMin', e.target.value)}
          />
          <FormField
            type="number"
            label="الحد الأعلى للميزانية (﷼)"
            value={data.budgetMax}
            onChange={(e) => setField('budgetMax', e.target.value)}
          />
        </>
      )}
      <FormField
        type="datetime-local"
        label="آخر موعد لاستقبال العروض"
        value={data.proposalsDeadline}
        onChange={(e) => setField('proposalsDeadline', e.target.value)}
      />
    </div>
  );
}

function confidenceLabel(
  level: SmartDefaults['confidence'],
): string {
  switch (level) {
    case 'high':
      return 'دقيق جداً';
    case 'medium':
      return 'دقيق';
    case 'low':
      return 'تقريبي';
    case 'unknown':
    default:
      return 'تخمين أولي';
  }
}

