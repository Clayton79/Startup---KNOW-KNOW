import { AuthError } from '@supabase/supabase-js';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos. Confira e tente de novo.',
  email_not_confirmed:
    'Confirme seu e-mail antes de entrar. Procure a mensagem na sua caixa de entrada.',
  user_already_exists: 'Já existe uma conta com esse e-mail. Que tal entrar?',
  email_exists: 'Já existe uma conta com esse e-mail. Que tal entrar?',
  weak_password: 'Essa senha é fraca. Use pelo menos 8 caracteres, com letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  over_request_rate_limit: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
  over_email_send_rate_limit:
    'Já enviamos um e-mail há pouco. Aguarde um instante antes de pedir outro.',
  signup_disabled: 'Os cadastros estão temporariamente fechados.',
  user_banned: 'Essa conta está desativada.',
  session_expired: 'Sua sessão expirou. Entre de novo.',
  validation_failed: 'Confira os dados informados.',
};

/** Traduz erros do Supabase Auth para mensagens humanas em pt-BR. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof AuthError) {
    const byCode = error.code ? MESSAGES[error.code] : undefined;
    if (byCode) return byCode;
    if (error.status === 429) return MESSAGES.over_request_rate_limit as string;
    if (error.name === 'AuthRetryableFetchError') {
      return 'Não conseguimos falar com o servidor. Confira sua conexão e tente de novo.';
    }
  }
  return 'Não foi possível concluir agora. Tente novamente em instantes.';
}
