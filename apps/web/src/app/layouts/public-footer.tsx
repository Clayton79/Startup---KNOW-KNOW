import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/brand/logo';

const columns = [
  {
    title: 'Plataforma',
    links: [
      { to: '/como-funciona', label: 'Como funciona' },
      { to: '/explorar', label: 'Explorar conhecimentos' },
      { to: '/cadastro', label: 'Criar conta' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacidade', label: 'Política de privacidade' },
      { to: '/termos', label: 'Termos de uso' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="bg-brand text-secondary">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <BrandLogo tone="light" />
          <p className="max-w-xs text-sm text-secondary/80">
            Troca de conhecimento que transforma.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-secondary/70">
              {column.title}
            </h2>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="rounded-sm text-secondary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-secondary/15">
        <p className="mx-auto max-w-6xl px-4 py-5 text-sm text-secondary/70 sm:px-6">
          © {new Date().getFullYear()} KNOW-KNOW. Projeto acadêmico de ADS. Os perfis exibidos na
          demonstração são fictícios.
        </p>
      </div>
    </footer>
  );
}
