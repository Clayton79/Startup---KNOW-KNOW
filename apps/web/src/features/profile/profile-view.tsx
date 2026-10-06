import type {
  AvailabilityRuleView,
  LearningSkillView,
  PreferredMode,
  ReputationView,
  TeachingSkillView,
} from '@know-know/shared';
import { MapPin, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { AvailabilitySummary } from '@/features/availability/availability-summary';
import { formatLocation, formatReputation } from '@/lib/format';
import { PREFERRED_MODE_LABEL, SKILL_LEVEL_LABEL } from '@/lib/labels';

export interface ProfileViewData {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  preferredMode: PreferredMode;
  reputation: ReputationView;
  sessionsTaught: number;
  sessionsLearned: number;
  teachingSkills: TeachingSkillView[];
  learningSkills: LearningSkillView[];
  availability: AvailabilityRuleView[];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </Card>
  );
}

/** Visão de um perfil (o seu ou o de outra pessoa). `actions` recebe os botões de cada contexto. */
export function ProfileView({
  profile,
  actions,
}: {
  profile: ProfileViewData;
  actions?: ReactNode;
}) {
  const location = formatLocation(profile.city, profile.state);

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={profile.displayName} src={profile.avatarUrl} size="xl" />
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="break-words text-2xl font-extrabold text-brand sm:text-3xl">
            {profile.displayName}
          </h1>
          <p className="flex items-center gap-1.5 font-semibold">
            <Star aria-hidden="true" className="size-4 text-credit" />
            {formatReputation(profile.reputation)}
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            {location ? (
              <li className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-4" />
                {location}
              </li>
            ) : null}
            <li>{PREFERRED_MODE_LABEL[profile.preferredMode]}</li>
            <li>
              {profile.sessionsTaught}{' '}
              {profile.sessionsTaught === 1 ? 'aula ensinada' : 'aulas ensinadas'}
            </li>
            <li>
              {profile.sessionsLearned}{' '}
              {profile.sessionsLearned === 1 ? 'aula assistida' : 'aulas assistidas'}
            </li>
          </ul>
        </div>
        {actions ? <div className="flex flex-wrap gap-2 sm:flex-col">{actions}</div> : null}
      </Card>

      {profile.bio ? (
        <Section title="Sobre">
          <p className="whitespace-pre-line">{profile.bio}</p>
        </Section>
      ) : null}

      <Section title="Sabe ensinar">
        {profile.teachingSkills.length === 0 ? (
          <p className="text-fg-muted">Ainda não adicionou conhecimentos.</p>
        ) : (
          <ul className="space-y-3">
            {profile.teachingSkills.map((item) => (
              <li key={item.skill.id} className="space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="font-bold">{item.skill.name}</span>
                  <Badge tone="primary">{SKILL_LEVEL_LABEL[item.level]}</Badge>
                </p>
                {item.description ? <p className="text-fg-muted">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Quer aprender">
        {profile.learningSkills.length === 0 ? (
          <p className="text-fg-muted">Ainda não adicionou conhecimentos.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {profile.learningSkills.map((item) => (
              <li key={item.skill.id}>
                <Badge tone="neutral" className="px-3 py-1 text-sm">
                  {item.skill.name}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Horários disponíveis">
        <AvailabilitySummary rules={profile.availability} />
      </Section>
    </div>
  );
}
