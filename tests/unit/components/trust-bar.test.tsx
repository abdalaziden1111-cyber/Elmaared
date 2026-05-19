import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustBar } from '@/components/trust/trust-bar';

describe('TrustBar', () => {
  it('renders the full-variant header "أنت محمي بـ ٣ آليات"', () => {
    render(<TrustBar />);
    expect(screen.getByText('أنت محمي بـ ٣ آليات')).toBeInTheDocument();
  });

  it('renders all three pillars in the full variant', () => {
    const { container } = render(<TrustBar />);
    expect(container.querySelectorAll('[data-pillar]')).toHaveLength(3);
    expect(container.querySelector('[data-pillar="amanah"]')).not.toBeNull();
    expect(container.querySelector('[data-pillar="disputes"]')).not.toBeNull();
    expect(container.querySelector('[data-pillar="panic"]')).not.toBeNull();
  });

  it('shows the trust-name "أمانة Elmaared™" pillar title (canonical, post-S1.0)', () => {
    render(<TrustBar />);
    expect(screen.getByText('أمانة Elmaared™')).toBeInTheDocument();
  });

  it('shows "٣ مستويات نزاع" pillar', () => {
    render(<TrustBar />);
    expect(screen.getByText('٣ مستويات نزاع')).toBeInTheDocument();
  });

  it('shows "زر الفزعة" pillar', () => {
    render(<TrustBar />);
    expect(screen.getByText('زر الفزعة')).toBeInTheDocument();
  });

  it('renders the compact variant as a single pill with sr-only pillar titles', () => {
    const { container } = render(<TrustBar compact />);
    const root = container.querySelector('[data-component="trust-bar"]');
    expect(root?.getAttribute('data-variant')).toBe('compact');
    // The compact pill carries the same three pillar titles via sr-only spans
    expect(screen.queryByText('محميون بـ ٣ آليات')).toBeInTheDocument();
  });

  it('exposes a single aria-label on the section so screen readers announce intent', () => {
    const { container } = render(<TrustBar />);
    expect(
      container
        .querySelector('section[data-component="trust-bar"]')
        ?.getAttribute('aria-label'),
    ).toBe('آليات حماية المنصة');
  });
});
