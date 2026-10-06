import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { PageMeta } from '@/components/seo/page-meta';
import { ErrorState } from '@/components/ui/error-state';
import { Spinner } from '@/components/ui/spinner';
import { useMe } from '@/features/profile/use-profile';
import { StepAbout } from './step-about';
import { StepAvailability } from './step-availability';
import { StepDone } from './step-done';
import { StepLearning } from './step-learning';
import { StepTeaching } from './step-teaching';

export function OnboardingPage() {
  const { data: me, isPending, isError, error, refetch } = useMe();
  const [step, setStep] = useState<number | null>(null);

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" label="Carregando seu perfil" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  // Quem já terminou não volta para o onboarding (exceto na tela final, logo após concluir).
  if (me.onboarding.completed && step !== 4) return <Navigate to="/dashboard" replace />;

  // Retoma de onde parou, sem passar do penúltimo passo (o último só aparece ao concluir).
  const current = step ?? Math.min(me.onboarding.step, 3);
  const next = () => setStep(current + 1);
  const back = () => setStep(Math.max(current - 1, 0));

  return (
    <>
      <PageMeta title="Monte seu perfil" noindex />
      {current === 0 ? <StepAbout me={me} onNext={next} /> : null}
      {current === 1 ? <StepTeaching me={me} onNext={next} onBack={back} /> : null}
      {current === 2 ? <StepLearning me={me} onNext={next} onBack={back} /> : null}
      {current === 3 ? (
        <StepAvailability
          me={me}
          onBack={back}
          onFinished={() => setStep(4)}
          onNeedsSkills={() => setStep(1)}
        />
      ) : null}
      {current === 4 ? <StepDone me={me} /> : null}
    </>
  );
}
