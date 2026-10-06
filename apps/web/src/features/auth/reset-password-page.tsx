import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { PasswordInput } from '@/components/ui/password-input';
import { Spinner } from '@/components/ui/spinner';
import { authErrorMessage } from './auth-errors';
import { AuthLayout } from './auth-layout';
import { resetPasswordSchema, type ResetPasswordForm } from './auth-schemas';
import { useAuth } from './auth-provider';

/** Destino do link de recuperação enviado por e-mail (o Supabase já cria a sessão de recuperação). */
export function ResetPasswordPage() {
  const { status, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async ({ password }) => {
    setFormError(null);
    try {
      await updatePassword(password);
      toast.success('Senha atualizada.');
      void navigate('/dashboard', { replace: true });
    } catch (error) {
      setFormError(authErrorMessage(error));
    }
  });

  if (status === 'loading') {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-8" label="Carregando" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <AuthLayout pageTitle="Link inválido" title="Esse link não é mais válido">
        <div className="flex flex-col gap-4 text-center">
          <p>O link de recuperação expirou ou já foi usado. Peça um novo para continuar.</p>
          <Button asChild>
            <Link to="/esqueci-minha-senha">Pedir novo link</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout pageTitle="Nova senha" title="Crie uma nova senha">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError ? <Alert tone="error">{formError}</Alert> : null}
        <FormField
          label="Nova senha"
          hint="Pelo menos 8 caracteres, com letras e números."
          error={errors.password?.message}
          required
        >
          {(control) => (
            <PasswordInput autoComplete="new-password" {...control} {...register('password')} />
          )}
        </FormField>
        <FormField label="Repita a nova senha" error={errors.confirmPassword?.message} required>
          {(control) => (
            <PasswordInput
              autoComplete="new-password"
              {...control}
              {...register('confirmPassword')}
            />
          )}
        </FormField>
        <Button type="submit" size="lg" loading={isSubmitting}>
          Salvar nova senha
        </Button>
      </form>
    </AuthLayout>
  );
}
