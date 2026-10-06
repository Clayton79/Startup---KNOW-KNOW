import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { Scenario, type TestUser } from './helpers/scenario';

describe('Notificações, denúncias, painel, administração e conta', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: Scenario;
  let ana: TestUser;
  let lucas: TestUser;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    s = new Scenario(app, prisma);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    ana = await s.user('Ana', { teach: [['ingles']] });
    lucas = await s.user('Lucas', { learn: ['ingles'], teach: [['excel']] });
  });

  afterAll(async () => {
    await app.close();
  });

  async function makeAdmin(): Promise<TestUser> {
    const admin = await s.user('Admin');
    await prisma.profile.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    return admin;
  }

  describe('notificações', () => {
    it('conta não lidas, marca uma e todas como lidas', async () => {
      await s.requested(lucas, ana, 'ingles', { hour: 9 });
      await s.requested(lucas, ana, 'ingles', { hour: 11 });

      const count = await s
        .http()
        .get('/api/v1/notifications/unread-count')
        .set(ana.auth)
        .expect(200);
      expect(count.body).toEqual({ count: 2 });

      const list = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      const first = list.body.items[0];
      expect(first.actor).toMatchObject({ displayName: 'Lucas' });
      expect(first.link).toMatch(/^\/aulas\//);

      await s.http().patch(`/api/v1/notifications/${first.id}/read`).set(ana.auth).expect(204);
      expect(
        (await s.http().get('/api/v1/notifications/unread-count').set(ana.auth)).body.count,
      ).toBe(1);

      await s.http().post('/api/v1/notifications/read-all').set(ana.auth).expect(204);
      expect(
        (await s.http().get('/api/v1/notifications/unread-count').set(ana.auth)).body.count,
      ).toBe(0);
    });

    it('avisa que a aula está chegando, uma única vez por pessoa', async () => {
      const soon = await s.requested(lucas, ana, 'ingles', { daysAhead: 3, hour: 10 });
      await s.accept(ana, soon);
      await prisma.session.update({
        where: { id: soon },
        data: {
          startsAt: new Date(Date.now() + 2 * 3600_000),
          endsAt: new Date(Date.now() + 3 * 3600_000),
        },
      });

      const first = await s
        .http()
        .get('/api/v1/notifications/unread-count')
        .set(lucas.auth)
        .expect(200);
      const second = await s
        .http()
        .get('/api/v1/notifications/unread-count')
        .set(lucas.auth)
        .expect(200);
      expect(second.body.count).toBe(first.body.count);

      const list = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      const reminders = list.body.items.filter(
        (n: { type: string }) => n.type === 'SESSION_REMINDER',
      );
      expect(reminders).toHaveLength(1);
      expect(reminders[0].body).toBe('A aula de Inglês com Ana está chegando.');

      const mentorList = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      expect(
        mentorList.body.items.filter((n: { type: string }) => n.type === 'SESSION_REMINDER'),
      ).toHaveLength(1);
    });

    it('ninguém marca como lida a notificação de outra pessoa', async () => {
      await s.requested(lucas, ana, 'ingles');
      const list = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      const id = list.body.items[0].id;

      await s.http().patch(`/api/v1/notifications/${id}/read`).set(lucas.auth).expect(204);
      const note = await prisma.notification.findUniqueOrThrow({ where: { id } });
      expect(note.readAt).toBeNull();

      const others = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(others.body.items.map((n: { id: string }) => n.id)).not.toContain(id);
    });
  });

  describe('denúncias', () => {
    it('registra uma denúncia', async () => {
      await s
        .http()
        .post('/api/v1/reports')
        .set(lucas.auth)
        .send({ targetUserId: ana.id, reason: 'SPAM', details: 'Mandou mensagens estranhas.' })
        .expect(204);
      expect(await prisma.report.count()).toBe(1);
    });

    it('recusa denunciar a si mesmo, pessoa inexistente e aula de terceiros', async () => {
      await s
        .http()
        .post('/api/v1/reports')
        .set(lucas.auth)
        .send({ targetUserId: lucas.id, reason: 'SPAM' })
        .expect(422);
      await s
        .http()
        .post('/api/v1/reports')
        .set(lucas.auth)
        .send({ targetUserId: '00000000-0000-4000-8000-000000000000', reason: 'SPAM' })
        .expect(404);

      const bia = await s.user('Bia', { learn: ['ingles'] });
      const sessionId = await s.requested(bia, ana, 'ingles');
      await s
        .http()
        .post('/api/v1/reports')
        .set(lucas.auth)
        .send({ targetUserId: ana.id, sessionId, reason: 'NO_SHOW' })
        .expect(404);
    });

    it('não aceita denúncia duplicada enquanto a anterior está em análise', async () => {
      const body = { targetUserId: ana.id, reason: 'FAKE_PROFILE' };
      await s.http().post('/api/v1/reports').set(lucas.auth).send(body).expect(204);
      await s.http().post('/api/v1/reports').set(lucas.auth).send(body).expect(409);
    });
  });

  describe('painel (dashboard)', () => {
    it('reúne saldo, próximas aulas, números e pendências', async () => {
      const id = await s.accepted(lucas, ana, 'ingles', { hour: 10 });
      void id;

      const asStudent = await s.http().get('/api/v1/dashboard').set(lucas.auth).expect(200);
      expect(asStudent.body.wallet).toEqual({ balance: 20, held: 10, available: 10 });
      expect(asStudent.body.nextLearning).toMatchObject({
        skill: { name: 'Inglês' },
        myRole: 'STUDENT',
      });
      expect(asStudent.body.nextTeaching).toBeNull();
      expect(asStudent.body.stats).toEqual({
        hoursTaught: 0,
        hoursLearned: 0,
        ratingAverage: null,
        ratingCount: 0,
      });

      const asMentor = await s.http().get('/api/v1/dashboard').set(ana.auth).expect(200);
      expect(asMentor.body.nextTeaching).toMatchObject({ myRole: 'MENTOR' });
      expect(asMentor.body.nextLearning).toBeNull();
    });

    it('conta solicitações para responder, confirmações e avaliações pendentes', async () => {
      await prisma.wallet.update({ where: { userId: lucas.id }, data: { balance: 100 } });
      await s.requested(lucas, ana, 'ingles', { hour: 9 });
      const done = await s.completed(lucas, ana, 'ingles');
      const waiting = await s.finished(lucas, ana, 'ingles');
      await prisma.session.update({
        where: { id: waiting },
        data: {
          startsAt: new Date(Date.now() - 6 * 3600_000),
          endsAt: new Date(Date.now() - 5 * 3600_000),
        },
      });
      void done;

      const mentor = await s.http().get('/api/v1/dashboard').set(ana.auth).expect(200);
      expect(mentor.body.pending).toEqual({
        requestsForMe: 1,
        awaitingMyConfirmation: 1,
        reviewsToWrite: 1,
      });
      expect(mentor.body.stats.hoursTaught).toBe(1);
    });

    it('recomenda pessoas que ensinam o que quero aprender', async () => {
      const res = await s.http().get('/api/v1/dashboard').set(lucas.auth).expect(200);
      expect(res.body.recommendations.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Ana',
      ]);
    });
  });

  describe('administração', () => {
    it('todas as rotas /admin recusam usuário comum com 403', async () => {
      const routes: [string, string][] = [
        ['get', '/api/v1/admin/stats'],
        ['get', '/api/v1/admin/users'],
        ['get', '/api/v1/admin/reports'],
        ['get', '/api/v1/admin/skills'],
        ['get', '/api/v1/admin/disputes'],
      ];
      for (const [method, path] of routes) {
        const res = await (
          s.http() as never as Record<string, (p: string) => import('supertest').Test>
        )[method]!(path).set(lucas.auth);
        expect(res.status).toBe(403);
      }
      await s.http().get('/api/v1/admin/stats').expect(401);
    });

    it('o papel vem do banco, não do token: promover pelo token não funciona', async () => {
      // Um token com "role: admin" no payload não muda nada; só a coluna do banco vale.
      const res = await s.http().get('/api/v1/admin/stats').set(lucas.auth);
      expect(res.status).toBe(403);
    });

    it('mostra números gerais', async () => {
      const admin = await makeAdmin();
      const res = await s.http().get('/api/v1/admin/stats').set(admin.auth).expect(200);
      expect(res.body).toMatchObject({ users: 3, activeUsers: 3, openReports: 0 });
      expect(res.body.creditsInCirculation).toBe(60);
    });

    it('suspende e reativa uma conta; a conta suspensa perde o acesso na hora', async () => {
      const admin = await makeAdmin();
      await s
        .http()
        .patch(`/api/v1/admin/users/${lucas.id}/status`)
        .set(admin.auth)
        .send({ status: 'SUSPENDED' })
        .expect(204);

      const blocked = await s.http().get('/api/v1/me').set(lucas.auth);
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('ACCOUNT_DISABLED');

      await s
        .http()
        .patch(`/api/v1/admin/users/${lucas.id}/status`)
        .set(admin.auth)
        .send({ status: 'ACTIVE' })
        .expect(204);
      await s.http().get('/api/v1/me').set(lucas.auth).expect(200);
    });

    it('admin não altera a própria conta', async () => {
      const admin = await makeAdmin();
      await s
        .http()
        .patch(`/api/v1/admin/users/${admin.id}/status`)
        .set(admin.auth)
        .send({ status: 'SUSPENDED' })
        .expect(422);
    });

    it('lista usuários com busca e paginação', async () => {
      const admin = await makeAdmin();
      const res = await s.http().get('/api/v1/admin/users?q=luc').set(admin.auth).expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        displayName: 'Lucas',
        balance: 20,
        status: 'ACTIVE',
      });
    });

    it('trata denúncias', async () => {
      const admin = await makeAdmin();
      await s
        .http()
        .post('/api/v1/reports')
        .set(lucas.auth)
        .send({ targetUserId: ana.id, reason: 'SPAM' })
        .expect(204);

      const list = await s
        .http()
        .get('/api/v1/admin/reports?status=OPEN')
        .set(admin.auth)
        .expect(200);
      expect(list.body.items[0]).toMatchObject({
        reason: 'SPAM',
        reporter: { displayName: 'Lucas' },
        target: { displayName: 'Ana' },
      });

      await s
        .http()
        .patch(`/api/v1/admin/reports/${list.body.items[0].id}`)
        .set(admin.auth)
        .send({ status: 'RESOLVED', resolutionNote: 'Conversamos com a pessoa.' })
        .expect(204);
      const report = await prisma.report.findFirstOrThrow();
      expect(report).toMatchObject({ status: 'RESOLVED', resolvedById: admin.id });
      expect(report.resolvedAt).not.toBeNull();
    });

    it('gerencia o catálogo de conhecimentos', async () => {
      const admin = await makeAdmin();
      const categories = await s
        .http()
        .get('/api/v1/admin/skill-categories')
        .set(admin.auth)
        .expect(200);
      const tech = categories.body.find((c: { name: string }) => c.name === 'Tecnologia');

      await s
        .http()
        .post('/api/v1/admin/skills')
        .set(admin.auth)
        .send({ categoryId: tech.id, name: 'Rust' })
        .expect(204);
      await s
        .http()
        .post('/api/v1/admin/skills')
        .set(admin.auth)
        .send({ categoryId: tech.id, name: 'Rust' })
        .expect(409);

      const skills = await s.http().get('/api/v1/admin/skills').set(admin.auth).expect(200);
      const rust = skills.body.find((k: { name: string }) => k.name === 'Rust');
      expect(rust).toMatchObject({ slug: 'rust', isActive: true, categoryName: 'Tecnologia' });

      await s
        .http()
        .patch(`/api/v1/admin/skills/${rust.id}`)
        .set(admin.auth)
        .send({ isActive: false })
        .expect(204);
      const catalog = await s.http().get('/api/v1/skills').expect(200);
      expect(JSON.stringify(catalog.body)).not.toContain('Rust');
    });
  });

  describe('exclusão de conta (LGPD)', () => {
    it('exige a palavra de confirmação', async () => {
      await s.http().delete('/api/v1/me').set(lucas.auth).send({}).expect(400);
      await s.http().delete('/api/v1/me').set(lucas.auth).send({ confirmation: 'sim' }).expect(400);
      await s.http().get('/api/v1/me').set(lucas.auth).expect(200);
    });

    it('anonimiza, cancela solicitações abertas liberando créditos e bloqueia o acesso', async () => {
      await s
        .http()
        .patch('/api/v1/me')
        .set(lucas.auth)
        .send({ bio: 'Minha bio', city: 'Curitiba' })
        .expect(200);
      const open = await s.requested(lucas, ana, 'ingles');

      await s
        .http()
        .delete('/api/v1/me')
        .set(lucas.auth)
        .send({ confirmation: 'EXCLUIR' })
        .expect(204);

      const profile = await prisma.profile.findUniqueOrThrow({ where: { id: lucas.id } });
      expect(profile).toMatchObject({
        displayName: 'Usuário removido',
        bio: null,
        city: null,
        avatarPath: null,
        status: 'DELETED',
      });
      expect(profile.deletedAt).not.toBeNull();
      expect(await prisma.userLearningSkill.count({ where: { userId: lucas.id } })).toBe(0);

      const session = await prisma.session.findUniqueOrThrow({ where: { id: open } });
      expect(session.status).toBe('CANCELLED');
      const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: lucas.id } });
      expect(wallet.held).toBe(0);

      const after = await s.http().get('/api/v1/me').set(lucas.auth);
      expect(after.status).toBe(403);
      expect(after.body.error.code).toBe('ACCOUNT_DISABLED');

      // Some do Explorar e o histórico financeiro permanece.
      const found = await s.http().get('/api/v1/explore?q=Lucas').expect(200);
      expect(found.body.total).toBe(0);
      expect(await prisma.creditTransaction.count({ where: { userId: lucas.id } })).toBeGreaterThan(
        0,
      );
    });

    it('não deixa excluir enquanto há aula esperando confirmação', async () => {
      await s.finished(lucas, ana, 'ingles');
      const res = await s
        .http()
        .delete('/api/v1/me')
        .set(lucas.auth)
        .send({ confirmation: 'EXCLUIR' });
      expect(res.status).toBe(409);
      const profile = await prisma.profile.findUniqueOrThrow({ where: { id: lucas.id } });
      expect(profile.status).toBe('ACTIVE');
    });
  });
});
