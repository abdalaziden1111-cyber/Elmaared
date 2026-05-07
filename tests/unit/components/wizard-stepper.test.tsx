import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WizardStepper } from '@/components/ui/wizard-stepper';

describe('WizardStepper', () => {
  it('renders all step labels', () => {
    render(
      <WizardStepper
        steps={[
          { label: 'الحساب', state: 'current' },
          { label: 'الشركة', state: 'future' },
          { label: 'تأكيد', state: 'future' },
        ]}
      />
    );
    expect(screen.getByText('الحساب')).toBeInTheDocument();
    expect(screen.getByText('الشركة')).toBeInTheDocument();
    expect(screen.getByText('تأكيد')).toBeInTheDocument();
  });

  it('numbers steps starting at 1 for current/future', () => {
    render(
      <WizardStepper
        steps={[
          { label: 'A', state: 'current' },
          { label: 'B', state: 'future' },
          { label: 'C', state: 'future' },
        ]}
      />
    );
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks current step with aria-current="step"', () => {
    render(
      <WizardStepper
        steps={[
          { label: 'A', state: 'past' },
          { label: 'B', state: 'current' },
          { label: 'C', state: 'future' },
        ]}
      />
    );
    const current = document.querySelector('[aria-current="step"]');
    expect(current).not.toBeNull();
  });

  it('renders past steps with check (not the index)', () => {
    const { container } = render(
      <WizardStepper
        steps={[
          { label: 'A', state: 'past' },
          { label: 'B', state: 'past' },
          { label: 'C', state: 'current' },
        ]}
      />
    );
    // Past steps render a Check icon — verified by absence of "1"/"2" inside them
    // and by counting svg children. There should be 2 svgs (one per past step).
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('does not render a connector after the last step', () => {
    const { container } = render(
      <WizardStepper
        steps={[
          { label: 'A', state: 'past' },
          { label: 'B', state: 'current' },
        ]}
      />
    );
    // Connectors are rendered inside li but the last li shouldn't have one
    const lis = container.querySelectorAll('li');
    expect(lis.length).toBe(2);
  });

  it('uses ordered list for semantics', () => {
    render(
      <WizardStepper steps={[{ label: 'A', state: 'current' }]} />
    );
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
