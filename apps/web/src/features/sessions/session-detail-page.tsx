import { CalendarClock, ExternalLink, Flag, MapPin, Video } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ReportDialog } from '@/features/reports/report-dialog';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatTimeRange } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { SESSION_MODE_LABEL } from '@/lib/labels';
import { otherPerson, statusHint } from './session-copy';
import { SessionActions } from './session-actions';
import { SessionStatusBadge } from './session-status-badge';
import { useSession } from './use-sessions';

export function SessionDetailPage() {
  const { id } = useParams();
  const { data: session, isPending, isError, error, refetch } = useSession(id);
  const [reporting, setReporting] = useState(false);

  if (isPending) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <div className="mx-auto max-w-3xl">
        <PageMeta title="Aula" noindex />
        {notFound ? (
          <EmptyState
            icon={CalendarClock}
            title="Não encontramos essa aula"
            description="Ela pode ter sido removida, ou você não participa dela."
            action={
              <Button asChild>
                <Link to="/aulas">Ver minhas aulas</Link>
              </Button>
            }
          />
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  const other = otherPerson(session);
  const teaching = session.myRole === 'MENTOR';
  const ModeIcon = session.mode === 'IN_PERSON' ? MapPin : Video;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title={`${session.skill.name} com ${other.displayName}`} noindex />

      <Button asChild variant="ghost" size="sm" className="-ml-3">
        <Link to="/aulas">← Minhas aulas</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">{session.skill.name}</h1>
          <p className="text-fg-muted">
            {teaching ? 'Você vai ensinar' : 'Você vai aprender'} com{' '}
            <Link
              to={`/usuario/${other.id}`}
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              {other.displayName}
            </Link>
          </p>
        </div>
        <SessionStatusBadge
          status={session.status}
          awaitingMyResponse={session.awaitingMyResponse}
        />
      </div>

      <p className="rounded-md bg-primary-soft p-4 font-semibold text-primary-strong" role="status">
        {statusHint(session)}
      </p>

      <Card className="space-y-5">
        <div className="flex items-center gap-4">
          <Avatar name={other.displayName} src={other.avatarUrl} size="lg" />
          <div>
            <p className="font-bold">{other.displayName}</p>
            <p className="text-sm text-fg-muted">{teaching ? 'Aluno(a)' : 'Mentor(a)'}</p>
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-semibold text-fg-muted">Quando</dt>
            <dd className="font-semibold">{formatDateTime(session.startsAt)}</dd>
            <dd className="text-fg-muted">{formatTimeRange(session.startsAt, session.endsAt)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-fg-muted">Duração e custo</dt>
            <dd className="font-semibold">{session.durationMinutes} minutos</dd>
            <dd className="text-fg-muted">{formatCredits(session.creditCost)}</dd>
          </div>
          <div>
            <dt className="text-sm font-semibold text-fg-muted">Modalidade</dt>
            <dd className="inline-flex items-center gap-2 font-semibold">
              <ModeIcon aria-hidden="true" className="size-4" />
              {SESSION_MODE_LABEL[session.mode]}
            </dd>
          </div>
          {session.mode === 'IN_PERSON' && session.locationNote ? (
            <div>
              <dt className="text-sm font-semibold text-fg-muted">Local</dt>
              <dd className="font-semibold">{session.locationNote}</dd>
            </div>
          ) : null}
        </dl>

        {session.meetingUrl ? (
          <div className="rounded-md border border-border bg-surface-muted p-4">
            <p className="text-sm font-semibold text-fg-muted">
              Link da reunião (só vocês dois veem)
            </p>
            <Button asChild className="mt-2">
              <a href={session.meetingUrl} target="_blank" rel="noopener noreferrer">
                Abrir reunião
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="sr-only"> (abre em nova aba)</span>
              </a>
            </Button>
          </div>
        ) : session.status === 'ACCEPTED' && session.mode === 'ONLINE' ? (
          <p className="rounded-md bg-warning-soft p-4 text-warning">
            {teaching
              ? 'Adicione o link da reunião para o aluno conseguir entrar.'
              : `${other.displayName} ainda vai enviar o link da reunião.`}
          </p>
        ) : null}

        {session.note ? (
          <div>
            <p className="text-sm font-semibold text-fg-muted">Mensagem</p>
            <p className="whitespace-pre-line">{session.note}</p>
          </div>
        ) : null}
      </Card>

      <SessionActions session={session} />

      <div className="border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={() => setReporting(true)}>
          <Flag aria-hidden="true" className="size-4" />
          Denunciar {other.displayName}
        </Button>
        <ReportDialog
          targetUserId={other.id}
          targetName={other.displayName}
          sessionId={session.id}
          open={reporting}
          onOpenChange={setReporting}
        />
      </div>
    </div>
  );
}
