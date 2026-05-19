import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock the server action so the toggle tests don't try to reach Supabase.
const updateMock = vi.fn().mockResolvedValue({ ok: true });
vi.mock('@/app/actions/cultural-preferences', () => ({
  updateCulturalPreferencesAction: updateMock,
}));

beforeEach(() => {
  updateMock.mockClear();
});

describe('HijriToggle', () => {
  it('marks the active preference with aria-pressed', async () => {
    const { HijriToggle } = await import('@/components/cultural/preference-toggles');
    render(<HijriToggle value="hijri" />);
    const hijriBtn = screen.getByRole('button', { pressed: true });
    expect(hijriBtn.textContent).toContain('هجري');
  });

  it('calls the server action with the new value when the inactive button is clicked', async () => {
    const { HijriToggle } = await import('@/components/cultural/preference-toggles');
    render(<HijriToggle value="hijri" />);
    fireEvent.click(screen.getByRole('button', { name: /ميلادي/ }));
    expect(updateMock).toHaveBeenCalledWith({ calendar: 'gregorian' });
  });

  it('skips the action when the user clicks the already-active option', async () => {
    const { HijriToggle } = await import('@/components/cultural/preference-toggles');
    render(<HijriToggle value="hijri" />);
    fireEvent.click(screen.getByRole('button', { name: /هجري/ }));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('shows examples ١٥ شعبان and ٢٤ فبراير so the user sees the format before flipping', async () => {
    const { HijriToggle } = await import('@/components/cultural/preference-toggles');
    render(<HijriToggle value="hijri" />);
    expect(screen.getByText('١٥ شعبان ١٤٤٧')).toBeInTheDocument();
    expect(screen.getByText('٢٤ فبراير ٢٠٢٦')).toBeInTheDocument();
  });
});

describe('NumeralsToggle', () => {
  it('marks the active preference with aria-pressed', async () => {
    const { NumeralsToggle } = await import('@/components/cultural/preference-toggles');
    render(<NumeralsToggle value="arabic-indic" />);
    const btn = screen.getByRole('button', { pressed: true });
    expect(btn.textContent).toContain('عربية');
  });

  it('calls the server action with the new numerals value', async () => {
    const { NumeralsToggle } = await import('@/components/cultural/preference-toggles');
    render(<NumeralsToggle value="arabic-indic" />);
    fireEvent.click(screen.getByRole('button', { name: /لاتينية/ }));
    expect(updateMock).toHaveBeenCalledWith({ numerals: 'latin' });
  });

  it('shows both example numeral renderings', async () => {
    const { NumeralsToggle } = await import('@/components/cultural/preference-toggles');
    render(<NumeralsToggle value="latin" />);
    expect(screen.getByText('١٢٣')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('calls onChange optimistically before the server roundtrip', async () => {
    const onChange = vi.fn();
    const { NumeralsToggle } = await import('@/components/cultural/preference-toggles');
    render(<NumeralsToggle value="arabic-indic" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /لاتينية/ }));
    expect(onChange).toHaveBeenCalledWith('latin');
  });
});
