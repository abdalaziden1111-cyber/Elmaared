import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IdentityBadges } from '@/components/trust/identity-badges';

const allEarned = {
  identityVerified: true,
  zatcaVerified: true,
  govIdVerified: true,
  photoIdUploaded: true,
  referencesCount: 5,
};

const nothingEarned = {
  identityVerified: false,
  zatcaVerified: false,
  govIdVerified: false,
  photoIdUploaded: false,
  referencesCount: 0,
};

describe('IdentityBadges', () => {
  it('renders the loading placeholder when signals is null', () => {
    render(<IdentityBadges signals={null} />);
    expect(screen.getByText(/التحقق من هوية المورد قيد المراجعة/)).toBeInTheDocument();
  });

  it('shows all five badges as earned when every signal is true', () => {
    const { container } = render(<IdentityBadges signals={allEarned} />);
    const items = container.querySelectorAll('[data-earned]');
    expect(items.length).toBe(5);
    items.forEach((el) => expect(el.getAttribute('data-earned')).toBe('true'));
  });

  it('shows the badge count "5 / 5" in the header when all earned', () => {
    render(<IdentityBadges signals={allEarned} />);
    expect(screen.getByText('5 / 5')).toBeInTheDocument();
  });

  it('treats references_count<3 as not-earned for the references badge', () => {
    const partial = { ...nothingEarned, referencesCount: 2 };
    const { container } = render(<IdentityBadges signals={partial} />);
    const refs = container.querySelector('li[data-earned]:nth-child(5)');
    expect(refs?.getAttribute('data-earned')).toBe('false');
  });

  it('renders the descriptor "X مرجع" when references_count>0 but < 3', () => {
    render(<IdentityBadges signals={{ ...nothingEarned, referencesCount: 2 }} />);
    expect(screen.getByText('2 مرجع')).toBeInTheDocument();
  });

  it('renders the compact variant as a horizontal icon row without labels', () => {
    const { container } = render(<IdentityBadges signals={allEarned} compact />);
    const root = container.querySelector('[data-component="identity-badges"]');
    expect(root?.getAttribute('data-variant')).toBe('compact');
    expect(container.querySelectorAll('[data-earned]')).toHaveLength(5);
    // No "توثيق هوية المورد" header in compact mode.
    expect(screen.queryByText('توثيق هوية المورد')).not.toBeInTheDocument();
  });

  it('compact variant exposes earned/not-earned via screen-reader sr-only text', () => {
    render(<IdentityBadges signals={allEarned} compact />);
    // First badge: "سجل تجاري مُتحقَّق (موثّق)" should be in sr-only span
    expect(
      screen.getByText((c) => c.includes('سجل تجاري مُتحقَّق') && c.includes('موثّق')),
    ).toBeInTheDocument();
  });

  it('exposes data-state="loading" on the placeholder so callers can style it', () => {
    const { container } = render(<IdentityBadges signals={null} />);
    expect(
      container.querySelector('[data-component="identity-badges"][data-state="loading"]'),
    ).not.toBeNull();
  });
});
