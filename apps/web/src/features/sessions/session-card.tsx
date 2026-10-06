import type { SessionView } from '@know-know/shared';
import { Clock, Video, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/cn';
import { formatDay, formatTimeRange } from '@/lib/datetime';
import { formatCredits } from '@/lib/format';
import { SESSION_MODE_LABEL } from '@/lib/labels';
import { otherPerson, statusHint } from './session-copy';
import { SessionStatusBadge } from './session-status-badge';

/** Cartão de uma aula em listas e no painel. Toda a área é um link para os detalhes. */
export function SessionCard({ session, className }: { session: SessionView; className?: string }) {
  const other = otherPerson(session);
  const teaching = session.myRole === 'MENTOR';
  const ModeIcon = session.mode === 'IN_PERSON' ? MapPin : Video;

  return (
    <Link
      to={`/aulas/${session.id}`}
      className={cn(
        'block rounded-lg border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5',
        session.awaitingMyResponse && 'border-warning',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <Avatar name={other.displayName} src={other.avatarUrl} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              {session.skill.name}{' '}
              <span className="font-normal text-fg-muted">com {other.displayName}</span>
            </p>
            <SessionStatusBadge
              status={session.status}
              awaitingMyResponse={session.awaitingMyResponse}
            />
          </div>
          <p className="text-sm font-semibold">
            {teaching ? 'Você ensina' : 'Você aprende'}
            <span className="font-normal text-fg-muted">
              {' '}
              · {formatCredits(session.creditCost)}
            </span>
          </p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-muted">
            <span className="inline-flex items-center gap-1.5">
              <Clock aria-hidden="true" className="size-4" />
              {formatDay(session.startsAt)}, {formatTimeRange(session.startsAt, session.endsAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ModeIcon aria-hidden="true" className="size-4" />
              {SESSION_MODE_LABEL[session.mode]}
            </span>
          </p>
          <p className="pt-1 text-sm">{statusHint(session)}</p>
        </div>
      </div>
    </Link>
  );
}
