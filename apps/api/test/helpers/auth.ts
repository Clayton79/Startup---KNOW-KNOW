import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';

interface TokenOptions {
  sub?: string;
  email?: string;
  fullName?: string;
  acceptedTermsAt?: string;
  issuer?: string;
  audience?: string;
  secret?: string;
  /** Ex.: '1h', '-1h' (já expirado). */
  expiresIn?: string;
}

/** Emite um JWT no mesmo formato do Supabase Auth, assinado com o segredo de teste. */
export async function mintToken(
  options: TokenOptions = {},
): Promise<{ token: string; sub: string }> {
  const sub = options.sub ?? randomUUID();
  const secret = new TextEncoder().encode(options.secret ?? process.env.SUPABASE_JWT_SECRET);
  const issuer = options.issuer ?? `${process.env.SUPABASE_URL}/auth/v1`;

  const token = await new SignJWT({
    email: options.email ?? `${sub.slice(0, 8)}@example.com`,
    role: 'authenticated',
    user_metadata: {
      ...(options.fullName ? { full_name: options.fullName } : {}),
      ...(options.acceptedTermsAt ? { accepted_terms_at: options.acceptedTermsAt } : {}),
    },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(sub)
    .setIssuer(issuer)
    .setAudience(options.audience ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(options.expiresIn ?? '1h')
    .sign(secret);

  return { token, sub };
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
