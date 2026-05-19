import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorRecoveryLayout } from '@/components/error-states/error-recovery-layout';

const BASE = {
  scenarioId: 'test-scenario',
  title: 'حدث ما يستوجب الانتباه',
  reassurance: 'كل شيء آمن. سنخبرك بالخطوة التالية.',
} as const;

describe('ErrorRecoveryLayout', () => {
  it('renders title + reassurance + scenario data attribute', () => {
    const { container } = render(
      <ErrorRecoveryLayout {...BASE} severity="critical" actions={[]} />,
    );
    expect(screen.getByText(BASE.title)).toBeInTheDocument();
    expect(screen.getByText(BASE.reassurance)).toBeInTheDocument();
    expect(
      container.querySelector('[data-component="error-recovery-layout"]')
        ?.getAttribute('data-scenario'),
    ).toBe('test-scenario');
  });

  it('renders the right severity badge text per level', () => {
    const { rerender } = render(
      <ErrorRecoveryLayout {...BASE} severity="critical" actions={[]} />,
    );
    expect(screen.getByText('حرج')).toBeInTheDocument();

    rerender(<ErrorRecoveryLayout {...BASE} severity="high" actions={[]} />);
    expect(screen.getByText('مهم')).toBeInTheDocument();

    rerender(<ErrorRecoveryLayout {...BASE} severity="medium" actions={[]} />);
    expect(screen.getByText('تنبيه')).toBeInTheDocument();

    rerender(<ErrorRecoveryLayout {...BASE} severity="low" actions={[]} />);
    expect(screen.getByText('إجراء')).toBeInTheDocument();
  });

  it('renders 1-3 recovery actions in order', () => {
    render(
      <ErrorRecoveryLayout
        {...BASE}
        severity="high"
        actions={[
          { label: 'حاول مرة أخرى', href: '#retry' },
          { label: 'تواصل مع الدعم', href: 'https://wa.me/x' },
        ]}
      />,
    );
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0].textContent).toBe('حاول مرة أخرى');
    expect(links[1].textContent).toBe('تواصل مع الدعم');
  });

  it('opens external `href` links in a new tab with rel=noopener', () => {
    render(
      <ErrorRecoveryLayout
        {...BASE}
        severity="critical"
        actions={[{ label: 'WhatsApp Support', href: 'https://wa.me/x' }]}
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('renders internal `internalHref` links WITHOUT a new tab', () => {
    render(
      <ErrorRecoveryLayout
        {...BASE}
        severity="low"
        actions={[{ label: 'لوحة التحكم', internalHref: '/ar/dashboard' }]}
      />,
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/ar/dashboard');
    expect(link.getAttribute('target')).toBeNull();
  });

  it('renders the reference code when provided', () => {
    render(
      <ErrorRecoveryLayout
        {...BASE}
        severity="critical"
        actions={[]}
        reference="ERR-2026-00042"
      />,
    );
    expect(screen.getByText('ERR-2026-00042')).toBeInTheDocument();
  });

  it('omits the reference block when reference is null/undefined', () => {
    const { container } = render(
      <ErrorRecoveryLayout {...BASE} severity="medium" actions={[]} />,
    );
    expect(
      container.querySelector('[data-component="recovery-reference"]'),
    ).toBeNull();
  });

  it('renders the extra slot under the reassurance', () => {
    render(
      <ErrorRecoveryLayout
        {...BASE}
        severity="medium"
        actions={[]}
        extra={<p data-testid="extra-slot">مزيد من التفاصيل</p>}
      />,
    );
    expect(screen.getByTestId('extra-slot')).toBeInTheDocument();
  });
});
