import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AIOverride } from '@/components/ai/ai-override';

describe('AIOverride', () => {
  it('renders the AI suggestion chip and the wrapped input', () => {
    render(
      <AIOverride
        aiSuggestion="42,000 ﷼"
        userValueDiffers={false}
        onResetToAi={() => {}}
      >
        <input data-testid="my-input" defaultValue="42000" />
      </AIOverride>
    );
    expect(screen.getByText('اقتراح AI:')).toBeInTheDocument();
    expect(screen.getByText('42,000 ﷼')).toBeInTheDocument();
    expect(screen.getByTestId('my-input')).toBeInTheDocument();
  });

  it('hides the "override active" banner when userValueDiffers is false', () => {
    const { container } = render(
      <AIOverride
        aiSuggestion="42,000 ﷼"
        userValueDiffers={false}
        onResetToAi={() => {}}
      >
        <input />
      </AIOverride>
    );
    expect(
      container.querySelector('[data-component="ai-override-active"]')
    ).toBeNull();
  });

  it('shows the "override active" banner with reset button when userValueDiffers', () => {
    render(
      <AIOverride
        aiSuggestion="42,000 ﷼"
        userValueDiffers={true}
        onResetToAi={() => {}}
      >
        <input />
      </AIOverride>
    );
    expect(screen.getByText(/تجاوزت اقتراح AI/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /استعد اقتراح AI/ })
    ).toBeInTheDocument();
  });

  it('fires onResetToAi when reset button is clicked', () => {
    const reset = vi.fn();
    render(
      <AIOverride
        aiSuggestion="42,000 ﷼"
        userValueDiffers={true}
        onResetToAi={reset}
      >
        <input />
      </AIOverride>
    );
    fireEvent.click(screen.getByRole('button', { name: /استعد اقتراح AI/ }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('renders an optional label above the chip', () => {
    render(
      <AIOverride
        aiSuggestion="42,000 ﷼"
        userValueDiffers={false}
        onResetToAi={() => {}}
        label="الميزانية المقترحة"
      >
        <input />
      </AIOverride>
    );
    expect(screen.getByText('الميزانية المقترحة')).toBeInTheDocument();
  });
});
