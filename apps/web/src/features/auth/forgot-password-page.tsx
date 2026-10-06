import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { authErrorMessage } from './auth-errors';
import { AuthLayout } from './auth-layout';
import { forgotPasswordSchema, type ForgotPasswordForm } from './auth-schemas';
import { useAuth } from './auth-provider';

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  if (sent) {
    return (
      <AuthLayout pageTitle="Confira seu e-mail" title="Confira seu e-mail">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-strong">
            <MailCheck aria-hidden="true" className="size-7" />
          </span>
          <p>
            Se existir uma conta com esse e-mail, enviamos um link para você criar uma nova senha.
          </p>
          <Button asChild variant="outline">
            <Link to="/login">Voltar ao login</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      pageTitle="Esqueci minha senha"
      title="Esqueceu a senha?"
      subtitle="Sem problema. Informe seu e-mail e enviamos um link para criar outra."
      footer={
        <Link to="/login" className="font-semibold text-primary underline-offset-4 hover:underline">
          Voltar ao login
        </Link>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
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
        <Button type="submit" size="lg" loading={isSubmitting}>
          Enviar link
        </Button>
      </form>
    </AuthLayout>
  );
}
