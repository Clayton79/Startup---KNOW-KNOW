import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const OPTIONAL_AUTH_KEY = 'optionalAuth';

/** Rota aberta: não exige token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Rota aberta que se personaliza quando há login (ex.: Explorar com pontuação de match).
 * Sem token segue anônima; com token inválido responde 401.
 */
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
