import { Link, NavLink, Outlet } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { MobileMenu } from './mobile-menu';
import { PublicFooter } from './public-footer';

export const publicNavItems = [
  { to: '/como-funciona', label: 'Como funciona' },
  { to: '/explorar', label: 'Explorar' },
] as const;

/**
 * `padded`: páginas "de app" que também são públicas (ex.: Explorar) precisam de margem lateral;
 * as páginas de marketing (landing) controlam o próprio espaçamento por seção.
 */
export function PublicLayout({ padded = false }: { padded?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#conteudo"
        className="sr-only-focusable fixed left-4 top-4 z-50 rounded-md bg-surface px-4 py-2 font-semibold text-brand shadow-md"
      >
        Pular para o conteúdo
      </a>

      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <BrandLogo />

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {publicNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg',
                    isActive && 'text-brand',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild>
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link to="/cadastro">Começar gratuitamente</Link>
            </Button>
          </div>

          <MobileMenu />
        </div>
      </header>

      <main id="conteudo" className={cn('flex-1', padded && 'px-4 py-8 sm:px-6')}>
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}
