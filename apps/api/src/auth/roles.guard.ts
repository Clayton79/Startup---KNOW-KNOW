import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ProfileRole } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import type { AuthenticatedRequest } from './auth.types';
import { ROLES_KEY } from './decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<ProfileRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user || !required.includes(user.role)) throw AppException.forbidden();
    return true;
  }
}
