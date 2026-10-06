import type { ExploreCard, MatchLabel } from '@know-know/shared';
import { Clock, Coins, MapPin, Sparkles, Star } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { RequestSessionDialog } from '@/features/sessions/request-session-dialog';
import { availabilityChips, formatLocation, formatReputation } from '@/lib/format';
import { PREFERRED_MODE_LABEL, SKILL_LEVEL_LABEL } from '@/lib/labels';

const MATCH_BADGE: Record<MatchLabel, { label: string; tone: 'success' | 'primary' | 'neutral' }> =
  {
    EXCELLENT: { label: 'Match excelente', tone: 'success' },
    GOOD: { label: 'Bom match', tone: 'primary' },
    POSSIBLE: { label: 'Pode combinar', tone: 'neutral' },
  };

/** Cartão de uma pessoa que ensina algo, com compatibilidade (match) quando há login. */
export function MentorCard({ card }: { card: ExploreCard }) {
  const { status } = useAuth();
  const [requesting, setRequesting] = useState(false);
  const location = formatLocation(card.city, card.state);
  const chips = availabilityChips(card.availability);
  const badge = card.match?.label ? MATCH_BADGE[card.match.label] : null;

  return (
    <article
      aria-label={`${card.displayName} ensina ${card.skill.name}`}
      className="flex h-full flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm"
    >
      {badge && card.match ? (
        <div className="space-y-1">
          <Badge tone={badge.tone} className="gap-1.5">
            <Sparkles aria-hidden="true" className="size-3.5" />
            {badge.label}
          </Badge>
          {/* Sempre explica o porquê: a frase do match ou, na falta dela, o principal motivo. */}
          {(card.match.headline ?? card.match.reasons[0]) ? (
            <p className="text-sm font-semibold">{card.match.headline ?? card.match.reasons[0]}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-start gap-4">
        <Avatar name={card.displayName} src={card.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="truncate text-lg font-bold">
            <Link to={`/usuario/${card.userId}`} className="hover:underline">
              {card.displayName}
            </Link>
          </h3>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Star aria-hidden="true" className="size-4 text-credit" />
            {formatReputation(card.reputation)}
          </p>
          <p className="text-sm text-fg-muted">
            {card.sessionsTaught} {card.sessionsTaught === 1 ? 'aula ensinada' : 'aulas ensinadas'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-bold">{card.skill.name}</span>
          <Badge tone="primary">{SKILL_LEVEL_LABEL[card.level]}</Badge>
        </p>
        {card.description ? (
          <p className="line-clamp-2 text-sm text-fg-muted">{card.description}</p>
        ) : null}
      </div>

      <ul className="space-y-1.5 text-sm text-fg-muted">
        <li className="flex items-center gap-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0" />
          {PREFERRED_MODE_LABEL[card.preferredMode]}
          {location ? ` · ${location}` : ''}
        </li>
        <li className="flex items-center gap-2">
          <Coins aria-hidden="true" className="size-4 shrink-0 text-credit" />
          <span>
            <strong className="text-fg">{card.creditsPerHour} créditos</strong> por hora
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Clock aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {chips.length === 0 ? (
            <span>Sem horários informados</span>
          ) : (
            <span>
              {chips.slice(0, 3).join(' · ')}
              {chips.length > 3 ? ` · +${chips.length - 3}` : ''}
            </span>
          )}
        </li>
      </ul>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {status === 'authenticated' ? (
          <>
            <Button onClick={() => setRequesting(true)} className="flex-1">
              Solicitar aula
            </Button>
            <Button asChild variant="outline">
              <Link to={`/usuario/${card.userId}`}>Ver perfil</Link>
            </Button>
            <RequestSessionDialog
              mentorId={card.userId}
              defaultSkillId={card.skill.id}
              open={requesting}
              onOpenChange={setRequesting}
            />
          </>
        ) : (
          <Button asChild className="flex-1">
            <Link to="/cadastro">Criar conta para solicitar</Link>
          </Button>
        )}
      </div>
    </article>
  );
}
