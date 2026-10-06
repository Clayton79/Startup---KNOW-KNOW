import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <PageMeta title="Página não encontrada" noindex />
      <p className="text-sm font-bold uppercase tracking-wider text-primary-strong">Erro 404</p>
      <h1 className="text-3xl font-extrabold text-brand sm:text-4xl">
        Não encontramos essa página
      </h1>
      <p className="text-fg-muted">
        O endereço pode ter mudado ou não existir mais. Que tal explorar o que as pessoas podem
        ensinar?
      </p>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">Voltar ao início</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/explorar">Explorar conhecimentos</Link>
        </Button>
      </div>
    </section>
  );
}
