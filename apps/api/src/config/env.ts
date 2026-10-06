import { z } from 'zod';

const csv = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

/** Todas as variáveis de ambiente da API. Falha cedo (na subida) se algo estiver errado. */
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3000),

    FRONTEND_URL: z.url(),
    CORS_ALLOWED_ORIGINS: csv,

    DATABASE_URL: z.string().min(1),
    DIRECT_URL: z.string().min(1).optional(),
    /** Conexões simultâneas com o banco. Em planos gratuitos, 5–8 evita estourar o limite do Supabase. */
    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

    SUPABASE_URL: z.url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    /** Só para projetos com chave simétrica (HS256). Com chaves assimétricas, deixe vazio (usa JWKS). */
    SUPABASE_JWT_SECRET: z.string().min(32).optional(),
    SUPABASE_AVATAR_BUCKET: z.string().min(1).default('avatars'),

    CREDITS_PER_HOUR: z.coerce.number().int().min(1).max(1000).default(10),
    WELCOME_BONUS_CREDITS: z.coerce.number().int().min(0).max(1000).default(20),

    THROTTLE_TTL_SECONDS: z.coerce.number().int().min(1).default(60),
    THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
    /** Só para testes automatizados. Proibido em produção. */
    THROTTLE_DISABLED: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.THROTTLE_DISABLED) {
        ctx.addIssue({
          code: 'custom',
          path: ['THROTTLE_DISABLED'],
          message: 'O rate limit não pode ser desligado em produção.',
        });
      }
      if (env.CORS_ALLOWED_ORIGINS.includes('*')) {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ALLOWED_ORIGINS'],
          message: 'Em produção, liste as origens permitidas explicitamente (sem "*").',
        });
      }
      if (!env.SUPABASE_URL.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: ['SUPABASE_URL'],
          message: 'Em produção, SUPABASE_URL precisa ser https.',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(raiz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Variáveis de ambiente inválidas:\n${problems}`);
  }
  return result.data;
}
