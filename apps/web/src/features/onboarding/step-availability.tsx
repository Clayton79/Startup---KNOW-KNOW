import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiErrorCode, type MeProfile } from '@know-know/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import {
  AvailabilityEditor,
  validateAvailability,
  type AvailabilityDraft,
} from '@/features/availability/availability-editor';
import { profileApi } from '@/features/profile/profile-api';
import { meQueryKey } from '@/features/profile/use-profile';
import { ApiError } from '@/lib/api-client';
import { OnboardingFrame } from './onboarding-frame';

export function StepAvailability({
  me,
  onBack,
  onFinished,
  onNeedsSkills,
}: {
  me: MeProfile;
  onBack: () => void;
  onFinished: () => void;
  /** O onboarding exige ao menos um conhecimento; volta para escolher. */
  onNeedsSkills: () => void;
}) {
  const queryClient = useQueryClient();
  const [rules, setRules] = useState<AvailabilityDraft[]>(() =>
    me.availability.map(({ weekday, startMinute, endMinute }) => ({
      weekday,
      startMinute,
      endMinute,
    })),
  );
  const [validation, setValidation] = useState<string | null>(null);

  const finish = useMutation({
    mutationFn: async (items: AvailabilityDraft[]) => {
      await profileApi.replaceAvailability({ rules: items });
      return profileApi.completeOnboarding();
    },
    onSuccess: (profile) => {
      // A ordem importa: primeiro mostra o passo final, depois grava o perfil concluído no cache
      // (senão a tela redirecionaria para o painel antes de exibir a conclusão).
      onFinished();
      queryClient.setQueryData(meQueryKey, profile);
    },
  });

  const submit = async () => {
    const problem = validateAvailability(rules);
    setValidation(problem);
    if (problem) return;

    try {
      await finish.mutateAsync(rules);
    } catch (error) {
      if (error instanceof ApiError && error.code === ApiErrorCode.ONBOARDING_REQUIRED) {
        toast.info(error.message);
        onNeedsSkills();
        return;
      }
      toast.error(errorMessage(error));
    }
  };

  return (
    <OnboardingFrame
      step={3}
      title="Quando você costuma estar disponível?"
      description="Defina seus horários semanais. Dá para mudar quando quiser, e ninguém marca aula fora deles."
      actions={
        <>
          <Button variant="ghost" size="lg" onClick={onBack}>
            Voltar
          </Button>
          <Button size="lg" loading={finish.isPending} onClick={() => void submit()}>
            {rules.length === 0 ? 'Pular e concluir' : 'Concluir perfil'}
          </Button>
        </>
      }
    >
      {validation ? <Alert tone="error">{validation}</Alert> : null}
      <AvailabilityEditor value={rules} onChange={setRules} />
    </OnboardingFrame>
  );
}
