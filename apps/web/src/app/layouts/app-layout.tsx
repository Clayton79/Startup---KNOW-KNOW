import { LogOut } from 'lucide-react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { BrandLogo } from '@/components/brand/logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { HeaderBell } from '@/features/notifications/header-bell';
import { useMe } from '@/features/profile/use-profile';
import { WalletPill } from '@/features/wallet/wallet-pill';
import { cn } from '@/lib/cn';
import { adminNavItem, bottomNavItems, sidebarExtraItems, type NavItem } from './app-nav';

function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2.5 font-semibold transition-colors',
          isActive
            ? 'bg-primary-soft text-primary-strong'
            : 'text-fg-muted hover:bg-surface-muted hover:text-fg',
        )
      }
    >
      <item.icon aria-hidden="true" className="size-5" />
      {item.label}
    </NavLink>
  );
}

/** Estrutura do app logado: sidebar no desktop; barra superior + inferior no celular. */
export function AppLayout() {
  const { data: me } = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      void navigate('/', { replace: true });
    } catch {
      toast.error('Não conseguimos sair agora. Tente de novo.');
    }
  };

  const desktopItems = [...bottomNavItems, ...sidebarExtraItems];
  if (me?.role === 'ADMIN') desktopItems.push(adminNavItem);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#conteudo"
        className="sr-only-focusable fixed left-4 top-4 z-50 rounded-md bg-surface px-4 py-2 font-semibold text-brand shadow-md"
      >
        Pular para o conteúdo
      </a>

      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-border bg-surface p-4 lg:flex">
        <BrandLogo to="/dashboard" className="px-2" />
        <nav aria-label="Principal" className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {desktopItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="space-y-3 border-t border-border pt-4">
          <WalletPill />
          {me ? (
            <Link
              to="/perfil"
              className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-muted"
            >
              <Avatar name={me.displayName} src={me.avatarUrl} size="sm" />
              <span className="min-w-0 truncate font-semibold">{me.displayName}</span>
            </Link>
          ) : null}
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => void handleSignOut()}
          >
            <LogOut aria-hidden="true" className="size-5" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior (celular) */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
          <BrandLogo to="/dashboard" />
          <div className="flex items-center gap-2">
            <WalletPill compact />
            <HeaderBell />
          </div>
        </header>

        {/* Barra de topo (desktop) */}
        <header className="hidden items-center justify-end gap-3 px-8 pt-6 lg:flex">
          <HeaderBell />
        </header>

        <main id="conteudo" className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-4">
          <Outlet />
        </main>
      </div>

      {/* Navegação inferior (celular) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors',
                isActive ? 'text-primary-strong' : 'text-fg-muted',
              )
            }
          >
            <item.icon aria-hidden="true" className="size-6" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
