import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarketRange } from '@/components/ai/market-range';

describe('MarketRange', () => {
  it('renders the fallback card when level is unknown', () => {
    render(<MarketRange level="unknown" min={null} max={null} sampleSize={0} />);
    expect(screen.getByText(/لا توجد بيانات سوقية كافية/)).toBeInTheDocument();
  });

  it('renders the fallback when range is missing even at a known level', () => {
    render(<MarketRange level="low" min={null} max={40000} sampleSize={5} />);
    expect(screen.getByText(/لا توجد بيانات سوقية كافية/)).toBeInTheDocument();
  });

  it('shows the bar and both anchors when a valid range is provided', () => {
    const { container } = render(
      <MarketRange
        level="high"
        min={42000}
        max={58000}
        sampleSize={23}
        variancePct={12}
      />
    );
    expect(container.querySelector('[data-component="market-range"]')).not.toBeNull();
    expect(screen.getByText('عين السوق')).toBeInTheDocument();
    // Min and max are rendered via formatCurrency (riyal symbol present).
    expect(screen.getByText(/42,000/)).toBeInTheDocument();
    expect(screen.getByText(/58,000/)).toBeInTheDocument();
  });

  it('marks supplier price INSIDE the range with a success note', () => {
    render(
      <MarketRange
        level="high"
        min={40000}
        max={60000}
        sampleSize={25}
        variancePct={10}
        supplierPrice={50000}
      />
    );
    expect(screen.getByText(/داخل النطاق السوقي/)).toBeInTheDocument();
  });

  it('flags supplier price BELOW the range with a warning', () => {
    render(
      <MarketRange
        level="high"
        min={40000}
        max={60000}
        sampleSize={25}
        variancePct={10}
        supplierPrice={30000}
      />
    );
    expect(screen.getByText(/أقل من حد السوق/)).toBeInTheDocument();
  });

  it('flags supplier price ABOVE the range with a warning', () => {
    render(
      <MarketRange
        level="high"
        min={40000}
        max={60000}
        sampleSize={25}
        variancePct={10}
        supplierPrice={75000}
      />
    );
    expect(screen.getByText(/أعلى من حد السوق/)).toBeInTheDocument();
  });

  it('exposes a descriptive aria-label on the container', () => {
    const { container } = render(
      <MarketRange
        level="medium"
        min={42000}
        max={58000}
        sampleSize={12}
        variancePct={20}
      />
    );
    const root = container.querySelector('[data-component="market-range"]');
    expect(root?.getAttribute('aria-label')).toContain('نطاق السوق');
  });
});
