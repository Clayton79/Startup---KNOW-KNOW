import { validateEnv } from './env';

const base = {
  FRONTEND_URL: 'http://localhost:5173',
  CORS_ALLOWED_ORIGINS: 'http://localhost:5173, https://app.example.com/',
  DATABASE_URL: 'postgresql://u@localhost/db',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
};

describe('validateEnv', () => {
  it('aplica padrões e normaliza as origens do CORS', () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(3000);
    expect(env.CREDITS_PER_HOUR).toBe(10);
    expect(env.CORS_ALLOWED_ORIGINS).toEqual(['http://localhost:5173', 'https://app.example.com']);
  });

  it('falha cedo listando o que está errado', () => {
    expect(() => validateEnv({})).toThrow(/DATABASE_URL/);
  });

  it('em produção exige https no Supabase e proíbe CORS curinga', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'production' })).toThrow(/https/);
    expect(() =>
      validateEnv({
        ...base,
        NODE_ENV: 'production',
        SUPABASE_URL: 'https://x.supabase.co',
        CORS_ALLOWED_ORIGINS: '*',
      }),
    ).toThrow(/sem "\*"/);
  });
});
