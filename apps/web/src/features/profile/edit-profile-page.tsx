import type { MeProfile } from '@know-know/shared';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { PageMeta } from '@/components/seo/page-meta';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState, errorMessage } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AvailabilityEditor,
  validateAvailability,
  type AvailabilityDraft,
} from '@/features/availability/availability-editor';
import { LearningSkillsEditor } from '@/features/skills/learning-skills-editor';
import { TeachingSkillsEditor, type TeachingDraft } from '@/features/skills/teaching-skills-editor';
import { AboutForm, type AboutValues } from './about-form';
import { AvatarUploader } from './avatar-uploader';
import { profileApi } from './profile-api';
import { useInvalidateMeMutation, useMe, useProfileMutation } from './use-profile';

function EditSection({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{title}</h2>
        {description ? <p className="text-fg-muted">{description}</p> : null}
      </div>
      {children}
      <div className="flex justify-end">{footer}</div>
    </Card>
  );
}

function AboutSection({ me }: { me: MeProfile }) {
  const save = useProfileMutation((values: AboutValues) =>
    profileApi.updateMe({
      displayName: values.displayName,
      bio: values.bio,
      city: values.city,
      state: values.state === '' ? null : values.state,
      preferredMode: values.preferredMode,
    }),
  );

  const submit = async (values: AboutValues) => {
    try {
      await save.mutateAsync(values);
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <EditSection
      title="Sobre você"
      footer={
        <Button type="submit" form="edit-about" loading={save.isPending}>
          Salvar
        </Button>
      }
    >
      <AvatarUploader name={me.displayName} currentUrl={me.avatarUrl} />
      <AboutForm
        id="edit-about"
        onSubmit={submit}
        defaultValues={{
          displayName: me.displayName,
          bio: me.bio ?? '',
          city: me.city ?? '',
          state: me.state ?? '',
          preferredMode: me.preferredMode,
        }}
      />
    </EditSection>
  );
}

function TeachingSection({ me }: { me: MeProfile }) {
  const [drafts, setDrafts] = useState<TeachingDraft[]>(() =>
    me.teachingSkills.map((item) => ({
      skillId: item.skill.id,
      level: item.level,
      description: item.description ?? '',
    })),
  );
  const save = useInvalidateMeMutation((items: TeachingDraft[]) =>
    profileApi.replaceTeaching({
      skills: items.map((item) => ({
        skillId: item.skillId,
        level: item.level,
        description: item.description.trim() === '' ? null : item.description.trim(),
      })),
    }),
  );

  const submit = async () => {
    try {
      await save.mutateAsync(drafts);
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <EditSection
      title="O que você sabe ensinar"
      description="Cada aula que você der rende créditos."
      footer={
        <Button loading={save.isPending} onClick={() => void submit()}>
          Salvar
        </Button>
      }
    >
      <TeachingSkillsEditor value={drafts} onChange={setDrafts} />
    </EditSection>
  );
}

function LearningSection({ me }: { me: MeProfile }) {
  const [ids, setIds] = useState<string[]>(() => me.learningSkills.map((item) => item.skill.id));
  const save = useInvalidateMeMutation((skillIds: string[]) =>
    profileApi.replaceLearning({ skills: skillIds.map((skillId) => ({ skillId })) }),
  );

  const submit = async () => {
    try {
      await save.mutateAsync(ids);
      toast.success('Perfil atualizado.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <EditSection
      title="O que você quer aprender"
      description="Usamos isso para sugerir pessoas que podem te ensinar."
      footer={
        <Button loading={save.isPending} onClick={() => void submit()}>
          Salvar
        </Button>
      }
    >
      <LearningSkillsEditor value={ids} onChange={setIds} />
    </EditSection>
  );
}

function AvailabilitySection({ me }: { me: MeProfile }) {
  const [rules, setRules] = useState<AvailabilityDraft[]>(() =>
    me.availability.map(({ weekday, startMinute, endMinute }) => ({
      weekday,
      startMinute,
      endMinute,
    })),
  );
  const [problem, setProblem] = useState<string | null>(null);
  const save = useInvalidateMeMutation((items: AvailabilityDraft[]) =>
    profileApi.replaceAvailability({ rules: items }),
  );

  const submit = async () => {
    const validation = validateAvailability(rules);
    setProblem(validation);
    if (validation) return;
    try {
      await save.mutateAsync(rules);
      toast.success('Horários atualizados.');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <EditSection
      title="Horários disponíveis"
      description={`Os horários seguem o seu fuso (${me.timezone}).`}
      footer={
        <Button loading={save.isPending} onClick={() => void submit()}>
          Salvar
        </Button>
      }
    >
      {problem ? <Alert tone="error">{problem}</Alert> : null}
      <AvailabilityEditor value={rules} onChange={setRules} />
    </EditSection>
  );
}

export function EditProfilePage() {
  const { data: me, isPending, isError, error, refetch } = useMe();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageMeta title="Editar perfil" noindex />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-brand sm:text-3xl">Editar perfil</h1>
        <Button asChild variant="ghost">
          <Link to="/perfil">Voltar ao perfil</Link>
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <>
          <AboutSection me={me} />
          <TeachingSection me={me} />
          <LearningSection me={me} />
          <AvailabilitySection me={me} />
        </>
      )}
    </div>
  );
}
