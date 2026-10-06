import type { MeProfile } from '@know-know/shared';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AboutForm, type AboutValues } from '@/features/profile/about-form';
import { profileApi } from '@/features/profile/profile-api';
import { useProfileMutation } from '@/features/profile/use-profile';
import { browserTimeZone } from '@/lib/format';
import { errorMessage } from '@/components/ui/error-state';
import { useState } from 'react';
import { OnboardingFrame } from './onboarding-frame';

const FORM_ID = 'onboarding-about';

export function StepAbout({ me, onNext }: { me: MeProfile; onNext: () => void }) {
  const [saving, setSaving] = useState(false);
  const save = useProfileMutation(async (values: AboutValues) => {
    await profileApi.updateMe({
      displayName: values.displayName,
      bio: values.bio,
      city: values.city,
      state: values.state === '' ? null : values.state,
      preferredMode: values.preferredMode,
      timezone: browserTimeZone(),
    });
    return profileApi.setOnboardingStep(1);
  });

  const submit = async (values: AboutValues) => {
    setSaving(true);
    try {
      await save.mutateAsync(values);
      onNext();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingFrame
      step={0}
      title="Conte um pouco sobre você"
      description="Assim as pessoas sabem com quem estão falando."
      actions={
        <Button type="submit" form={FORM_ID} size="lg" loading={saving} className="sm:ml-auto">
          Continuar
        </Button>
      }
    >
      <AboutForm
        id={FORM_ID}
        onSubmit={submit}
        defaultValues={{
          displayName: me.displayName,
          bio: me.bio ?? '',
          city: me.city ?? '',
          state: me.state ?? '',
          preferredMode: me.preferredMode,
        }}
      />
    </OnboardingFrame>
  );
}
