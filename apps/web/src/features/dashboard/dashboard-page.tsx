import type { DashboardView } from '@know-know/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  CalendarPlus,
  Coins,
  GraduationCap,
  Hourglass,
  Star,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { MentorCard } from '@/features/explore/mentor-card';
import { useMe } from '@/features/profile/use-profile';
import { SessionCard } from '@/features/sessions/session-card';
import { api } from '@/lib/api-client';

function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardView>('/dashboard'),
    staleTime: 15_000,
  });
}

function StatTile({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm font-semibold text-fg-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-brand">{value}</p>
      {hint ? <p className="text-xs text-fg-muted">{hint}</p> : null}
    </div>
  );
}

function NextSession({
  title,
  icon: Icon,
  session,
  emptyText,
  emptyAction,
}: {
  title: string;
  icon: typeof GraduationCap;
  session: DashboardView['nextLearning'];
  emptyText: string;
  emptyAction?: ReactNode;
}) {
  return (
    <section className="space-y-2" aria-label={title}>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Icon aria-hidden="true" className="size-5 text-primary-strong" />
        {title}
      </h2>
      {session ? (
        <SessionCard session={session} />
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-5">
          <p className="text-fg-muted">{emptyText}</p>
          {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
        </div>
      )}
    </section>
  );
}

export function DashboardPage() {
  const { data: me } = useMe();
  const { data, isPending, isError, error, refetch } = useDashboard();
  const firstName = me?.displayName.split(' ')[0];

  const pendingItems = data
    ? [
        data.pending.requestsForMe > 0 && {
          to: '/aulas?aba=pending',
          text: `${data.pending.requestsForMe} ${data.pending.requestsForMe === 1 ? 'pedido espera' : 'pedidos esperam'} sua resposta`,
        },
        data.pending.awaitingMyConfirmation > 0 && {
          to: '/aulas?aba=past',
          text: `Confirme ${data.pending.awaitingMyConfirmation === 1 ? 'uma aula que terminou' : `${data.pending.awaitingMyConfirmation} aulas que terminaram`}`,
        },
        data.pending.reviewsToWrite > 0 && {
          to: '/avaliacoes',
          text: `${data.pending.reviewsToWrite} ${data.pending.reviewsToWrite === 1 ? 'avaliação para fazer' : 'avaliações para fazer'}`,
        },
      ].filter((item): item is { to: string; text: string } => Boolean(item))
    : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageMeta title="Início" noindex />

      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">
          Olá{firstName ? `, ${firstName}` : ''} <span aria-hidden="true">👋</span>
        </h1>
        <p className="text-fg-muted">Veja o que está acontecendo com o seu conhecimento.</p>
      </header>

      {isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <>
          {pendingItems.length > 0 ? (
            <section aria-label="Pendências" className="space-y-2">
              <h2 className="sr-only">O que espera por você</h2>
              <ul className="space-y-2">
                {pendingItems.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="flex items-center justify-between gap-3 rounded-lg border border-warning bg-warning-soft p-4 font-semibold text-warning hover:opacity-90"
                    >
                      <span className="flex items-center gap-2">
                        <Bell aria-hidden="true" className="size-5" />
                        {item.text}
                      </span>
                      <ArrowRight aria-hidden="true" className="size-5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <Card className="flex flex-wrap items-center justify-between gap-4 bg-brand text-primary-foreground">
            <div className="space-y-1">
              <p className="flex items-center gap-2 text-sm font-semibold text-secondary/80">
                <Coins aria-hidden="true" className="size-4" />
                Seu saldo
              </p>
              <p className="text-4xl font-extrabold text-credit">
                {data.wallet.available}{' '}
                <span className="text-lg font-bold text-primary-foreground">
                  {data.wallet.available === 1 ? 'crédito' : 'créditos'}
                </span>
              </p>
              {data.wallet.held > 0 ? (
                <p className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                  <Hourglass aria-hidden="true" className="size-4" />
                  {data.wallet.held} reservados para aulas pedidas
                </p>
              ) : null}
            </div>
            <Button asChild variant="onBrand">
              <Link to="/carteira">Ver histórico</Link>
            </Button>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <NextSession
              title="Próxima aula que você vai aprender"
              icon={GraduationCap}
              session={data.nextLearning}
              emptyText="Você ainda não tem nenhuma aula agendada."
              emptyAction={
                <Button asChild>
                  <Link to="/explorar">
                    <CalendarPlus aria-hidden="true" className="size-5" />
                    Encontrar alguém para aprender
                  </Link>
                </Button>
              }
            />
            <NextSession
              title="Próxima aula que você vai ensinar"
              icon={Users}
              session={data.nextTeaching}
              emptyText="Nenhuma aula para ensinar por enquanto. Quanto mais completo o seu perfil, mais pedidos você recebe."
              emptyAction={
                <Button asChild variant="outline">
                  <Link to="/perfil/editar">Melhorar meu perfil</Link>
                </Button>
              }
            />
          </div>

          <section aria-labelledby="resumo" className="space-y-3">
            <h2 id="resumo" className="text-lg font-bold">
              Seu resumo
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile
                label="Ensinadas"
                value={`${data.stats.hoursTaught.toLocaleString('pt-BR')} h`}
              />
              <StatTile
                label="Aprendidas"
                value={`${data.stats.hoursLearned.toLocaleString('pt-BR')} h`}
              />
              <StatTile
                label="Avaliação"
                value={
                  data.stats.ratingAverage === null ? (
                    '—'
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <Star aria-hidden="true" className="size-5 fill-credit text-credit" />
                      {data.stats.ratingAverage.toLocaleString('pt-BR', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                    </span>
                  )
                }
                hint={
                  data.stats.ratingCount > 0
                    ? `${data.stats.ratingCount} ${data.stats.ratingCount === 1 ? 'avaliação' : 'avaliações'}`
                    : 'Ainda sem avaliações'
                }
              />
            </div>
          </section>

          <section aria-labelledby="recomendacoes" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="recomendacoes" className="text-lg font-bold">
                Pessoas que podem ensinar o que você procura
              </h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/explorar">Ver todas</Link>
              </Button>
            </div>
            {data.recommendations.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border-strong bg-surface p-5">
                <p className="text-fg-muted">
                  {me?.learningSkills.length === 0
                    ? 'Conte o que você quer aprender para receber recomendações.'
                    : 'Ainda não há ninguém ensinando o que você procura. Volte em breve!'}
                </p>
                <Button asChild variant="outline" className="mt-3">
                  <Link to={me?.learningSkills.length === 0 ? '/perfil/editar' : '/explorar'}>
                    {me?.learningSkills.length === 0
                      ? 'Escolher o que aprender'
                      : 'Explorar conhecimentos'}
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.recommendations.map((card) => (
                  <li key={`${card.userId}-${card.skill.id}`}>
                    <MentorCard card={card} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
