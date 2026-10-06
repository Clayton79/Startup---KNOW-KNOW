import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/database/prisma.service';
import { bearer, mintToken } from './helpers/auth';
import { createTestApp, resetDatabase } from './helpers/app';

describe('Autenticação', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  describe('tokens recusados (401)', () => {
    it('sem token', async () => {
      const res = await http().get('/api/v1/me').expect(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('token malformado', async () => {
      await http().get('/api/v1/me').set(bearer('isso-nao-e-um-jwt')).expect(401);
    });

    it('assinado com outro segredo', async () => {
      const { token } = await mintToken({
        secret: 'outro-segredo-qualquer-com-mais-de-32-caracteres',
      });
      await http().get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('expirado', async () => {
      const { token } = await mintToken({ expiresIn: '-1h' });
      await http().get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('emissor errado', async () => {
      const { token } = await mintToken({ issuer: 'https://atacante.example/auth/v1' });
      await http().get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('audiência errada', async () => {
      const { token } = await mintToken({ audience: 'anon' });
      await http().get('/api/v1/me').set(bearer(token)).expect(401);
    });

    it('com algoritmo "none" (sem assinatura)', async () => {
      const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
      const forged = [
        encode({ alg: 'none', typ: 'JWT' }),
        encode({
          sub: randomUUID(),
          aud: 'authenticated',
          iss: `${process.env.SUPABASE_URL}/auth/v1`,
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
        '',
      ].join('.');
      await http().get('/api/v1/me').set(bearer(forged)).expect(401);
    });

    it('não revela detalhes do motivo', async () => {
      const { token } = await mintToken({ expiresIn: '-1h' });
      const res = await http().get('/api/v1/me').set(bearer(token)).expect(401);
      expect(JSON.stringify(res.body)).not.toMatch(/signature|jwt|claim|issuer|audience/i);
    });
  });

  describe('primeiro acesso', () => {
    it('cria perfil, carteira e bônus de boas-vindas', async () => {
      const termsAt = new Date().toISOString();
      const { token, sub } = await mintToken({
        fullName: 'Clayton Silva',
        acceptedTermsAt: termsAt,
      });

      const res = await http().get('/api/v1/me').set(bearer(token)).expect(200);

      expect(res.body).toMatchObject({
        id: sub,
        displayName: 'Clayton Silva',
        role: 'USER',
        onboarding: { step: 0, completed: false },
        teachingSkills: [],
        learningSkills: [],
        reputation: { average: null, count: 0 },
      });

      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: sub } });
      expect(wallet).toMatchObject({ balance: 20, held: 0 });

      const ledger = await prisma.creditTransaction.findMany({ where: { userId: sub } });
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({ type: 'BONUS', amount: 20, balanceAfter: 20 });

      const profile = await prisma.profile.findUniqueOrThrow({ where: { id: sub } });
      expect(profile.termsAcceptedAt?.toISOString()).toBe(termsAt);
    });

    it('usa o e-mail como nome quando não há nome no cadastro', async () => {
      const { token } = await mintToken({ email: 'maria.souza@example.com' });
      const res = await http().get('/api/v1/me').set(bearer(token)).expect(200);
      expect(res.body.displayName).toBe('maria souza');
    });

    it('não duplica perfil nem bônus em requisições simultâneas', async () => {
      const { token, sub } = await mintToken();
      const responses = await Promise.all(
        Array.from({ length: 6 }, () => http().get('/api/v1/me').set(bearer(token))),
      );
      expect(responses.map((r) => r.status)).toEqual(Array(6).fill(200));

      expect(await prisma.profile.count({ where: { id: sub } })).toBe(1);
      expect(await prisma.creditTransaction.count({ where: { userId: sub } })).toBe(1);
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: sub } });
      expect(wallet.balance).toBe(20);
    });

    it('não repete o bônus em acessos seguintes', async () => {
      const { token, sub } = await mintToken();
      await http().get('/api/v1/me').set(bearer(token)).expect(200);
      await http().get('/api/v1/me').set(bearer(token)).expect(200);
      expect(await prisma.creditTransaction.count({ where: { userId: sub } })).toBe(1);
    });
  });

  describe('conta desativada', () => {
    it('suspensa recebe 403 ACCOUNT_DISABLED', async () => {
      const { token, sub } = await mintToken();
      await http().get('/api/v1/me').set(bearer(token)).expect(200);
      await prisma.profile.update({ where: { id: sub }, data: { status: 'SUSPENDED' } });

      const res = await http().get('/api/v1/me').set(bearer(token)).expect(403);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('rotas públicas', () => {
    it('catálogo de habilidades abre sem login', async () => {
      const res = await http().get('/api/v1/skills').expect(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('skills');
    });

    it('/config abre sem login', async () => {
      await http().get('/api/v1/config').expect(200);
    });
  });
});
