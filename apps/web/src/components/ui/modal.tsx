import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Button } from './button';

/**
 * Diálogo acessível (foco preso, Esc fecha, retorna o foco ao gatilho). No celular ocupa a
 * largura toda, ancorado embaixo, o que é mais fácil de usar com o polegar.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  // Diálogos controlados por estado não têm <Dialog.Trigger>, então guardamos quem abriu
  // para devolver o foco a esse elemento ao fechar (WCAG 2.4.3).
  const invokerRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand/50" />
        <Dialog.Content
          // Sem descrição, desliga o vínculo automático para o Radix não apontar para um id inexistente.
          {...(description ? {} : { 'aria-describedby': undefined })}
          onOpenAutoFocus={() => {
            invokerRef.current = document.activeElement as HTMLElement | null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            invokerRef.current?.focus();
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-xl bg-surface shadow-lg sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl',
            size === 'md' ? 'sm:max-w-lg' : 'sm:max-w-2xl',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="space-y-1">
              <Dialog.Title className="text-xl font-extrabold text-brand">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-fg-muted">{description}</Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar" className="-mr-2 -mt-2">
                <X aria-hidden="true" className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <div className="space-y-4 overflow-y-auto p-5">{children}</div>
          {footer ? (
            <div className="flex flex-col-reverse gap-2 border-t border-border p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end">
              {footer}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
