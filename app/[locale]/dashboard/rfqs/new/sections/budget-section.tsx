'use client';

import { FormField } from '@/components/ui/form-field';
import { CITIES } from '@/lib/constants/cities';
import { useRfqWizardStore } from '@/stores/rfq-wizard-store';
import { SelectField } from './select-field';

/**
 * "الميزانية والمواعيد" — second section of the RFQ single-screen view
 * (Sprint 2 S2.2). Collapsible — opens automatically when the user has
 * picked a service. Smart Defaults (Sprint 2 S2.4) prefill budgetMin/Max
 * via `<AIOverride>` wrappers on top of this section.
 *
 * Self-contained: reads / writes to the shared Zustand store, no props.
 */
export function BudgetSection() {
  const { data, setField } = useRfqWizardStore();

  return (
    <div className="flex flex-col gap-4" data-component="budget-section">
      <SelectField
        label="مدينة المعرض / التسليم"
        value={data.exhibitionCity}
        options={CITIES.map((c) => ({ value: c.value, label: c.labelAr }))}
        onChange={(v) => setField('exhibitionCity', v)}
      />
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
      <FormField
        type="datetime-local"
        label="آخر موعد لاستقبال العروض"
        value={data.proposalsDeadline}
        onChange={(e) => setField('proposalsDeadline', e.target.value)}
      />
    </div>
  );
}
