import { MessageSquareHeart, Star } from 'lucide-react';
import { useState } from 'react';
import { PageMeta } from '@/components/seo/page-meta';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/features/profile/use-profile';
import { formatReputation } from '@/lib/format';
import { ReviewDialog } from './review-dialog';
import { ReviewItem } from './review-item';
import { usePendingReviews, useReceivedReviews } from './use-reviews';

function PendingList() {
  const { data, isPending, isError, error, refetch } = usePendingReviews();
  const [active, setActive] = useState<string | null>(null);

  if (isPending) return <Skeleton className="h-20 w-full" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong bg-surface p-5 text-fg-muted">
        Você está em dia com as avaliações. 🎉
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li
          key={item.sessionId}
          className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-4"
        >
          <Avatar name={item.other.displayName} src={item.other.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {item.skillName} com {item.other.displayName}
            </p>
            <p className="text-sm text-fg-muted">
              {item.direction === 'STUDENT_TO_MENTOR'
                ? 'Como foi aprender com essa pessoa?'
                : 'Como foi ensinar essa pessoa?'}
            </p>
          </div>
          <Button onClick={() => setActive(item.sessionId)}>
            <Star aria-hidden="true" className="size-4" />
            Avaliar
          </Button>
          <ReviewDialog
            sessionId={item.sessionId}
            direction={item.direction}
            personName={item.other.displayName}
            open={active === item.sessionId}
            onOpenChange={(open) => setActive(open ? item.sessionId : null)}
          />
        </li>
      ))}
    </ul>
  );
}

function ReceivedList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch } = useReceivedReviews(page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  if (isPending) return <Skeleton className="h-28 w-full" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.items.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareHeart}
        title="Você ainda não recebeu avaliações"
        description="Depois de uma aula concluída, quem participou pode avaliar. Elas aparecem aqui e no seu perfil."
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-3">
        {data.items.map((review) => (
          <li key={review.id}>
            <ReviewItem review={review} />
          </li>
        ))}
      </ul>
      {totalPages > 1 ? (
        <nav aria-label="Páginas de avaliações" className="flex items-center justify-between">
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
    </div>
  );
}

export function ReviewsPage() {
  const { data: me } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageMeta title="Avaliações" noindex />
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Avaliações</h1>
        {me ? (
          <p className="flex items-center gap-1.5 font-semibold">
            <Star aria-hidden="true" className="size-4 text-credit" />
            Sua reputação: {formatReputation(me.reputation)}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="pendentes" className="space-y-3">
        <h2 id="pendentes" className="text-xl font-bold">
          Para você avaliar
        </h2>
        <PendingList />
      </section>

      <section aria-labelledby="recebidas" className="space-y-3">
        <h2 id="recebidas" className="text-xl font-bold">
          Que você recebeu
        </h2>
        <ReceivedList />
      </section>
    </div>
  );
}
