import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { AvailabilitySummary } from '@/features/availability/availability-summary';
import { useMe } from '@/features/profile/use-profile';
import { dayKey, formatDay, formatRelativeDay } from '@/lib/datetime';
import { SessionCard } from './session-card';
import { useSessions } from './use-sessions';

/** Agenda: aulas confirmadas dos próximos 30 dias agrupadas por dia + seus horários semanais. */
export function AgendaPage() {
  const params = useMemo(() => {
    const now = new Date();
    const to = new Date(now.getTime() + 30 * 86_400_000);
    return {
      scope: 'upcoming' as const,
      from: new Date(now.getTime() - 3600_000).toISOString(),
      to: to.toISOString(),
      pageSize: 50,
    };
  }, []);
  const { data, isPending, isError, error, refetch } = useSessions(params);
  const { data: me } = useMe();

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>['items']>();
    for (const session of data?.items ?? []) {
      const key = dayKey(session.startsAt);
      map.set(key, [...(map.get(key) ?? []), session]);
    }
    return [...map.entries()];
  }, [data]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageMeta title="Agenda" noindex />
      <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Agenda</h1>

      <section aria-labelledby="proximos-30" className="space-y-4">
        <h2 id="proximos-30" className="text-xl font-bold">
          Próximos 30 dias
        </h2>
        {isPending ? (
          <div className="space-y-3" aria-busy="true">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => void refetch()} />
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nenhuma aula marcada para os próximos dias"
            description="Quando você combinar uma aula, ela aparece aqui, organizada por dia."
            action={
              <Button asChild>
                <Link to="/explorar">Encontrar alguém para aprender</Link>
              </Button>
            }
          />
        ) : (
          grouped.map(([key, sessions]) => (
            <div key={key} className="space-y-2">
              <h3 className="flex items-baseline gap-2 font-bold capitalize">
                {formatRelativeDay(sessions[0]!.startsAt)}
                <span className="text-sm font-normal normal-case text-fg-muted">
                  {formatDay(sessions[0]!.startsAt)}
                </span>
              </h3>
              <ul className="space-y-3">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <SessionCard session={session} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section
        aria-labelledby="meus-horarios"
        className="space-y-3 rounded-lg border border-border bg-surface p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="meus-horarios" className="text-xl font-bold">
            Meus horários semanais
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/perfil/editar">Editar</Link>
          </Button>
        </div>
        {me ? (
          <AvailabilitySummary rules={me.availability} />
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </section>
    </div>
  );
}
