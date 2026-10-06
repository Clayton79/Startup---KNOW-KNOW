import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PageMeta } from '@/components/seo/page-meta';

/** Rede de segurança: erros inesperados de renderização/carregamento de rota. */
export function RouteError() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-start justify-center gap-4 px-6 py-12">
      <PageMeta title="Algo deu errado" noindex />
      <h1 className="text-3xl font-extrabold text-brand">
        {isNotFound ? 'Não encontramos essa página' : 'Algo deu errado por aqui'}
      </h1>
      <p className="text-fg-muted">
        {isNotFound
          ? 'O endereço pode ter mudado ou não existir mais.'
          : 'Não foi culpa sua. Recarregue a página; se continuar, volte para o início.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()}>Recarregar</Button>
        <Button variant="outline" asChild>
          <a href="/">Voltar ao início</a>
        </Button>
      </div>
    </main>
  );
}
