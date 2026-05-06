import { cn } from '@/lib/utils/cn';
import { Check } from 'lucide-react';

interface Step {
  label: string;
  state: 'past' | 'current' | 'future';
}

export function WizardStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex items-center gap-2" aria-label="خطوات إنشاء الحساب">
      {steps.map((step, idx) => (
        <li key={step.label} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              step.state === 'current' &&
                'bg-[var(--color-action-blue)] text-[var(--color-cream)]',
              step.state === 'past' &&
                'bg-[var(--color-success)] text-[var(--color-cream)]',
              step.state === 'future' &&
                'bg-[var(--color-stone-100)] text-[var(--color-stone-600)]'
            )}
            aria-current={step.state === 'current' ? 'step' : undefined}
          >
            {step.state === 'past' ? <Check className="size-4" /> : idx + 1}
          </span>
          <span
            className={cn(
              'text-xs',
              step.state === 'current'
                ? 'font-medium text-[var(--color-charcoal)]'
                : 'text-[var(--color-stone-600)]'
            )}
          >
            {step.label}
          </span>
          {idx < steps.length - 1 ? (
            <span
              className={cn(
                'h-px flex-1',
                step.state === 'past'
                  ? 'bg-[var(--color-success)]'
                  : 'bg-[var(--color-stone-300)]'
              )}
              aria-hidden="true"
            />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
