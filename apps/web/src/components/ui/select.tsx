import { ChevronDown } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** <select> nativo estilizado: melhor acessibilidade e usabilidade no celular do que um menu customizado. */
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'h-11 w-full appearance-none rounded-md border border-border-strong bg-surface pl-3.5 pr-10 text-base text-fg transition-colors hover:border-fg-muted disabled:cursor-not-allowed disabled:bg-surface-muted aria-invalid:border-error',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-fg-muted"
      />
    </div>
  );
}
