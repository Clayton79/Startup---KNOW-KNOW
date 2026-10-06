import { randomUUID } from 'node:crypto';
import type { Page, Route } from '@playwright/test';
import { SignJWT } from 'jose';
import { E2E } from '../env';

export interface KnownUser {
  id: string;
  email: string;
  name: string;
}

/** Mesmo cálculo do seed (apps/api/prisma/seed.ts): ids fixos dos perfis de demonstração. */
function demoId(key: string): string {
  const hex = Buffer.from(key.padEnd(6, '0')).toString('hex').slice(0, 12).padEnd(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

export const DEMO_USERS: Record<string, KnownUser> = {
  ana: { id: demoId('ana'), email: 'ana@demo.know-know.app', name: 'Ana Ribeiro' },
  lucas: { id: demoId('lucas'), email: 'lucas@demo.know-know.app', name: 'Lucas Ferreira' },
  marina: { id: demoId('marina'), email: 'marina@demo.know-know.app', name: 'Marina Duarte' },
  rafael: { id: demoId('rafael'), email: 'rafael@demo.know-know.app', name: 'Rafael Moreira' },
  admin: { id: demoId('admin'), email: 'admin@demo.know-know.app', name: 'Equipe KNOW-KNOW' },
};

const secret = new TextEncoder().encode(E2E.jwtSecret);

async function issueSession(user: KnownUser, metadata: Record<string, unknown> = {}) {
  const expiresIn = 3600;
  const accessToken = await new SignJWT({
    email: user.email,
    role: 'authenticated',
    user_metadata: { full_name: user.name, ...metadata },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuer(`${E2E.supabaseUrl}/auth/v1`)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(secret);

  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.floor(Date.now() / 1000) + expiresIn,
    refresh_token: `refresh-${user.id}`,
    user: {
      id: user.id,
      aud: 'authenticated',
      role: 'authenticated',
      email: user.email,
      email_confirmed_at: new Date().toISOString(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { full_name: user.name, ...metadata },
      created_at: new Date().toISOString(),
    },
  };
}

function corsHeaders(route: Route): Record<string, string> {
  return {
    'access-control-allow-origin': route.request().headers()['origin'] ?? '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'content-type': 'application/json',
  };
}

interface RequestBody {
  email?: string;
  password?: string;
  data?: { full_name?: string; accepted_terms_at?: string };
}

export interface MockSupabase {
  /** Contas criadas pelo cadastro durante o teste (e-mail → usuário). */
  signedUp: Map<string, KnownUser>;
  /** Faz com que o próximo login falhe como "senha incorreta". */
  failNextLogin(): void;
}

/**
 * Simula as rotas do Supabase Auth (cadastro, login, usuário, logout, recuperação). O navegador
 * recebe tokens reais (assinados com o segredo que a API de e2e usa para validar), então tudo
 * depois do login (API, banco, regras) é de verdade.
 */
export async function mockSupabase(page: Page): Promise<MockSupabase> {
  const known = new Map<string, KnownUser>(
    Object.values(DEMO_USERS).map((user) => [user.email.toLowerCase(), user]),
  );
  const signedUp = new Map<string, KnownUser>();
  let failLogin = false;
  let current: KnownUser | null = null;

  await page.route(`${E2E.supabaseUrl}/**`, async (route) => {
    const request = route.request();
    const headers = corsHeaders(route);

    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }

    const url = new URL(request.url());
    const body: RequestBody = request.postData()
      ? (JSON.parse(request.postData() as string) as RequestBody)
      : {};

    if (url.pathname.endsWith('/auth/v1/signup')) {
      const email = String(body.email).toLowerCase();
      const user: KnownUser = {
        id: randomUUID(),
        email,
        name: String(body.data?.full_name ?? email.split('@')[0]),
      };
      known.set(email, user);
      signedUp.set(email, user);
      current = user;
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify(
          await issueSession(user, { accepted_terms_at: body.data?.accepted_terms_at }),
        ),
      });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/token')) {
      const grant = url.searchParams.get('grant_type');
      if (grant === 'password') {
        const user = known.get(String(body.email).toLowerCase());
        if (!user || failLogin) {
          failLogin = false;
          await route.fulfill({
            status: 400,
            headers,
            body: JSON.stringify({
              code: 400,
              error_code: 'invalid_credentials',
              msg: 'Invalid login credentials',
            }),
          });
          return;
        }
        current = user;
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(await issueSession(user)),
        });
        return;
      }
      if (grant === 'refresh_token' && current) {
        await route.fulfill({
          status: 200,
          headers,
          body: JSON.stringify(await issueSession(current)),
        });
        return;
      }
    }

    if (url.pathname.endsWith('/auth/v1/user') && current) {
      const { user } = await issueSession(current);
      await route.fulfill({ status: 200, headers, body: JSON.stringify(user) });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/logout')) {
      current = null;
      await route.fulfill({ status: 204, headers });
      return;
    }

    if (url.pathname.endsWith('/auth/v1/recover')) {
      await route.fulfill({ status: 200, headers, body: '{}' });
      return;
    }

    await route.fulfill({ status: 404, headers, body: JSON.stringify({ msg: 'not mocked' }) });
  });

  return {
    signedUp,
    failNextLogin: () => {
      failLogin = true;
    },
  };
}
