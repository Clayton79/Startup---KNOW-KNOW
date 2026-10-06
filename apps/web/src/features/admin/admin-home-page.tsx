import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { adminApi } from './admin-api';

function Stats() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminApi.stats,
  });
  if (isPending) return <Skeleton className="h-28 w-full" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const items = [
    ['Usuários', data.users],
    ['Ativos', data.activeUsers],
    ['Aulas concluídas', data.sessionsCompleted],
    ['Em revisão', data.sessionsDisputed],
    ['Denúncias abertas', data.openReports],
    ['Créditos em circulação', data.creditsInCirculation],
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-surface p-4">
          <dt className="text-sm font-semibold text-fg-muted">{label}</dt>
          <dd className="text-2xl font-extrabold text-brand">{value.toLocaleString('pt-BR')}</dd>
        </div>
      ))}
    </dl>
  );
}

function Disputes() {
  const queryClient = useQueryClient();
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'disputes'],
    queryFn: adminApi.disputes,
  });
  const resolve = useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'COMPLETE' | 'CANCEL' }) =>
      adminApi.resolveSession(id, outcome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin'] }),
  });

  const act = async (id: string, outcome: 'COMPLETE' | 'CANCEL') => {
    try {
      await resolve.mutateAsync({ id, outcome });
      toast.success(
        outcome === 'COMPLETE'
          ? 'Aula concluída e créditos pagos.'
          : 'Aula cancelada e créditos devolvidos.',
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (isPending) return <Skeleton className="h-24 w-full" />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong bg-surface p-5 text-fg-muted">
        Nenhuma aula em revisão.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((item) => (
        <li key={item.id}>
          <Card className="space-y-3">
            <div>
              <p className="font-bold">
                {item.skillName}: {item.mentor.displayName} (mentor) × {item.student.displayName}{' '}
                (aluno)
              </p>
              <p className="text-sm text-fg-muted">
                {formatDateTime(item.startsAt)} · {item.durationMinutes} min ·{' '}
                {formatCredits(item.creditCost)} reservados
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                loading={resolve.isPending}
                onClick={() => void act(item.id, 'COMPLETE')}
              >
                Concluir e pagar mentor
              </Button>
              <Button
                size="sm"
                variant="outline"
                loading={resolve.isPending}
                onClick={() => void act(item.id, 'CANCEL')}
              >
                Cancelar e devolver ao aluno
              </Button>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function AdminHomePage() {
  return (
    <div className="space-y-6">
      <Stats />
      <section aria-labelledby="revisao" className="space-y-3">
        <h2 id="revisao" className="text-xl font-bold">
          Aulas em revisão
        </h2>
        <p className="text-fg-muted">
          Nesses casos, as duas pessoas responderam diferente sobre a aula acontecer. Os créditos
          ficam reservados até uma decisão.
        </p>
        <Disputes />
      </section>
    </div>
  );
}
