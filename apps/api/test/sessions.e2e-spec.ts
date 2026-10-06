import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { Scenario, type TestUser } from './helpers/scenario';

describe('Aulas: solicitação, resposta e agenda', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: Scenario;
  let ana: TestUser; // mentora de inglês
  let lucas: TestUser; // aluno

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

  describe('POST /sessions', () => {
    it('cria a solicitação, reserva os créditos e avisa o mentor', async () => {
      const res = await s.request(lucas, ana, 'ingles');

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        status: 'PENDING',
        creditCost: 10,
        durationMinutes: 60,
        myRole: 'STUDENT',
        awaitingMyResponse: false,
        meetingUrl: null,
        allowedActions: ['CANCEL'],
        skill: { name: 'Inglês' },
        mentor: { displayName: 'Ana' },
      });

      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 10, available: 10 });

      const mentorView = await s
        .http()
        .get(`/api/v1/sessions/${res.body.id}`)
        .set(ana.auth)
        .expect(200);
      expect(mentorView.body.awaitingMyResponse).toBe(true);
      expect(mentorView.body.allowedActions).toEqual(['ACCEPT', 'REJECT', 'PROPOSE_TIME']);

      const notes = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      expect(notes.body.items[0]).toMatchObject({
        type: 'SESSION_REQUESTED',
        title: 'Nova solicitação de aula',
        body: 'Lucas gostaria de aprender Inglês com você.',
        read: false,
      });
    });

    it('calcula o custo pela duração e pela taxa configurada', async () => {
      const half = await s.request(lucas, ana, 'ingles', { duration: 30 });
      expect(half.body.creditCost).toBe(5);
      const long = await s.request(lucas, ana, 'ingles', { duration: 120, hour: 14 });
      expect(long.status).toBe(409); // 15 disponíveis, mas 20 necessários
      expect(long.body.error.code).toBe('INSUFFICIENT_CREDITS');
    });

    it('não permite marcar aula consigo mesmo', async () => {
      const res = await s
        .http()
        .post('/api/v1/sessions')
        .set(ana.auth)
        .send({
          mentorId: ana.id,
          skillId: await s.skillId('ingles'),
          startsAt: s.slot(),
          durationMinutes: 60,
          mode: 'ONLINE',
        });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('SELF_SESSION');
    });

    it('recusa habilidade que a pessoa não ensina', async () => {
      const res = await s.request(lucas, ana, 'java');
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('SKILL_NOT_TAUGHT');
    });

    it('trata mentor que não terminou o onboarding como inexistente', async () => {
      const ghost = await s.user('Ghost', { teach: [['ingles']], onboarded: false });
      const res = await s.request(lucas, ghost, 'ingles');
      expect(res.status).toBe(404);
    });

    it('recusa horário fora da disponibilidade do mentor (no fuso dele)', async () => {
      const busy = await s.user('Bia', {
        teach: [['ingles']],
        availability: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinute: 18 * 60,
          endMinute: 21 * 60,
        })),
      });
      const outside = await s.request(lucas, busy, 'ingles', { hour: 10 });
      expect(outside.status).toBe(422);
      expect(outside.body.error.code).toBe('OUTSIDE_AVAILABILITY');

      const inside = await s.request(lucas, busy, 'ingles', { hour: 19 });
      expect(inside.status).toBe(201);
    });

    it('recusa horário no passado, curto demais ou longe demais', async () => {
      const bad = async (startsAt: string) =>
        s
          .http()
          .post('/api/v1/sessions')
          .set(lucas.auth)
          .send({
            mentorId: ana.id,
            skillId: await s.skillId('ingles'),
            startsAt,
            durationMinutes: 60,
            mode: 'ONLINE',
          });

      expect((await bad(new Date(Date.now() - 3600_000).toISOString())).status).toBe(422);
      expect((await bad(new Date(Date.now() + 5 * 60_000).toISOString())).status).toBe(422);
      expect((await bad(new Date(Date.now() + 90 * 86400_000).toISOString())).status).toBe(422);
    });

    it('valida o corpo: duração fora da lista, id inválido e link de reunião não-https', async () => {
      const res = await s
        .http()
        .post('/api/v1/sessions')
        .set(lucas.auth)
        .send({
          mentorId: 'nao-e-uuid',
          skillId: await s.skillId('ingles'),
          startsAt: s.slot(),
          durationMinutes: 45,
          mode: 'ONLINE',
        });
      expect(res.status).toBe(400);
      const paths = (res.body.error.details as { path: string }[]).map((d) => d.path).sort();
      expect(paths).toEqual(['durationMinutes', 'mentorId']);

      const id = await s.requested(lucas, ana, 'ingles');
      const bad = await s
        .http()
        .patch(`/api/v1/sessions/${id}/accept`)
        .set(ana.auth)
        .send({ meetingUrl: 'javascript:alert(1)' });
      expect(bad.status).toBe(400);
    });

    it('exige créditos disponíveis e diz quantos faltam', async () => {
      await s.requested(lucas, ana, 'ingles', { hour: 9 });
      await s.requested(lucas, ana, 'ingles', { hour: 11 });
      const res = await s.request(lucas, ana, 'ingles', { hour: 13 });

      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({
        code: 'INSUFFICIENT_CREDITS',
        message: 'Você precisa de mais 10 créditos para marcar esta aula.',
      });
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 20, available: 0 });
    });

    it('não reserva créditos duas vezes para a mesma solicitação repetida', async () => {
      await s.requested(lucas, ana, 'ingles');
      const again = await s.request(lucas, ana, 'ingles');
      expect(again.status).toBe(409);
      expect(await s.wallet(lucas)).toMatchObject({ held: 10 });
    });

    it('requisições simultâneas nunca reservam mais do que o saldo', async () => {
      const results = await Promise.all(
        [8, 10, 12, 14].map((hour) => s.request(lucas, ana, 'ingles', { hour })),
      );
      const statuses = results.map((r) => r.status).sort();
      expect(statuses).toEqual([201, 201, 409, 409]);
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 20, available: 0 });
    });
  });

  describe('responder à solicitação', () => {
    it('o mentor aceita: link só para os participantes e aluno notificado', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      const res = await s.accept(ana, id);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ACCEPTED');
      expect(res.body.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');

      const student = await s.http().get(`/api/v1/sessions/${id}`).set(lucas.auth).expect(200);
      expect(student.body.meetingUrl).toBe('https://meet.google.com/abc-defg-hij');

      const outsider = await s.user('Intruso');
      await s.http().get(`/api/v1/sessions/${id}`).set(outsider.auth).expect(404);

      const notes = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(notes.body.items[0].type).toBe('SESSION_ACCEPTED');
    });

    it('o link nunca aparece enquanto a solicitação está pendente', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      await s
        .http()
        .patch(`/api/v1/sessions/${id}/meeting`)
        .set(ana.auth)
        .send({ meetingUrl: 'https://meet.google.com/xyz' })
        .expect(409);
      const view = await s.http().get(`/api/v1/sessions/${id}`).set(lucas.auth).expect(200);
      expect(view.body.meetingUrl).toBeNull();
    });

    it('quem pediu não pode aceitar a própria solicitação', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      const res = await s.http().patch(`/api/v1/sessions/${id}/accept`).set(lucas.auth).send({});
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_SESSION_STATE');
    });

    it('terceiros não conseguem ver nem agir sobre a aula (sempre 404)', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      const intruder = await s.user('Intruso');

      await s.http().get(`/api/v1/sessions/${id}`).set(intruder.auth).expect(404);
      await s.http().patch(`/api/v1/sessions/${id}/accept`).set(intruder.auth).send({}).expect(404);
      await s.http().patch(`/api/v1/sessions/${id}/reject`).set(intruder.auth).expect(404);
      await s.http().patch(`/api/v1/sessions/${id}/cancel`).set(intruder.auth).expect(404);
      await s
        .http()
        .patch(`/api/v1/sessions/${id}/propose-time`)
        .set(intruder.auth)
        .send({ startsAt: s.slot(4) })
        .expect(404);
      await s.confirm(intruder, id, true).expect(404);

      const list = await s.http().get('/api/v1/sessions').set(intruder.auth).expect(200);
      expect(list.body.total).toBe(0);
    });

    it('recusar libera os créditos e avisa o aluno', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      expect(await s.wallet(lucas)).toMatchObject({ held: 10 });

      const res = await s.http().patch(`/api/v1/sessions/${id}/reject`).set(ana.auth).expect(200);
      expect(res.body.status).toBe('REJECTED');
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 0, available: 20 });

      const notes = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(notes.body.items[0]).toMatchObject({ type: 'SESSION_REJECTED' });
    });

    it('quem pediu não pode "recusar" a própria solicitação (deve cancelar)', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      await s.http().patch(`/api/v1/sessions/${id}/reject`).set(lucas.auth).expect(409);
    });

    it('o mentor sugere outro horário e o aluno aceita a contraproposta', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      const newStart = s.slot(4, 15);

      const proposed = await s
        .http()
        .patch(`/api/v1/sessions/${id}/propose-time`)
        .set(ana.auth)
        .send({ startsAt: newStart })
        .expect(200);
      expect(proposed.body.status).toBe('PENDING');
      expect(proposed.body.startsAt).toBe(newStart);
      expect(proposed.body.lastProposedById).toBe(ana.id);
      expect(proposed.body.allowedActions).toEqual(['CANCEL']);

      // O mentor não aceita a própria proposta; a vez é do aluno.
      await s.http().patch(`/api/v1/sessions/${id}/accept`).set(ana.auth).send({}).expect(409);
      const studentView = await s.http().get(`/api/v1/sessions/${id}`).set(lucas.auth).expect(200);
      expect(studentView.body.awaitingMyResponse).toBe(true);

      const accepted = await s
        .http()
        .patch(`/api/v1/sessions/${id}/accept`)
        .set(lucas.auth)
        .send({})
        .expect(200);
      expect(accepted.body.status).toBe('ACCEPTED');
      expect(accepted.body.startsAt).toBe(newStart);
      // Os créditos continuam reservados; o custo não mudou.
      expect(await s.wallet(lucas)).toMatchObject({ held: 10 });
    });

    it('o horário sugerido também precisa caber na disponibilidade', async () => {
      const bia = await s.user('Bia', {
        teach: [['ingles']],
        availability: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinute: 18 * 60,
          endMinute: 21 * 60,
        })),
      });
      const id = await s.requested(lucas, bia, 'ingles', { hour: 19 });
      const res = await s
        .http()
        .patch(`/api/v1/sessions/${id}/propose-time`)
        .set(bia.auth)
        .send({ startsAt: s.slot(4, 10) });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('OUTSIDE_AVAILABILITY');
    });
  });

  describe('cancelamento', () => {
    it('o aluno cancela uma solicitação pendente: créditos liberados', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      const res = await s.http().patch(`/api/v1/sessions/${id}/cancel`).set(lucas.auth).expect(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 0, available: 20 });
    });

    it('qualquer um cancela uma aula aceita antes de começar, e o aluno recupera a reserva', async () => {
      const id = await s.accepted(lucas, ana, 'ingles');
      const res = await s.http().patch(`/api/v1/sessions/${id}/cancel`).set(ana.auth).expect(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(await s.wallet(lucas)).toMatchObject({ balance: 20, held: 0 });

      const notes = await s.http().get('/api/v1/notifications').set(lucas.auth).expect(200);
      expect(notes.body.items[0]).toMatchObject({ type: 'SESSION_CANCELLED' });
    });

    it('uma aula cancelada não pode ser concluída nem reaberta', async () => {
      const id = await s.accepted(lucas, ana, 'ingles');
      await s.http().patch(`/api/v1/sessions/${id}/cancel`).set(ana.auth).expect(200);
      await s.makePast(id);

      const confirm = await s.confirm(lucas, id, true);
      expect(confirm.status).toBe(409);
      await s.http().patch(`/api/v1/sessions/${id}/accept`).set(ana.auth).send({}).expect(409);
      expect(await s.wallet(ana)).toMatchObject({ balance: 20 });
    });

    it('depois que a aula começa já não dá para cancelar', async () => {
      const id = await s.accepted(lucas, ana, 'ingles');
      await prisma.session.update({
        where: { id },
        data: {
          startsAt: new Date(Date.now() - 10 * 60_000),
          endsAt: new Date(Date.now() + 50 * 60_000),
        },
      });
      const res = await s.http().patch(`/api/v1/sessions/${id}/cancel`).set(lucas.auth);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_SESSION_STATE');
    });
  });

  describe('conflitos de horário', () => {
    it('não aceita duas aulas sobrepostas do mesmo mentor', async () => {
      const marina = await s.user('Marina', { learn: ['ingles'] });
      const first = await s.requested(lucas, ana, 'ingles', { hour: 10 });
      const second = await s.requested(marina, ana, 'ingles', { hour: 10 });

      await s.accept(ana, first).then((r) => expect(r.status).toBe(200));
      const res = await s.accept(ana, second);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TIME_CONFLICT');
    });

    it('barra nova solicitação num horário já confirmado do mentor', async () => {
      const marina = await s.user('Marina', { learn: ['ingles'] });
      await s.accepted(lucas, ana, 'ingles', { hour: 10 });
      const res = await s.request(marina, ana, 'ingles', { hour: 10 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TIME_CONFLICT');
    });

    it('barra o aluno de marcar duas aulas ao mesmo tempo', async () => {
      const bruno = await s.user('Bruno', { teach: [['python']] });
      await s.accepted(lucas, ana, 'ingles', { hour: 10 });
      const res = await s.request(lucas, bruno, 'python', { hour: 10 });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TIME_CONFLICT');
    });

    it('aceites simultâneos de horários sobrepostos: um passa, o outro recebe 409 (nunca 500)', async () => {
      const marina = await s.user('Marina', { learn: ['ingles'] });
      const first = await s.requested(lucas, ana, 'ingles', { hour: 10 });
      const second = await s.requested(marina, ana, 'ingles', { hour: 10 });

      const [a, b] = await Promise.all([s.accept(ana, first), s.accept(ana, second)]);
      expect([a.status, b.status].sort()).toEqual([200, 409]);
      const loser = a.status === 409 ? a : b;
      expect(loser.body.error.code).toBe('TIME_CONFLICT');
    });

    it('o banco recusa sobreposição mesmo se a aplicação falhar', async () => {
      const marina = await s.user('Marina', { learn: ['ingles'] });
      const first = await s.requested(lucas, ana, 'ingles', { hour: 10 });
      const second = await s.requested(marina, ana, 'ingles', { hour: 10 });
      await s.accept(ana, first).then((r) => expect(r.status).toBe(200));
      const original = await prisma.session.findUniqueOrThrow({ where: { id: first } });

      await expect(
        prisma.session.update({
          where: { id: second },
          data: { status: 'ACCEPTED', startsAt: original.startsAt, endsAt: original.endsAt },
        }),
      ).rejects.toThrow();
    });

    it('aulas colando uma na outra (fim = início) não são conflito', async () => {
      await s.accepted(lucas, ana, 'ingles', { hour: 10 });
      const res = await s.request(lucas, ana, 'ingles', { hour: 11 });
      expect(res.status).toBe(201);
    });
  });

  describe('solicitações vencidas', () => {
    it('quando o horário passa sem resposta, a reserva é liberada e as duas pessoas são avisadas', async () => {
      const id = await s.requested(lucas, ana, 'ingles');
      expect(await s.wallet(lucas)).toMatchObject({ held: 10 });

      const now = Date.now();
      await prisma.session.update({
        where: { id },
        data: { startsAt: new Date(now - 2 * 3600_000), endsAt: new Date(now - 3600_000) },
      });

      expect(await s.wallet(lucas)).toEqual({ balance: 20, held: 0, available: 20 });
      const view = await s.http().get(`/api/v1/sessions/${id}`).set(lucas.auth).expect(200);
      expect(view.body.status).toBe('CANCELLED');

      const notes = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
      expect(notes.body.items.map((n: { type: string }) => n.type)).toContain('SESSION_EXPIRED');
    });
  });

  describe('listagens', () => {
    it('filtra por escopo e papel, com paginação', async () => {
      await s.requested(lucas, ana, 'ingles', { hour: 9 });
      await s.accepted(lucas, ana, 'ingles', { hour: 11 });

      const pending = await s
        .http()
        .get('/api/v1/sessions?scope=pending')
        .set(ana.auth)
        .expect(200);
      expect(pending.body.total).toBe(1);
      expect(pending.body.items[0].status).toBe('PENDING');

      const upcoming = await s
        .http()
        .get('/api/v1/sessions?scope=upcoming')
        .set(lucas.auth)
        .expect(200);
      expect(upcoming.body.total).toBe(1);

      const asMentor = await s
        .http()
        .get('/api/v1/sessions?role=MENTOR')
        .set(lucas.auth)
        .expect(200);
      expect(asMentor.body.total).toBe(0);

      const page = await s
        .http()
        .get('/api/v1/sessions?pageSize=1&page=2')
        .set(lucas.auth)
        .expect(200);
      expect(page.body).toMatchObject({ page: 2, pageSize: 1, total: 2 });
      expect(page.body.items).toHaveLength(1);
    });

    it('limita o tamanho da página', async () => {
      await s.http().get('/api/v1/sessions?pageSize=500').set(lucas.auth).expect(400);
    });
  });

  describe('horários livres', () => {
    it('lista os horários livres e esconde os já ocupados', async () => {
      const bia = await s.user('Bia', {
        teach: [['ingles']],
        availability: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
          weekday,
          startMinute: 18 * 60,
          endMinute: 20 * 60,
        })),
      });
      const before = await s
        .http()
        .get(`/api/v1/users/${bia.id}/slots?durationMinutes=60&days=7`)
        .set(lucas.auth)
        .expect(200);
      expect(before.body.timezone).toBe('America/Sao_Paulo');
      expect(before.body.slots.length).toBeGreaterThan(0);

      await s.accepted(lucas, bia, 'ingles', { hour: 18, daysAhead: 2 });
      const taken = s.slot(2, 18);
      const after = await s
        .http()
        .get(`/api/v1/users/${bia.id}/slots?durationMinutes=60&days=7`)
        .set(lucas.auth)
        .expect(200);
      const starts = after.body.slots.map((slot: { startsAt: string }) => slot.startsAt);
      expect(starts).not.toContain(taken);
      expect(starts).toContain(s.slot(2, 19));
    });
  });
});
