import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from '@/components/ui/form-field';

describe('FormField', () => {
  it('renders label + input together', () => {
    render(<FormField label="البريد الإلكتروني" name="email" />);
    expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument();
  });

  it('uses provided id when given', () => {
    render(<FormField label="Phone" name="phone" id="my-phone" />);
    const input = screen.getByLabelText('Phone');
    expect(input.id).toBe('my-phone');
  });

  it('falls back to name as id', () => {
    render(<FormField label="Email" name="email-input" />);
    const input = screen.getByLabelText('Email');
    expect(input.id).toBe('email-input');
  });

  it('renders error message and aria-invalid when error provided', () => {
    render(<FormField label="Field" name="x" error="حقل مطلوب" />);
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('حقل مطلوب')).toBeInTheDocument();
  });

  it('aria-describedby points at the error id', () => {
    render(<FormField label="Field" name="x" error="حقل مطلوب" />);
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-describedby', 'x-error');
  });

  it('renders hint when no error', () => {
    render(<FormField label="Field" name="x" hint="أرقام فقط" />);
    expect(screen.getByText('أرقام فقط')).toBeInTheDocument();
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-describedby', 'x-hint');
  });

  it('error takes precedence over hint', () => {
    render(
      <FormField
        label="Field"
        name="x"
        hint="hint text"
        error="error text"
      />
    );
    expect(screen.getByText('error text')).toBeInTheDocument();
    expect(screen.queryByText('hint text')).not.toBeInTheDocument();
  });

  it('passes type, placeholder, and required to underlying input', () => {
    render(
      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="name@x.co"
        required
      />
    );
    const input = screen.getByLabelText('Email') as HTMLInputElement;
    expect(input.type).toBe('email');
    expect(input.placeholder).toBe('name@x.co');
    expect(input.required).toBe(true);
  });

  it('does not set aria-invalid when no error', () => {
    render(<FormField label="Field" name="x" />);
    const input = screen.getByLabelText('Field');
    expect(input).toHaveAttribute('aria-invalid', 'false');
  });

  it('renders neither error nor hint when both omitted', () => {
    const { container } = render(<FormField label="Field" name="x" />);
    expect(container.querySelector('p')).toBeNull();
  });
});
