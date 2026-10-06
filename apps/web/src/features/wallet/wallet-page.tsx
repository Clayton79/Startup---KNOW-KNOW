import { ArrowDownLeft, ArrowUpRight, Coins, Hourglass } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { usePublicConfig } from '@/features/config/use-public-config';
import { cn } from '@/lib/cn';
import { formatDay, formatTime } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { TRANSACTION_TYPE_LABEL } from '@/lib/labels';
import { useTransactions, useWallet } from './use-wallet';

function BalanceCard() {
  const { data: wallet, isPending, isError, error, refetch } = useWallet();
  const { data: config } = usePublicConfig();

  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  return (
    <Card className="space-y-5 bg-brand text-primary-foreground">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-secondary/80">
          <Coins aria-hidden="true" className="size-4" />
          Disponível para usar
        </p>
        {isPending ? (
          <Skeleton className="h-12 w-40 bg-brand-soft" />
        ) : (
          <p className="text-5xl font-extrabold text-credit">{wallet?.available ?? 0}</p>
        )}
      </div>

      {wallet && wallet.held > 0 ? (
        <p className="flex items-start gap-2 rounded-md bg-brand-soft p-3 text-sm">
          <Hourglass aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            {formatCredits(wallet.held)} estão reservados para aulas que ainda não aconteceram. Se a
            aula for recusada ou cancelada, eles voltam para você.
          </span>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-primary-foreground/80">
          {config ? `1 hora de aula = ${formatCredits(config.creditsPerHour)}` : null}
        </p>
        <Button asChild variant="onBrand">
          <Link to="/explorar">Usar créditos para aprender</Link>
        </Button>
      </div>
    </Card>
  );
}

export function WalletPage() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError, error, refetch, isPlaceholderData } = useTransactions(page);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageMeta title="Carteira" noindex />
      <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Carteira</h1>

      <BalanceCard />

      <section aria-labelledby="historico" className="space-y-3">
        <h2 id="historico" className="text-xl font-bold">
          Histórico
        </h2>

        {isPending ? (
          <div className="space-y-2" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : data.items.length === 0 ? (
          <EmptyState
            icon={Coins}
            title="Ainda não há movimentações"
            description="Quando você ensinar ou assistir uma aula, cada movimentação aparece aqui."
          />
        ) : (
          <>
            <ul
              className={cn(
                'divide-y divide-border rounded-lg border border-border bg-surface',
                isPlaceholderData && 'opacity-60',
              )}
            >
              {data.items.map((item) => {
                const positive = item.amount > 0;
                return (
                  <li key={item.id} className="flex items-center gap-4 p-4">
                    <span
                      className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                        positive
                          ? 'bg-success-soft text-success'
                          : 'bg-surface-muted text-fg-muted',
                      )}
                    >
                      {positive ? (
                        <ArrowDownLeft aria-hidden="true" className="size-5" />
                      ) : (
                        <ArrowUpRight aria-hidden="true" className="size-5" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{item.description}</p>
                      <p className="text-sm text-fg-muted">
                        {TRANSACTION_TYPE_LABEL[item.type]} · {formatDay(item.createdAt)},{' '}
                        {formatTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn('font-bold', positive ? 'text-success' : 'text-fg')}>
                        {positive ? '+' : '−'}
                        {Math.abs(item.amount)}
                      </p>
                      <p className="text-xs text-fg-muted">saldo {item.balanceAfter}</p>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 ? (
              <nav aria-label="Páginas do histórico" className="flex items-center justify-between">
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
          </>
        )}
      </section>
    </div>
  );
}
