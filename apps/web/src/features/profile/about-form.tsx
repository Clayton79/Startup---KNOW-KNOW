import { zodResolver } from '@hookform/resolvers/zod';
import { LIMITS, PreferredMode } from '@know-know/shared';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/components/ui/form-field';
import { Input, Textarea } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { BR_STATES } from '@/lib/br-states';
import { PREFERRED_MODE_LABEL } from '@/lib/labels';

export const aboutSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(LIMITS.displayName.min, 'Como podemos te chamar? Use pelo menos 2 letras.')
    .max(LIMITS.displayName.max, `O nome pode ter no máximo ${LIMITS.displayName.max} caracteres.`),
  bio: z.string().trim().max(LIMITS.bio.max, `Use até ${LIMITS.bio.max} caracteres.`),
  city: z.string().trim().max(LIMITS.city.max, `Use até ${LIMITS.city.max} caracteres.`),
  state: z.string(),
  preferredMode: z.enum([PreferredMode.ONLINE, PreferredMode.IN_PERSON, PreferredMode.BOTH]),
});
export type AboutValues = z.infer<typeof aboutSchema>;

/** Campos "sobre você" usados no onboarding e na edição do perfil. */
export function AboutForm({
  id,
  defaultValues,
  onSubmit,
}: {
  id: string;
  defaultValues: AboutValues;
  onSubmit: (values: AboutValues) => void | Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    control: formControl,
    formState: { errors },
  } = useForm<AboutValues>({ resolver: zodResolver(aboutSchema), defaultValues });

  const bioLength = useWatch({ control: formControl, name: 'bio' })?.length ?? 0;
  const mode = useWatch({ control: formControl, name: 'preferredMode' });
  const needsLocation = mode !== PreferredMode.ONLINE;

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FormField label="Seu nome" error={errors.displayName?.message} required>
        {(control) => <Input autoComplete="name" {...control} {...register('displayName')} />}
      </FormField>

      <FormField
        label="Sobre você (opcional)"
        hint={`${bioLength}/${LIMITS.bio.max} caracteres. Conte como você gosta de ensinar e aprender.`}
        error={errors.bio?.message}
      >
        {(control) => (
          <Textarea rows={4} maxLength={LIMITS.bio.max} {...control} {...register('bio')} />
        )}
      </FormField>

      <FormField label="Como prefere as aulas?" error={errors.preferredMode?.message}>
        {(control) => (
          <Select {...control} {...register('preferredMode')}>
            {Object.values(PreferredMode).map((value) => (
              <option key={value} value={value}>
                {PREFERRED_MODE_LABEL[value]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {needsLocation ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
          <FormField
            label="Cidade"
            hint="Só usamos para encontrar pessoas perto de você nas aulas presenciais."
            error={errors.city?.message}
          >
            {(control) => (
              <Input autoComplete="address-level2" {...control} {...register('city')} />
            )}
          </FormField>
          <FormField label="Estado" error={errors.state?.message}>
            {(control) => (
              <Select autoComplete="address-level1" {...control} {...register('state')}>
                <option value="">—</option>
                {BR_STATES.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        </div>
      ) : null}
    </form>
  );
}
