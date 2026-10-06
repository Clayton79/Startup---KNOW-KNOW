import type { MeProfile } from '@know-know/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/components/ui/error-state';
import { profileApi } from '@/features/profile/profile-api';
import { useProfileMutation } from '@/features/profile/use-profile';
import { TeachingSkillsEditor, type TeachingDraft } from '@/features/skills/teaching-skills-editor';
import { OnboardingFrame } from './onboarding-frame';

export function StepTeaching({
  me,
  onNext,
  onBack,
}: {
  me: MeProfile;
  onNext: () => void;
  onBack: () => void;
}) {
  const [drafts, setDrafts] = useState<TeachingDraft[]>(() =>
    me.teachingSkills.map((item) => ({
      skillId: item.skill.id,
      level: item.level,
      description: item.description ?? '',
    })),
  );

  const save = useProfileMutation(async (items: TeachingDraft[]) => {
    await profileApi.replaceTeaching({
      skills: items.map((item) => ({
        skillId: item.skillId,
        level: item.level,
        description: item.description.trim() === '' ? null : item.description.trim(),
      })),
    });
    return profileApi.setOnboardingStep(2);
  });

  const submit = async () => {
    try {
      await save.mutateAsync(drafts);
      onNext();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <OnboardingFrame
      step={1}
      title="O que você sabe ensinar?"
      description="Escolha tudo em que você se sente à vontade para ajudar alguém. Cada aula que você der rende créditos."
      actions={
        <>
          <Button variant="ghost" size="lg" onClick={onBack}>
            Voltar
          </Button>
          <Button size="lg" loading={save.isPending} onClick={() => void submit()}>
            {drafts.length === 0 ? 'Pular por agora' : 'Continuar'}
          </Button>
        </>
      }
    >
      <TeachingSkillsEditor value={drafts} onChange={setDrafts} />
    </OnboardingFrame>
  );
}
