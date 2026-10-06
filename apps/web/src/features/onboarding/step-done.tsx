import type { MeProfile } from '@know-know/shared';
import { PartyPopper } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { OnboardingFrame } from './onboarding-frame';

export function StepDone({ me }: { me: MeProfile }) {
  const firstName = me.displayName.split(' ')[0];

  return (
    <OnboardingFrame
      step={4}
      title="Perfil concluído"
      description={`Tudo pronto, ${firstName}! Agora é só encontrar alguém para trocar conhecimento.`}
      actions={
        <>
          <Button asChild variant="outline" size="lg">
            <Link to="/perfil">Ver meu perfil</Link>
          </Button>
          <Button asChild size="lg">
            <Link to="/dashboard">Ir para o painel</Link>
          </Button>
        </>
      }
    >
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
          <PartyPopper aria-hidden="true" className="size-8" />
        </span>
        <ul className="space-y-1 text-fg-muted">
          <li>
            {me.teachingSkills.length}{' '}
            {me.teachingSkills.length === 1 ? 'conhecimento' : 'conhecimentos'} para ensinar
          </li>
          <li>
            {me.learningSkills.length} {me.learningSkills.length === 1 ? 'interesse' : 'interesses'}{' '}
            para aprender
          </li>
        </ul>
      </div>
    </OnboardingFrame>
  );
}
