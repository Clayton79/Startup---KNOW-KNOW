import { Menu, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';

const links = [
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/explorar', label: 'Explorar conhecimentos' },
  { to: '/login', label: 'Entrar' },
];

/** Menu do celular: não depende de hover, fecha com Esc e prende o foco enquanto aberto. */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
          <Menu aria-hidden="true" className="size-6" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-brand/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(20rem,100%)] flex-col gap-6 bg-surface p-5 shadow-lg"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild>
              <BrandLogo />
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar menu">
                <X aria-hidden="true" className="size-6" />
              </Button>
            </Dialog.Close>
          </div>

          <nav aria-label="Menu" className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={close}
                className="rounded-md px-3 py-3 text-lg font-semibold text-fg hover:bg-surface-muted"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <Button asChild size="lg" className="mt-auto">
            <Link to="/cadastro" onClick={close}>
              Começar gratuitamente
            </Link>
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
