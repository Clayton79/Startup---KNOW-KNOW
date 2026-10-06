import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { useMe } from '@/features/profile/use-profile';
import { cn } from '@/lib/cn';

const links = [
  { to: '/admin', label: 'Visão geral', end: true },
  { to: '/admin/usuarios', label: 'Usuários', end: false },
  { to: '/admin/denuncias', label: 'Denúncias', end: false },
  { to: '/admin/habilidades', label: 'Habilidades', end: false },
];

/**
 * A checagem de papel aqui só evita mostrar telas que não funcionariam. Quem realmente protege
 * os dados é a API, que confere o papel no banco em cada requisição.
 */
export function AdminLayout() {
  const { data: me } = useMe();
  if (me && me.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageMeta title="Administração" noindex />
      <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Administração</h1>
      <nav
        aria-label="Administração"
        className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1"
      >
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              cn(
                'min-h-11 shrink-0 rounded-md px-4 py-2.5 text-sm font-semibold text-fg-muted',
                isActive && 'bg-surface text-brand shadow-sm',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
