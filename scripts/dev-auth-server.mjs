#!/usr/bin/env node
/**
 * Login LOCAL de desenvolvimento: um substituto mínimo do Supabase Auth para você testar o app
 * em localhost SEM ter um projeto Supabase.
 *
 *   pnpm dev:auth
 *
 * - Fala o mesmo protocolo que o supabase-js usa (cadastro, login, renovação, usuário, logout,
 *   recuperação de senha) e emite JWTs HS256 assinados com SUPABASE_JWT_SECRET, que a API valida
 *   como valida os do Supabase de verdade.
 * - Só serve para DESENVOLVIMENTO: escuta apenas em 127.0.0.1, recusa rodar em produção e recusa
 *   SUPABASE_URL que não seja local. Nunca use isso para publicar o app.
 * - Não implementa Storage: o envio de foto de perfil precisa do Supabase real.
 *
 * Contas de demonstração (as mesmas do `pnpm db:seed`): senha fixa `demo-senha-123`.
 * Contas criadas pelo cadastro ficam em .local/dev-auth-users.json (ignorado pelo git).
 */
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.env.NODE_ENV === 'production') {
  console.error('dev-auth-server: recusado em produção. Use o Supabase Auth.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function readEnvFile(file) {
  if (!existsSync(file)) return {};
  const values = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
  return values;
}

const apiEnv = readEnvFile(join(root, 'apps/api/.env'));
const setting = (key, fallback) => process.env[key] ?? apiEnv[key] ?? fallback;

const supabaseUrl = setting('SUPABASE_URL', 'http://localhost:54321').replace(/\/$/, '');
const jwtSecret = setting('SUPABASE_JWT_SECRET');
const webUrl = setting('FRONTEND_URL', 'http://localhost:5173').replace(/\/$/, '');

const parsedUrl = new URL(supabaseUrl);
if (!['localhost', '127.0.0.1'].includes(parsedUrl.hostname)) {
  console.error(
    `dev-auth-server: SUPABASE_URL (${supabaseUrl}) não é local. ` +
      'Este servidor é só para desenvolvimento; para usar um Supabase real, não rode este script.',
  );
  process.exit(1);
}
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('dev-auth-server: defina SUPABASE_JWT_SECRET (32+ caracteres) em apps/api/.env.');
  process.exit(1);
}
const port = Number(parsedUrl.port) || 54321;

// ───────────── Contas ─────────────

const DEMO_PASSWORD = 'demo-senha-123';

/** Mesmo cálculo do seed (apps/api/prisma/seed.ts): ids fixos dos perfis de demonstração. */
function demoId(key) {
  const hex = Buffer.from(key.padEnd(6, '0')).toString('hex').slice(0, 12).padEnd(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

const DEMO_USERS = [
  ['ana', 'Ana Ribeiro'],
  ['lucas', 'Lucas Ferreira'],
  ['marina', 'Marina Duarte'],
  ['rafael', 'Rafael Moreira'],
  ['admin', 'Equipe KNOW-KNOW'],
].map(([key, name]) => ({ id: demoId(key), email: `${key}@demo.know-know.app`, name }));

function hashPassword(password) {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(password, salt, 32).toString('hex')}`;
}

function checkPassword(password, stored) {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

const storeFile = join(root, '.local', 'dev-auth-users.json');
const store = existsSync(storeFile) ? JSON.parse(readFileSync(storeFile, 'utf8')) : { users: {} };

function saveStore() {
  mkdirSync(dirname(storeFile), { recursive: true });
  writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

for (const demo of DEMO_USERS) {
  if (store.users[demo.email]) continue;
  store.users[demo.email] = {
    id: demo.id,
    email: demo.email,
    name: demo.name,
    metadata: { full_name: demo.name },
    passwordHash: hashPassword(DEMO_PASSWORD),
    createdAt: new Date().toISOString(),
  };
}
saveStore();

const findByEmail = (email) =>
  store.users[
    String(email ?? '')
      .trim()
      .toLowerCase()
  ];
const findById = (id) => Object.values(store.users).find((user) => user.id === id);

// ───────────── Tokens ─────────────

const HOUR = 3600;
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function signJwt(payload) {
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const body = encode(payload);
  const signature = createHmac('sha256', jwtSecret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${signature}`;
}

function verifyJwt(token) {
  const [head, body, signature] = String(token ?? '').split('.');
  if (!head || !body || !signature) return null;
  const expected = createHmac('sha256', jwtSecret).update(`${head}.${body}`).digest();
  const given = Buffer.from(signature, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' && payload.exp > Date.now() / 1000 ? payload : null;
  } catch {
    return null;
  }
}

function publicUser(user) {
  return {
    id: user.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: user.email,
    email_confirmed_at: user.createdAt,
    confirmed_at: user.createdAt,
    last_sign_in_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { ...user.metadata, email: user.email, email_verified: true },
    identities: [],
    created_at: user.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function issueSession(user) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: signJwt({
      iss: `${supabaseUrl}/auth/v1`,
      aud: 'authenticated',
      sub: user.id,
      email: user.email,
      role: 'authenticated',
      aal: 'aal1',
      session_id: randomUUID(),
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: { ...user.metadata },
      iat: now,
      exp: now + HOUR,
    }),
    token_type: 'bearer',
    expires_in: HOUR,
    expires_at: now + HOUR,
    refresh_token: signJwt({ sub: user.id, typ: 'refresh', iat: now, exp: now + 30 * 24 * HOUR }),
    user: publicUser(user),
  };
}

// ───────────── Rotas (subconjunto do GoTrue usado pelo supabase-js) ─────────────

const fail = (status, errorCode, message) => ({
  status,
  json: { code: status, error_code: errorCode, msg: message },
});

function bearerOf(req) {
  const header = req.headers.authorization ?? '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7) : '';
}

function handle(req, url, body) {
  const path = url.pathname.replace(/^\/auth\/v1/, '') || '/';
  const method = req.method;

  if (method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    return { status: 200, text: indexText() };
  }

  if (method === 'POST' && path === '/signup') {
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return fail(422, 'validation_failed', 'Unable to validate email address: invalid format');
    }
    if (password.length < 6) {
      return fail(422, 'weak_password', 'Password should be at least 6 characters.');
    }
    if (findByEmail(email)) return fail(422, 'user_already_exists', 'User already registered');

    const metadata = body.data && typeof body.data === 'object' ? body.data : {};
    const user = {
      id: randomUUID(),
      email,
      name: String(metadata.full_name ?? email.split('@')[0]),
      metadata,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    store.users[email] = user;
    saveStore();
    return { status: 200, json: issueSession(user) };
  }

  if (method === 'POST' && path === '/token') {
    const grant = url.searchParams.get('grant_type');
    if (grant === 'password') {
      const user = findByEmail(body.email);
      if (!user || !checkPassword(String(body.password ?? ''), user.passwordHash)) {
        return fail(400, 'invalid_credentials', 'Invalid login credentials');
      }
      return { status: 200, json: issueSession(user) };
    }
    if (grant === 'refresh_token') {
      const payload = verifyJwt(body.refresh_token);
      const user = payload?.typ === 'refresh' ? findById(payload.sub) : undefined;
      if (!user) return fail(400, 'refresh_token_not_found', 'Invalid Refresh Token');
      return { status: 200, json: issueSession(user) };
    }
    return fail(400, 'validation_failed', 'unsupported grant_type');
  }

  if (path === '/user' && (method === 'GET' || method === 'PUT')) {
    const payload = verifyJwt(bearerOf(req));
    const user = payload && !payload.typ ? findById(payload.sub) : undefined;
    if (!user) return fail(401, 'bad_jwt', 'invalid JWT: unable to parse or verify signature');

    if (method === 'PUT') {
      if (body.password !== undefined) {
        if (String(body.password).length < 6) {
          return fail(422, 'weak_password', 'Password should be at least 6 characters.');
        }
        user.passwordHash = hashPassword(String(body.password));
      }
      if (body.data && typeof body.data === 'object') {
        user.metadata = { ...user.metadata, ...body.data };
      }
      saveStore();
    }
    return { status: 200, json: publicUser(user) };
  }

  if (method === 'POST' && path === '/logout') return { status: 204 };

  if (method === 'POST' && path === '/recover') {
    // Não há e-mail em desenvolvimento: o link de recuperação aparece aqui, no terminal.
    const user = findByEmail(body.email);
    if (user) {
      const session = issueSession(user);
      const link =
        `${webUrl}/redefinir-senha#access_token=${session.access_token}` +
        `&expires_at=${session.expires_at}&expires_in=${HOUR}` +
        `&refresh_token=${session.refresh_token}&token_type=bearer&type=recovery`;
      console.log(`\n📧 Link de recuperação de senha para ${user.email}:\n${link}\n`);
      mkdirSync(join(root, '.local'), { recursive: true });
      writeFileSync(join(root, '.local', 'dev-auth-recovery-link.txt'), `${link}\n`);
    }
    return { status: 200, json: {} }; // sempre 200, para não revelar quem tem conta
  }

  // A API chama isto ao excluir uma conta (exclusão de conta / LGPD).
  const adminDelete = /^\/admin\/users\/([0-9a-f-]{36})$/.exec(path);
  if (method === 'DELETE' && adminDelete) {
    const user = findById(adminDelete[1]);
    if (!user) return fail(404, 'user_not_found', 'User not found');
    delete store.users[user.email];
    saveStore();
    return { status: 200, json: {} };
  }

  return fail(404, 'not_found', `rota não implementada no login local: ${method} ${url.pathname}`);
}

function indexText() {
  const lines = [
    'KNOW-KNOW · login local de desenvolvimento (NÃO é o Supabase)',
    '',
    `Senha das contas de demonstração: ${DEMO_PASSWORD}`,
    ...DEMO_USERS.map((user) => `  ${user.email}  (${user.name})`),
    '',
    'Cadastros novos ficam em .local/dev-auth-users.json.',
  ];
  return lines.join('\n') + '\n';
}

// ───────────── Servidor HTTP ─────────────

/** Corpo JSON tolerante: vazio ou inválido vira `{}` (a rota então responde com o erro certo). */
function parseJson(raw) {
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const server = createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && LOCAL_ORIGIN.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Headers',
      req.headers['access-control-request-headers'] ?? 'authorization, apikey, content-type',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }

  const chunks = [];
  let size = 0;
  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > 100_000)
      req.destroy(); // corpo grande demais
    else chunks.push(chunk);
  });
  req.on('end', () => {
    const url = new URL(req.url ?? '/', supabaseUrl);
    const body = parseJson(Buffer.concat(chunks).toString('utf8'));

    let result;
    try {
      result = handle(req, url, body);
    } catch (error) {
      console.error(error);
      result = fail(500, 'unexpected_failure', 'erro inesperado no login local');
    }

    // Nunca registramos corpo (senhas) nem tokens.
    console.log(
      `${new Date().toLocaleTimeString('pt-BR')}  ${req.method} ${url.pathname} → ${result.status}`,
    );
    if (result.text !== undefined) {
      res
        .writeHead(result.status, { 'Content-Type': 'text/plain; charset=utf-8' })
        .end(result.text);
    } else if (result.json !== undefined) {
      res
        .writeHead(result.status, { 'Content-Type': 'application/json' })
        .end(JSON.stringify(result.json));
    } else {
      res.writeHead(result.status).end();
    }
  });
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `dev-auth-server: a porta ${port} já está em uso (outro login local ou Supabase CLI?).`,
    );
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`\n🔐 Login local de desenvolvimento em ${supabaseUrl}  (substitui o Supabase Auth)`);
  console.log(`   Senha das contas de demonstração: ${DEMO_PASSWORD}`);
  for (const user of DEMO_USERS) console.log(`   ${user.email.padEnd(30)} ${user.name}`);
  console.log('   Só para desenvolvimento. Envio de foto de perfil precisa do Supabase real.\n');
});
