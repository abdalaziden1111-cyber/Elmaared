'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField({ label, error, hint, className, id, ...props }, ref) {
    const fieldId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-charcoal)]">
          {label}
        </label>
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
          className={cn(
            'h-11 rounded-xl border bg-white px-3 text-sm transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-blue)]',
            error
              ? 'border-[var(--color-danger)]'
              : 'border-[var(--color-stone-300)] focus-visible:border-[var(--color-action-blue)]',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${fieldId}-error`} className="text-xs text-[var(--color-danger)]">
            {error}
          </p>
        ) : hint ? (
          <p id={`${fieldId}-hint`} className="text-xs text-[var(--color-stone-600)]">
            {hint}
          </p>
        ) : null}
      </div>
    );
  }
);
