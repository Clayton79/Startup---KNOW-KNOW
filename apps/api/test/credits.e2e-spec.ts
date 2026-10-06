import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { Scenario, type TestUser } from './helpers/scenario';

describe('Créditos: confirmação, liquidação e ledger', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: Scenario;
  let ana: TestUser; // mentora
  let lucas: TestUser; // aluno

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    s = new Scenario(app, prisma);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    ana = await s.user('Ana', { teach: [['ingles']] });
    lucas = await s.user('Lucas', { learn: ['ingles'] });
  });

  afterAll(async () => {
    await app.close();
  });

  const ledgerOf = (userId: string) =>
    prisma.creditTransaction.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });

  describe('depois da aula', () => {
    it('não deixa confirmar antes de a aula terminar', async () => {
      const id = await s.accepted(lucas, ana, 'ingles');
      const res = await s.confirm(lucas, id, true);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('SESSION_NOT_FINISHED');
    });

    it('confirmação de um só lado deixa a aula aguardando e não mexe nos créditos', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      const res = await s.confirm(lucas, id, true).expect(200);

      expect(res.body.status).toBe('AWAITING_CONFIRMATION');
      expect(res.body.myConfirmation).toBe('YES');
      expect(res.body.otherHasConfirmed).toBe(false);
      expect(res.body.allowedActions).toEqual([]);
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 10, available: 10 });
      expect(await s.wallet(ana)).toEqual({ balance: 20, held: 0, available: 20 });

      const mentorView = await s.http().get(`/api/v1/sessions/${id}`).set(ana.auth).expect(200);
      expect(mentorView.body.allowedActions).toEqual(['CONFIRM']);
      expect(mentorView.body.otherHasConfirmed).toBe(true);
    });

    it('SIM + SIM conclui a aula e transfere os créditos (fluxo principal)', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, id, true).expect(200);
      const done = await s.confirm(ana, id, true).expect(200);

      expect(done.body.status).toBe('COMPLETED');
      expect(done.body.allowedActions).toEqual(['REVIEW']);

      expect(await s.wallet(lucas)).toEqual({ balance: 10, held: 0, available: 10 });
      expect(await s.wallet(ana)).toEqual({ balance: 30, held: 0, available: 30 });

      const studentLedger = await ledgerOf(lucas.id);
      expect(studentLedger.map((t) => [t.type, t.amount, t.balanceAfter])).toEqual([
        ['BONUS', 20, 20],
        ['SPENT_CLASS', -10, 10],
      ]);
      const mentorLedger = await ledgerOf(ana.id);
      expect(mentorLedger.map((t) => [t.type, t.amount, t.balanceAfter])).toEqual([
        ['BONUS', 20, 20],
        ['EARNED_CLASS', 10, 30],
      ]);
      expect(studentLedger[1]?.sessionId).toBe(id);

      const session = await prisma.session.findUniqueOrThrow({ where: { id } });
      expect(session.settledAt).not.toBeNull();

      const [mentor, student] = await Promise.all([
        prisma.profile.findUniqueOrThrow({ where: { id: ana.id } }),
        prisma.profile.findUniqueOrThrow({ where: { id: lucas.id } }),
      ]);
      expect(mentor.sessionsTaught).toBe(1);
      expect(student.sessionsLearned).toBe(1);
    });

    it('notifica as duas pessoas e avisa o mentor sobre os créditos', async () => {
      await s.completed(lucas, ana, 'ingles');
      const mentorNotes = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      const types = mentorNotes.body.items.map((n: { type: string }) => n.type);
      expect(types).toEqual(expect.arrayContaining(['SESSION_COMPLETED', 'CREDITS_RECEIVED']));
      const credits = mentorNotes.body.items.find(
        (n: { type: string }) => n.type === 'CREDITS_RECEIVED',
      );
      expect(credits.body).toBe('Você recebeu 10 créditos pela aula de Inglês.');

      const studentNotes = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(studentNotes.body.items.map((n: { type: string }) => n.type)).toContain(
        'SESSION_COMPLETED',
      );
    });

    it('a mesma pessoa não pode confirmar duas vezes', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, id, true).expect(200);
      const again = await s.confirm(lucas, id, true);
      expect(again.status).toBe(409);
      expect(again.body.error.code).toBe('ALREADY_CONFIRMED');
      expect(await ledgerOf(lucas.id)).toHaveLength(1);
    });

    it('é idempotente: repetir a confirmação final não paga duas vezes', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, id, true).expect(200);
      await s.confirm(ana, id, true).expect(200);

      for (let i = 0; i < 3; i++) {
        const retry = await s.confirm(ana, id, true);
        expect(retry.status).toBe(409);
      }
      expect(await s.wallet(ana)).toMatchObject({ balance: 30 });
      expect(await s.wallet(lucas)).toMatchObject({ balance: 10 });
      expect(await prisma.creditTransaction.count({ where: { sessionId: id } })).toBe(2);
    });

    it('confirmações simultâneas dos dois lados liquidam exatamente uma vez', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      const results = await Promise.all([s.confirm(lucas, id, true), s.confirm(ana, id, true)]);
      expect(results.map((r) => r.status)).toEqual([200, 200]);

      expect(await prisma.creditTransaction.count({ where: { sessionId: id } })).toBe(2);
      expect(await s.wallet(ana)).toMatchObject({ balance: 30 });
      expect(await s.wallet(lucas)).toEqual({ balance: 10, held: 0, available: 10 });
    });

    it('cliques repetidos da mesma pessoa simultâneos: um efeito só', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      const results = await Promise.all(
        Array.from({ length: 6 }, () => s.confirm(lucas, id, true)),
      );
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(5);
      await s.confirm(ana, id, true).expect(200);
      expect(await prisma.creditTransaction.count({ where: { sessionId: id } })).toBe(2);
    });

    it('NÃO + NÃO: a aula não aconteceu, créditos liberados e ninguém recebe', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, id, false).expect(200);
      const res = await s.confirm(ana, id, false).expect(200);

      expect(res.body.status).toBe('NO_SHOW');
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 0, available: 20 });
      expect(await s.wallet(ana)).toMatchObject({ balance: 20 });
      expect(await prisma.creditTransaction.count({ where: { sessionId: id } })).toBe(0);

      const notes = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(notes.body.items[0].body).toMatch(/não aconteceu/);
    });

    it('SIM + NÃO: aula em revisão, créditos continuam reservados e as duas pessoas são avisadas', async () => {
      const id = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, id, true).expect(200);
      const res = await s.confirm(ana, id, false).expect(200);

      expect(res.body.status).toBe('DISPUTED');
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 10, available: 10 });
      expect(await s.wallet(ana)).toMatchObject({ balance: 20 });
      for (const user of [lucas, ana]) {
        const notes = await s.http().get('/api/v1/notifications').set(user.auth).expect(200);
        expect(notes.body.items.map((n: { type: string }) => n.type)).toContain('SESSION_DISPUTED');
      }
    });
  });

  describe('resolução de aulas em revisão (admin)', () => {
    let admin: TestUser;
    let disputed: string;

    beforeEach(async () => {
      admin = await s.user('Admin');
      await prisma.profile.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
      disputed = await s.finished(lucas, ana, 'ingles');
      await s.confirm(lucas, disputed, true).expect(200);
      await s.confirm(ana, disputed, false).expect(200);
    });

    it('usuário comum não resolve (403)', async () => {
      const res = await s
        .http()
        .post(`/api/v1/admin/sessions/${disputed}/resolve`)
        .set(lucas.auth)
        .send({ outcome: 'COMPLETE' });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('COMPLETE paga o mentor uma única vez', async () => {
      await s
        .http()
        .post(`/api/v1/admin/sessions/${disputed}/resolve`)
        .set(admin.auth)
        .send({ outcome: 'COMPLETE' })
        .expect(204);
      expect(await s.wallet(ana)).toMatchObject({ balance: 30 });
      expect(await s.wallet(lucas)).toEqual({ balance: 10, held: 0, available: 10 });

      // Repetir não paga de novo (a aula já não está em revisão).
      await s
        .http()
        .post(`/api/v1/admin/sessions/${disputed}/resolve`)
        .set(admin.auth)
        .send({ outcome: 'COMPLETE' })
        .expect(409);
      expect(await s.wallet(ana)).toMatchObject({ balance: 30 });
    });

    it('CANCEL estorna a reserva do aluno', async () => {
      await s
        .http()
        .post(`/api/v1/admin/sessions/${disputed}/resolve`)
        .set(admin.auth)
        .send({ outcome: 'CANCEL' })
        .expect(204);
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 0, available: 20 });
      expect(await s.wallet(ana)).toMatchObject({ balance: 20 });
    });
  });

  describe('carteira', () => {
    it('histórico em ordem do mais recente, paginado', async () => {
      await s.completed(lucas, ana, 'ingles');
      const res = await s
        .http()
        .get('/api/v1/wallet/transactions?pageSize=1')
        .set(lucas.auth)
        .expect(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 1, total: 2 });
      expect(res.body.items[0]).toMatchObject({
        type: 'SPENT_CLASS',
        amount: -10,
        balanceAfter: 10,
        description: 'Aula de Inglês',
      });

      const page2 = await s
        .http()
        .get('/api/v1/wallet/transactions?pageSize=1&page=2')
        .set(lucas.auth)
        .expect(200);
      expect(page2.body.items[0].type).toBe('BONUS');
    });

    it('cada pessoa só enxerga o próprio histórico', async () => {
      await s.completed(lucas, ana, 'ingles');
      const res = await s.http().get('/api/v1/wallet/transactions').set(ana.auth).expect(200);
      expect(res.body.items.map((t: { type: string }) => t.type).sort()).toEqual([
        'BONUS',
        'EARNED_CLASS',
      ]);
    });

    it('não existe endpoint para transferir ou editar créditos manualmente', async () => {
      for (const [method, path] of [
        ['post', '/api/v1/wallet/transfer'],
        ['patch', '/api/v1/wallet'],
        ['put', '/api/v1/wallet'],
        ['delete', '/api/v1/wallet/transactions'],
      ] as const) {
        const res = await s.http()[method](path).set(lucas.auth).send({ amount: 999 });
        expect(res.status).toBe(404);
      }
      expect(await s.wallet(lucas)).toMatchObject({ balance: 20 });
    });
  });

  describe('garantias do banco', () => {
    it('o ledger é imutável: não permite alterar nem apagar transações', async () => {
      const [tx] = await ledgerOf(lucas.id);
      await expect(
        prisma.creditTransaction.update({ where: { id: tx!.id }, data: { amount: 9999 } }),
      ).rejects.toThrow();
      await expect(prisma.creditTransaction.delete({ where: { id: tx!.id } })).rejects.toThrow();
      expect(await ledgerOf(lucas.id)).toHaveLength(1);
    });

    it('o saldo nunca fica negativo', async () => {
      await expect(
        prisma.wallet.update({ where: { userId: lucas.id }, data: { balance: -1 } }),
      ).rejects.toThrow();
    });

    it('o reservado nunca passa do saldo', async () => {
      await expect(
        prisma.wallet.update({ where: { userId: lucas.id }, data: { held: 21 } }),
      ).rejects.toThrow();
    });

    it('a mesma aula não gera duas transações do mesmo tipo para a mesma pessoa', async () => {
      const id = await s.completed(lucas, ana, 'ingles');
      await expect(
        prisma.creditTransaction.create({
          data: {
            userId: ana.id,
            type: 'EARNED_CLASS',
            amount: 10,
            balanceAfter: 40,
            sessionId: id,
            description: 'duplicada',
          },
        }),
      ).rejects.toThrow();
    });

    it('valida o sinal do valor conforme o tipo da transação', async () => {
      await expect(
        prisma.creditTransaction.create({
          data: {
            userId: lucas.id,
            type: 'SPENT_CLASS',
            amount: 5,
            balanceAfter: 25,
            description: 'sinal errado',
          },
        }),
      ).rejects.toThrow();
    });

    it('a soma do ledger sempre bate com o saldo da carteira', async () => {
      await s.completed(lucas, ana, 'ingles');
      const bob = await s.user('Bob', { learn: ['ingles'] });
      const id = await s.finished(bob, ana, 'ingles');
      await s.confirm(bob, id, true).expect(200);
      await s.confirm(ana, id, true).expect(200);

      for (const user of [ana, lucas, bob]) {
        const sum = await prisma.creditTransaction.aggregate({
          where: { userId: user.id },
          _sum: { amount: true },
        });
        const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } });
        expect(sum._sum.amount).toBe(wallet.balance);
      }
    });
  });

  describe('ajuste administrativo', () => {
    let admin: TestUser;

    beforeEach(async () => {
      admin = await s.user('Admin');
      await prisma.profile.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
    });

    it('registra o ajuste no ledger com o id de quem fez', async () => {
      const res = await s
        .http()
        .post('/api/v1/admin/credits/adjust')
        .set(admin.auth)
        .send({ userId: lucas.id, amount: 15, description: 'Crédito de cortesia' })
        .expect(201);
      expect(res.body).toEqual({ balance: 35 });

      const [, adjustment] = await ledgerOf(lucas.id);
      expect(adjustment).toMatchObject({
        type: 'ADMIN_ADJUSTMENT',
        amount: 15,
        balanceAfter: 35,
        createdById: admin.id,
      });
    });

    it('não deixa o saldo cair abaixo do que está reservado', async () => {
      await s.requested(lucas, ana, 'ingles'); // reserva 10 de 20
      const res = await s
        .http()
        .post('/api/v1/admin/credits/adjust')
        .set(admin.auth)
        .send({ userId: lucas.id, amount: -15, description: 'Correção indevida' });
      expect(res.status).toBe(422);
      expect(await s.wallet(lucas)).toMatchObject({ balance: 20, held: 10 });
    });

    it('usuário comum não consegue ajustar créditos (403)', async () => {
      const res = await s
        .http()
        .post('/api/v1/admin/credits/adjust')
        .set(lucas.auth)
        .send({ userId: lucas.id, amount: 1000, description: 'Tentando me dar créditos' });
      expect(res.status).toBe(403);
      expect(await s.wallet(lucas)).toMatchObject({ balance: 20 });
    });
  });

  describe('liquidações cruzadas simultâneas', () => {
    it('duas aulas em sentidos opostos entre as mesmas pessoas não travam (sem deadlock)', async () => {
      const bia = await s.user('Bia', { teach: [['ingles']], learn: ['python'] });
      const caio = await s.user('Caio', { teach: [['python']], learn: ['ingles'] });

      const first = await s.finished(caio, bia, 'ingles'); // Caio aprende com Bia
      const second = await s.finished(bia, caio, 'python'); // Bia aprende com Caio
      // Ajusta para os dois horários não colidirem na agenda (ambos já no passado).
      await prisma.session.update({
        where: { id: second },
        data: {
          startsAt: new Date(Date.now() - 5 * 3600_000),
          endsAt: new Date(Date.now() - 4 * 3600_000),
        },
      });

      await Promise.all([s.confirm(caio, first, true), s.confirm(bia, second, true)]);
      const results = await Promise.all([
        s.confirm(bia, first, true),
        s.confirm(caio, second, true),
      ]);
      expect(results.map((r) => r.status)).toEqual([200, 200]);

      // Cada um ganhou 10 e gastou 10: saldo final igual ao inicial.
      expect(await s.wallet(bia)).toEqual({ balance: 20, held: 0, available: 20 });
      expect(await s.wallet(caio)).toEqual({ balance: 20, held: 0, available: 20 });
    });
  });
});
