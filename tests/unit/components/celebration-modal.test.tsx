import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the milestone action so the test doesn't try to reach Supabase.
vi.mock('@/app/actions/milestones', () => ({
  claimMilestoneAction: vi.fn().mockResolvedValue({
    ok: true,
    data: { alreadyClaimed: false },
  }),
}));

// Lazy-loaded canvas-confetti — mock the default export.
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
});

describe('CelebrationModal', () => {
  it('renders the first_rfq copy when open', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    render(<CelebrationModal open milestone="first_rfq" onClose={() => {}} />);
    expect(screen.getByText('مبروك أول طلب — انطلقتِ!')).toBeInTheDocument();
    expect(
      screen.getByText(/وصل طلبك للمزوّدين/),
    ).toBeInTheDocument();
  });

  it('renders the first_deal copy', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    render(<CelebrationModal open milestone="first_deal" onClose={() => {}} />);
    expect(screen.getByText(/صفقة Elmaared الأولى/)).toBeInTheDocument();
  });

  it('renders the 100k_gmv copy', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    render(<CelebrationModal open milestone="100k_gmv" onClose={() => {}} />);
    // Title contains "١٠٠ ألف ﷼" and body also mentions "100 ألف ﷼" — match title only.
    expect(
      screen.getByText(/١٠٠ ألف ﷼ — أنتِ من رواد Elmaared/),
    ).toBeInTheDocument();
  });

  it('renders the yearly_anniversary copy', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    render(
      <CelebrationModal open milestone="yearly_anniversary" onClose={() => {}} />,
    );
    expect(screen.getByText(/سنة كاملة/)).toBeInTheDocument();
  });

  it('immediately calls onClose when the feature flag is OFF', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: false },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    const close = vi.fn();
    render(<CelebrationModal open milestone="first_rfq" onClose={close} />);
    expect(close).toHaveBeenCalled();
  });

  it('fires onClose when the user clicks "استلام"', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    const close = vi.fn();
    render(<CelebrationModal open milestone="first_rfq" onClose={close} />);
    fireEvent.click(screen.getByRole('button', { name: 'استلام' }));
    expect(close).toHaveBeenCalled();
  });

  it('does NOT render any modal content when open=false', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    render(
      <CelebrationModal open={false} milestone="first_rfq" onClose={() => {}} />,
    );
    expect(screen.queryByText('مبروك أول طلب — انطلقتِ!')).not.toBeInTheDocument();
  });

  it('attaches data-milestone to the modal so tests + analytics can key by it', async () => {
    vi.doMock('@/lib/feature-flags', () => ({
      flags: { CELEBRATION_MODALS: true },
    }));
    const { CelebrationModal } = await import('@/components/trust/celebration-modal');
    const { baseElement } = render(
      <CelebrationModal open milestone="100k_gmv" onClose={() => {}} />,
    );
    const modal = baseElement.querySelector('[data-component="celebration-modal"]');
    expect(modal?.getAttribute('data-milestone')).toBe('100k_gmv');
  });
});
