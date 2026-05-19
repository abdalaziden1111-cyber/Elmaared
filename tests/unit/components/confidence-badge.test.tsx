import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from '@/components/ai/confidence-badge';

describe('ConfidenceBadge', () => {
  it('renders the "high" label with sample size', () => {
    render(<ConfidenceBadge level="high" sampleSize={23} variancePct={12.5} />);
    expect(screen.getByText('دقيق جداً')).toBeInTheDocument();
    expect(screen.getByText('(n=23)')).toBeInTheDocument();
  });

  it('renders the "medium" label', () => {
    render(<ConfidenceBadge level="medium" sampleSize={15} variancePct={30} />);
    expect(screen.getByText('دقيق')).toBeInTheDocument();
  });

  it('renders the "low" label', () => {
    render(<ConfidenceBadge level="low" sampleSize={5} variancePct={50} />);
    expect(screen.getByText('تقريبي')).toBeInTheDocument();
  });

  it('renders the "unknown" label and hides the sample-size chip when N=0', () => {
    render(<ConfidenceBadge level="unknown" sampleSize={0} variancePct={null} />);
    expect(screen.getByText('تخمين أولي')).toBeInTheDocument();
    expect(screen.queryByText(/n=/)).not.toBeInTheDocument();
  });

  it('exposes a descriptive aria-label that includes the bucket and sample size', () => {
    render(<ConfidenceBadge level="high" sampleSize={42} variancePct={10} />);
    const chip = screen.getByRole('status');
    expect(chip.getAttribute('aria-label')).toContain('دقيق جداً');
    expect(chip.getAttribute('aria-label')).toContain('42');
  });

  it('falls back to "لا توجد بيانات سوقية كافية" aria copy when sample is empty', () => {
    render(<ConfidenceBadge level="unknown" sampleSize={null} variancePct={null} />);
    const chip = screen.getByRole('status');
    expect(chip.getAttribute('aria-label')).toBe('تخمين أولي');
  });

  it('carries a data-confidence attribute matching the level', () => {
    const { container } = render(
      <ConfidenceBadge level="low" sampleSize={6} variancePct={40} />
    );
    expect(container.querySelector('[data-confidence="low"]')).not.toBeNull();
  });

  it('applies a different chip class per bucket', () => {
    const { container: greenContainer } = render(
      <ConfidenceBadge level="high" sampleSize={20} variancePct={5} />
    );
    const { container: blueContainer } = render(
      <ConfidenceBadge level="medium" sampleSize={10} variancePct={5} />
    );
    const greenChip = greenContainer.querySelector('[data-confidence="high"]');
    const blueChip = blueContainer.querySelector('[data-confidence="medium"]');
    expect(greenChip?.className).toContain('success');
    expect(blueChip?.className).toContain('info');
  });
});
