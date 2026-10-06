import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { usePublicConfig } from '@/features/config/use-public-config';
import { authErrorMessage } from './auth-errors';
import { AuthLayout } from './auth-layout';
import { signupSchema, type SignupForm } from './auth-schemas';
import { useAuth } from './auth-provider';

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { data: config } = usePublicConfig();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptTerms: false as unknown as true },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    try {
      const loggedIn = await signUp({ name, email, password });
      if (loggedIn) void navigate('/onboarding', { replace: true });
      else setPendingEmail(email);
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  if (pendingEmail) {
    return (
      <AuthLayout pageTitle="Confirme seu e-mail" title="Quase lá!">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <MailCheck aria-hidden="true" className="size-7" />
          </span>
          <p>
            Enviamos um link de confirmação para <strong>{pendingEmail}</strong>. Abra o e-mail e
            clique no link para ativar sua conta.
          </p>
          <p className="text-sm text-fg-muted">Não chegou? Olhe também a caixa de spam.</p>
          <Button asChild variant="outline">
            <Link to="/login">Ir para o login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageTitle="Criar conta"
      title="Crie sua conta"
      subtitle={
        config && config.welcomeBonusCredits > 0
          ? `Você começa com ${config.welcomeBonusCredits} créditos para experimentar.`
          : 'Leva menos de um minuto.'
      }
      footer={
        <>
          Já tem conta?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}

        <FormField label="Como podemos te chamar?" error={errors.name?.message} required>
          {(control) => <Input autoComplete="name" {...control} {...register('name')} />}
        </FormField>

        <FormField label="E-mail" error={errors.email?.message} required>
          {(control) => (
            <Input
              type="email"
              autoComplete="email"
              inputMode="email"
              {...control}
              {...register('email')}
            />
          )}
        </FormField>

        <FormField
          label="Senha"
          hint="Pelo menos 8 caracteres, com letras e números."
          error={errors.password?.message}
          required
        >
          {(control) => (
            <PasswordInput autoComplete="new-password" {...control} {...register('password')} />
          )}
        </FormField>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-primary"
              aria-invalid={errors.acceptTerms ? true : undefined}
              aria-describedby={errors.acceptTerms ? 'terms-error' : undefined}
              {...register('acceptTerms')}
            />
            <span>
              Li e aceito os{' '}
              <Link to="/termos" className="font-semibold text-primary underline" target="_blank">
                Termos de uso
              </Link>{' '}
              e a{' '}
              <Link
                to="/privacidade"
                className="font-semibold text-primary underline"
                target="_blank"
              >
                Política de privacidade
              </Link>
              .
            </span>
          </label>
          {errors.acceptTerms ? (
            <p id="terms-error" role="alert" className="text-sm font-medium text-error">
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>

        <Button type="submit" size="lg" loading={isSubmitting}>
          Criar conta
        </Button>
      </form>
    </AuthLayout>
  );
}
