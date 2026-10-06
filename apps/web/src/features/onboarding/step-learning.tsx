import type { MeProfile } from '@know-know/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { profileApi } from '@/features/profile/profile-api';
import { useProfileMutation } from '@/features/profile/use-profile';
import { LearningSkillsEditor } from '@/features/skills/learning-skills-editor';
import { OnboardingFrame } from './onboarding-frame';

export function StepLearning({
  me,
  onNext,
  onBack,
}: {
  me: MeProfile;
  onNext: () => void;
  onBack: () => void;
}) {
  const [ids, setIds] = useState<string[]>(() => me.learningSkills.map((item) => item.skill.id));

  const save = useProfileMutation(async (skillIds: string[]) => {
    await profileApi.replaceLearning({ skills: skillIds.map((skillId) => ({ skillId })) });
    return profileApi.setOnboardingStep(3);
  });

  const submit = async () => {
    try {
      await save.mutateAsync(ids);
      onNext();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <OnboardingFrame
      step={2}
      title="O que você gostaria de aprender?"
      description="Escolha o que desperta sua curiosidade. Vamos mostrar quem pode te ensinar."
      actions={
        <>
          <Button variant="ghost" size="lg" onClick={onBack}>
            Voltar
          </Button>
          <Button size="lg" loading={save.isPending} onClick={() => void submit()}>
            {ids.length === 0 ? 'Pular por agora' : 'Continuar'}
          </Button>
        </>
      }
    >
      <LearningSkillsEditor value={ids} onChange={setIds} />
    </OnboardingFrame>
  );
}
