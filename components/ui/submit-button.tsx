'use client';

import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

interface SubmitButtonProps {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SubmitButton({ children, className, disabled }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={cn(
        'inline-flex h-11 items-center justify-center gap-2 rounded-xl px-6 text-sm font-medium transition-colors',
        'bg-[var(--color-action-blue)] text-[var(--color-cream)] hover:bg-[var(--color-action-blue-700)]',
        'disabled:cursor-not-allowed disabled:opacity-60',
        className
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {children}
    </button>
  );
}
