import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

let pending = false;
vi.mock('react-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-dom');
  return {
    ...actual,
    useFormStatus: () => ({ pending }),
  };
});

beforeEach(() => {
  pending = false;
  vi.resetModules();
});

describe('SubmitButton', () => {
  it('renders children', async () => {
    const { SubmitButton } = await import('@/components/ui/submit-button');
    render(<SubmitButton>تسجيل الدخول</SubmitButton>);
    expect(screen.getByRole('button')).toHaveTextContent('تسجيل الدخول');
  });

  it('is type=submit by default', async () => {
    const { SubmitButton } = await import('@/components/ui/submit-button');
    render(<SubmitButton>Go</SubmitButton>);
    const btn = screen.getByRole('button') as HTMLButtonElement;
    expect(btn.type).toBe('submit');
  });

  it('disabled prop honors caller intent', async () => {
    const { SubmitButton } = await import('@/components/ui/submit-button');
    render(<SubmitButton disabled>Go</SubmitButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disabled while form is pending', async () => {
    pending = true;
    const { SubmitButton } = await import('@/components/ui/submit-button');
    render(<SubmitButton>Go</SubmitButton>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders spinner while pending', async () => {
    pending = true;
    const { SubmitButton } = await import('@/components/ui/submit-button');
    const { container } = render(<SubmitButton>Go</SubmitButton>);
    // Loader2 from lucide-react renders an svg
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('does not render spinner when not pending', async () => {
    pending = false;
    const { SubmitButton } = await import('@/components/ui/submit-button');
    const { container } = render(<SubmitButton>Go</SubmitButton>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('accepts and applies className override', async () => {
    const { SubmitButton } = await import('@/components/ui/submit-button');
    render(<SubmitButton className="extra-class">Go</SubmitButton>);
    expect(screen.getByRole('button').className).toContain('extra-class');
  });
});
