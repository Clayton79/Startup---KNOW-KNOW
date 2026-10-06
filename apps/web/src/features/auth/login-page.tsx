import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { authErrorMessage } from './auth-errors';
import { AuthLayout } from './auth-layout';
import { loginSchema, type LoginForm } from './auth-schemas';
import { useAuth } from './auth-provider';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard';
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      await signIn(email, password);
      void navigate(from, { replace: true });
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <AuthLayout
      pageTitle="Entrar"
      title="Que bom te ver de novo"
      subtitle="Entre para continuar ensinando e aprendendo."
      footer={
        <>
          Ainda não tem conta?{' '}
          <Link
            to="/cadastro"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Criar conta
          </Link>
        </>
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

        <FormField label="Senha" error={errors.password?.message} required>
          {(control) => (
            <PasswordInput autoComplete="current-password" {...control} {...register('password')} />
          )}
        </FormField>

        <Link
          to="/esqueci-minha-senha"
          className="self-start text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Esqueci minha senha
        </Link>

        <Button type="submit" size="lg" loading={isSubmitting}>
          Entrar
        </Button>
      </form>
    </AuthLayout>
  );
}
