import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../common/errors/app-exception';
import { ProfilesService } from '../profiles/profiles.service';
import type { AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC_KEY, OPTIONAL_AUTH_KEY } from './decorators/public.decorator';
import { JwtVerifierService } from './jwt-verifier.service';

/**
 * Guard global: toda rota exige login, exceto as marcadas com @Public() ou @OptionalAuth().
 * Após validar o token, carrega o perfil no banco (criando-o na primeira vez), então papel e
 * status da conta sempre vêm do servidor, nunca do token.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly verifier: JwtVerifierService,
    private readonly profiles: ProfilesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    if (isPublic) return true;

    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH_KEY, targets);
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request.headers.authorization);

    if (!token) {
      if (optional) return true;
      throw AppException.unauthorized();
    }

    const claims = await this.verifier.verify(token);
    request.user = await this.profiles.resolveAuthenticatedUser(claims);
    return true;
  }

  private extractToken(header: string | undefined): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : null;
  }
}
