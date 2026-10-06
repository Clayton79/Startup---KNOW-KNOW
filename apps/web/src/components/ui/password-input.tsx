import { Eye, EyeOff } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import { Input } from './input';

/** Campo de senha com botão para mostrar/ocultar (acessível por teclado e leitor de tela). */
export function PasswordInput({
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-12', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-fg-muted hover:text-fg"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  );
}
