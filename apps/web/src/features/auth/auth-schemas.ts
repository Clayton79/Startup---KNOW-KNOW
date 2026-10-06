import { z } from 'zod';

const email = z
  .string()
  .trim()
  .min(1, 'Informe seu e-mail.')
  .pipe(z.email('Informe um e-mail válido.'));

const newPassword = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres.')
  .max(72, 'A senha pode ter no máximo 72 caracteres.')
  .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), {
    message: 'Use letras e números na senha.',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Informe sua senha.'),
});
export type LoginForm = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Como podemos te chamar? Use pelo menos 2 letras.')
    .max(60, 'O nome pode ter no máximo 60 caracteres.'),
  email,
  password: newPassword,
  acceptTerms: z.literal(true, { error: 'Para criar a conta, aceite os Termos e a Política.' }),
});
export type SignupForm = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email });
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    confirmPassword: z.string().min(1, 'Repita a nova senha.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não são iguais.',
    path: ['confirmPassword'],
  });
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
