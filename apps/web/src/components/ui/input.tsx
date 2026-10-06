import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const fieldClasses =
  'w-full rounded-md border border-border-strong bg-surface px-3.5 text-base text-fg placeholder:text-fg-muted/80 transition-colors hover:border-fg-muted disabled:cursor-not-allowed disabled:bg-surface-muted aria-invalid:border-error';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, 'h-11', className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, 'min-h-28 py-2.5', className)} {...props} />;
}
