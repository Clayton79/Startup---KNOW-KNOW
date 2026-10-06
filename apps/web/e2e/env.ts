/**
 * Configuração dos testes de ponta a ponta. Usa um banco próprio (`knowknow_e2e`) e um
 * Supabase Auth SIMULADO no navegador (veja support/mock-supabase.ts); a API, o banco e a
 * interface são os reais.
 */
const apiPort = 3100;
const webPort = 5174;

/** Mesmo valor nos dois lados: a API valida os tokens que o mock do Supabase emite. */
const jwtSecret = 'e2e-secret-with-at-least-32-characters-long!!';
const supabaseUrl = 'http://127.0.0.1:54321';

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://knowknow@127.0.0.1:54329/knowknow_e2e';

export const E2E = {
  apiPort,
  webPort,
  apiUrl: `http://localhost:${apiPort}`,
  webUrl: `http://localhost:${webPort}`,
  databaseUrl,
  supabaseUrl,
  jwtSecret,
  apiEnv: {
    NODE_ENV: 'test',
    PORT: String(apiPort),
    FRONTEND_URL: `http://localhost:${webPort}`,
    CORS_ALLOWED_ORIGINS: `http://localhost:${webPort}`,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: databaseUrl,
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: 'e2e-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'e2e-service-role-key',
    SUPABASE_JWT_SECRET: jwtSecret,
    THROTTLE_DISABLED: 'true',
  } satisfies Record<string, string>,
  webEnv: {
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
    VITE_DEV_API_TARGET: `http://localhost:${apiPort}`,
  } satisfies Record<string, string>,
};
