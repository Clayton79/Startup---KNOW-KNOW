import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify } from 'jose';
import { z } from 'zod';
import { AppException } from '../common/errors/app-exception';
import { AppConfig } from '../config/app-config.service';
import type { VerifiedClaims } from './auth.types';

const claimsSchema = z.object({
  sub: z.uuid(),
  email: z.string().optional(),
  user_metadata: z
    .object({
      full_name: z.string().optional(),
      name: z.string().optional(),
      accepted_terms_at: z.string().optional(),
    })
    .partial()
    .optional(),
});

const ASYMMETRIC_ALGORITHMS = ['RS256', 'ES256', 'EdDSA'];

/**
 * Valida o JWT emitido pelo Supabase Auth.
 *
 * - Chaves assimétricas (padrão atual): verifica via JWKS público do projeto.
 * - Chave simétrica (HS256, projetos legados / testes): usa SUPABASE_JWT_SECRET.
 *
 * O conjunto de algoritmos aceitos é fixo para cada tipo de chave; um token "alg: none" ou
 * HS256 assinado com a chave pública é recusado (proteção contra confusão de algoritmo).
 */
@Injectable()
export class JwtVerifierService {
  private readonly issuer: string;
  private readonly secret: Uint8Array | null;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: AppConfig) {
    this.issuer = `${config.get('SUPABASE_URL').replace(/\/$/, '')}/auth/v1`;
    const secret = config.get('SUPABASE_JWT_SECRET');
    this.secret = secret ? new TextEncoder().encode(secret) : null;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`), {
      cooldownDuration: 30_000,
      timeoutDuration: 5_000,
    });
  }

  async verify(token: string): Promise<VerifiedClaims> {
    try {
      const { alg } = decodeProtectedHeader(token);
      const options = { issuer: this.issuer, audience: 'authenticated' };

      let payload: unknown;
      if (alg === 'HS256') {
        if (!this.secret) throw new Error('HS256 não configurado');
        ({ payload } = await jwtVerify(token, this.secret, { ...options, algorithms: ['HS256'] }));
      } else if (alg && ASYMMETRIC_ALGORITHMS.includes(alg)) {
        ({ payload } = await jwtVerify(token, this.jwks, {
          ...options,
          algorithms: ASYMMETRIC_ALGORITHMS,
        }));
      } else {
        throw new Error('Algoritmo não aceito');
      }

      const claims = claimsSchema.parse(payload);
      const metadata = claims.user_metadata ?? {};
      const accepted = metadata.accepted_terms_at ? new Date(metadata.accepted_terms_at) : null;
      return {
        sub: claims.sub,
        email: claims.email ?? null,
        fullName: metadata.full_name ?? metadata.name ?? null,
        termsAcceptedAt: accepted && !Number.isNaN(accepted.getTime()) ? accepted : null,
      };
    } catch {
      // Qualquer falha (assinatura, expiração, emissor, formato) vira o mesmo 401, sem detalhes.
      throw AppException.unauthorized('Sua sessão expirou. Entre de novo para continuar.');
    }
  }
}
