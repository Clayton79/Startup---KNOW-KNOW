import { CalendarPlus, Inbox } from 'lucide-react';
import { Tabs } from 'radix-ui';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { SessionCard } from './session-card';
import { useSessions } from './use-sessions';

const TABS = [
  { value: 'upcoming', label: 'Próximas', empty: 'Você ainda não tem nenhuma aula agendada.' },
  { value: 'pending', label: 'Pedidos', empty: 'Nenhum pedido aguardando resposta.' },
  {
    value: 'past',
    label: 'Anteriores',
    empty: 'Suas aulas concluídas e canceladas aparecem aqui.',
  },
] as const;

type TabValue = (typeof TABS)[number]['value'];

function SessionList({ scope }: { scope: TabValue }) {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useSessions({ scope, page, pageSize: 10 });
  const tab = TABS.find((item) => item.value === scope);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={scope === 'pending' ? Inbox : CalendarPlus}
        title={tab?.empty ?? 'Nada por aqui'}
        description={
          scope === 'upcoming'
            ? 'Encontre alguém que ensina o que você quer aprender e peça uma aula.'
            : undefined
        }
        action={
          scope === 'upcoming' ? (
            <Button asChild>
              <Link to="/explorar">Encontrar alguém para aprender</Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {data.items.map((session) => (
          <li key={session.id}>
            <SessionCard session={session} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <nav aria-label="Páginas de aulas" className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Anteriores
          </Button>
          <span className="text-sm text-fg-muted">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próximas
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

export function SessionsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('aba');
  const current: TabValue = TABS.some((tab) => tab.value === requested)
    ? (requested as TabValue)
    : 'upcoming';

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title="Minhas aulas" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Minhas aulas</h1>
        <Button asChild>
          <Link to="/explorar">Encontrar alguém</Link>
        </Button>
      </div>

      <Tabs.Root
        value={current}
        onValueChange={(value) => setParams({ aba: value }, { replace: true })}
      >
        <Tabs.List
          aria-label="Filtrar aulas"
          className="mb-4 flex gap-1 rounded-lg bg-surface-muted p-1"
        >
          {TABS.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'min-h-11 flex-1 rounded-md px-3 text-sm font-semibold text-fg-muted transition-colors',
                'data-[state=active]:bg-surface data-[state=active]:text-brand data-[state=active]:shadow-sm',
              )}
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {TABS.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value} className="outline-none">
            <SessionList scope={tab.value} />
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  );
}
