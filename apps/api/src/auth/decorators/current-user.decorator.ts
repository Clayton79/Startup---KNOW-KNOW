import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest, AuthenticatedUser } from '../auth.types';

/** Usuário autenticado da requisição. Em rotas `@OptionalAuth()` pode ser `undefined`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

/** Usuário autenticado obrigatório (rotas protegidas pelo AuthGuard global). */
export const RequiredUser = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) throw new Error('RequiredUser usado em rota sem autenticação');
  return user;
});
