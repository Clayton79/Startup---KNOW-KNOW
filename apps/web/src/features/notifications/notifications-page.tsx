import { Bell, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageMeta } from '@/components/seo/page-meta';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/cn';
import { formatTimeAgo } from '@/lib/datetime';
import { useMarkAllRead, useMarkRead, useNotifications } from './use-notifications';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useNotifications(page);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const hasUnread = data?.items.some((item) => !item.read) ?? false;

  const readAll = async () => {
    try {
      await markAll.mutateAsync();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title="Notificações" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Notificações</h1>
        {hasUnread ? (
          <Button
            variant="outline"
            size="sm"
            loading={markAll.isPending}
            onClick={() => void readAll()}
          >
            <CheckCheck aria-hidden="true" className="size-4" />
            Marcar todas como lidas
          </Button>
        ) : null}
      </div>

      {isPending ? (
        <div className="space-y-2" aria-busy="true">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nada por aqui ainda"
          description="Quando alguém pedir uma aula com você, responder a um pedido ou deixar uma avaliação, avisamos aqui."
        />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {data.items.map((item) => {
              const content = (
                <div className={cn('flex gap-4 p-4', !item.read && 'bg-primary-soft/60')}>
                  {item.actor ? (
                    <Avatar name={item.actor.displayName} src={item.actor.avatarUrl} size="md" />
                  ) : (
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
                      <Bell aria-hidden="true" className="size-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {item.title}
                      {!item.read ? <span className="sr-only"> (não lida)</span> : null}
                    </p>
                    <p className="text-fg-muted">{item.body}</p>
                    <p className="mt-1 text-xs text-fg-muted">{formatTimeAgo(item.createdAt)}</p>
                  </div>
                  {!item.read ? (
                    <span
                      aria-hidden="true"
                      className="mt-2 size-2.5 shrink-0 rounded-full bg-primary"
                    />
                  ) : null}
                </div>
              );

              return (
                <li key={item.id}>
                  {item.link ? (
                    <Link
                      to={item.link}
                      className="block hover:bg-surface-muted"
                      onClick={() => !item.read && markRead.mutate(item.id)}
                    >
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>

          {totalPages > 1 ? (
            <nav aria-label="Páginas de notificações" className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Mais novas
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
                Mais antigas
              </Button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}
