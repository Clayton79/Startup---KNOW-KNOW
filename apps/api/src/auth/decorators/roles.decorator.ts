import { SetMetadata } from '@nestjs/common';
import type { ProfileRole } from '@know-know/shared';

export const ROLES_KEY = 'roles';

/** Restringe a rota a determinados papéis (verificado no banco, nunca só no token). */
export const Roles = (...roles: ProfileRole[]) => SetMetadata(ROLES_KEY, roles);
