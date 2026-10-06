import type { ProfileRole } from '@know-know/shared';
import type { Request } from 'express';

export interface AuthenticatedUser {
  id: string;
  role: ProfileRole;
  email: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/** Dados do token do Supabase que a API usa para provisionar o perfil. */
export interface VerifiedClaims {
  sub: string;
  email: string | null;
  fullName: string | null;
  termsAcceptedAt: Date | null;
}
