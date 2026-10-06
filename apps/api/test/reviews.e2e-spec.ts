import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { Scenario, type TestUser } from './helpers/scenario';

const studentScores = (didactics = 5, knowledge = 5, punctuality = 5) => ({
  scores: [
    { category: 'DIDACTICS', score: didactics },
    { category: 'KNOWLEDGE', score: knowledge },
    { category: 'PUNCTUALITY', score: punctuality },
  ],
});
const mentorScores = (participation = 5, punctuality = 5, respect = 5) => ({
  scores: [
    { category: 'PARTICIPATION', score: participation },
    { category: 'PUNCTUALITY', score: punctuality },
    { category: 'RESPECT', score: respect },
  ],
});

describe('Avaliações e reputação', () => {
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
    lucas = await s.user('Lucas', { learn: ['ingles'] });
  });

  afterAll(async () => {
    await app.close();
  });

  const review = (user: TestUser, sessionId: string, body: object) =>
    s.http().post(`/api/v1/sessions/${sessionId}/reviews`).set(user.auth).send(body);

  it('só dá para avaliar depois que a aula for concluída', async () => {
    const accepted = await s.accepted(lucas, ana, 'ingles');
    const early = await review(lucas, accepted, studentScores());
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('REVIEW_NOT_ALLOWED');

    await s.makePast(accepted);
    await s.confirm(lucas, accepted, true).expect(200); // só um lado confirmou
    const half = await review(lucas, accepted, studentScores());
    expect(half.status).toBe(409);
  });

  it('o aluno avalia o mentor: nota geral é a média arredondada e a reputação é atualizada', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    const res = await review(lucas, id, { ...studentScores(5, 4, 4), comment: '  Aula ótima!  ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      direction: 'STUDENT_TO_MENTOR',
      rating: 4, // (5+4+4)/3 = 4,33 → 4
      comment: 'Aula ótima!',
      skillName: 'Inglês',
      author: { displayName: 'Lucas' },
    });
    expect(res.body.scores).toHaveLength(3);

    const mentor = await prisma.profile.findUniqueOrThrow({ where: { id: ana.id } });
    expect(mentor).toMatchObject({ mentorRatingSum: 4, mentorRatingCount: 1 });
    expect(mentor.studentRatingCount).toBe(0);

    const notes = await s.http().get('/api/v1/notifications').set(ana.auth).expect(200);
    expect(notes.body.items.map((n: { type: string }) => n.type)).toContain('REVIEW_RECEIVED');
  });

  it('o mentor avalia o aluno com outras categorias', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    const res = await review(ana, id, mentorScores(5, 5, 5));
    expect(res.status).toBe(201);
    expect(res.body.direction).toBe('MENTOR_TO_STUDENT');

    const student = await prisma.profile.findUniqueOrThrow({ where: { id: lucas.id } });
    expect(student).toMatchObject({
      studentRatingSum: 5,
      studentRatingCount: 1,
      mentorRatingCount: 0,
    });
  });

  it('não permite avaliar duas vezes a mesma aula', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    await review(lucas, id, studentScores()).expect(201);
    const again = await review(lucas, id, studentScores(1, 1, 1));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('ALREADY_REVIEWED');

    const mentor = await prisma.profile.findUniqueOrThrow({ where: { id: ana.id } });
    expect(mentor.mentorRatingCount).toBe(1);
  });

  it('avaliações simultâneas da mesma pessoa contam uma só vez', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    const results = await Promise.all(
      Array.from({ length: 4 }, () => review(lucas, id, studentScores())),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    const mentor = await prisma.profile.findUniqueOrThrow({ where: { id: ana.id } });
    expect(mentor.mentorRatingCount).toBe(1);
  });

  it('quem não participou da aula não consegue avaliar (404)', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    const intruder = await s.user('Intruso');
    await review(intruder, id, studentScores()).expect(404);
  });

  it('exige exatamente as categorias da direção correta', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    // Aluno tentando usar categorias de mentor.
    const wrong = await review(lucas, id, mentorScores());
    expect(wrong.status).toBe(422);
    // Faltando uma categoria.
    const missing = await review(lucas, id, { scores: studentScores().scores.slice(0, 2) });
    expect(missing.status).toBe(422);
    // Categoria repetida.
    const repeated = await review(lucas, id, {
      scores: [...studentScores().scores.slice(0, 2), studentScores().scores[0]],
    });
    expect(repeated.status).toBe(422);
  });

  it('valida notas de 1 a 5 e o tamanho do comentário', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    await review(lucas, id, studentScores(6, 5, 5)).expect(400);
    await review(lucas, id, studentScores(0, 5, 5)).expect(400);
    await review(lucas, id, { ...studentScores(), comment: 'x'.repeat(301) }).expect(400);
  });

  it('o banco também recusa avaliação de aula não concluída', async () => {
    const id = await s.accepted(lucas, ana, 'ingles');
    await expect(
      prisma.review.create({
        data: {
          sessionId: id,
          authorId: lucas.id,
          targetId: ana.id,
          direction: 'STUDENT_TO_MENTOR',
          rating: 5,
        },
      }),
    ).rejects.toThrow();
  });

  it('o banco recusa avaliação entre quem não participou da aula', async () => {
    const id = await s.completed(lucas, ana, 'ingles');
    const intruder = await s.user('Intruso');
    await expect(
      prisma.review.create({
        data: {
          sessionId: id,
          authorId: intruder.id,
          targetId: ana.id,
          direction: 'STUDENT_TO_MENTOR',
          rating: 5,
        },
      }),
    ).rejects.toThrow();
  });

  describe('listagens', () => {
    it('mostra avaliações recebidas com média e quantidade no perfil', async () => {
      const id = await s.completed(lucas, ana, 'ingles');
      await review(lucas, id, { ...studentScores(5, 5, 5), comment: 'Excelente' }).expect(201);

      const second = await s.user('Bia', { learn: ['ingles'] });
      const id2 = await s.completed(second, ana, 'ingles');
      await review(second, id2, studentScores(4, 4, 4)).expect(201);

      const list = await s
        .http()
        .get(`/api/v1/users/${ana.id}/reviews`)
        .set(lucas.auth)
        .expect(200);
      expect(list.body.total).toBe(2);
      expect(
        list.body.items[0].comment === null || typeof list.body.items[0].comment === 'string',
      ).toBe(true);

      const profile = await s.http().get(`/api/v1/users/${ana.id}`).set(lucas.auth).expect(200);
      expect(profile.body.reputation).toEqual({ average: 4.5, count: 2 });
      expect(profile.body.mentorReputation).toEqual({ average: 4.5, count: 2 });
    });

    it('lista as avaliações pendentes de quem participou e remove da fila depois de avaliar', async () => {
      const id = await s.completed(lucas, ana, 'ingles');

      let pending = await s.http().get('/api/v1/me/reviews/pending').set(lucas.auth).expect(200);
      expect(pending.body).toHaveLength(1);
      expect(pending.body[0]).toMatchObject({
        sessionId: id,
        skillName: 'Inglês',
        direction: 'STUDENT_TO_MENTOR',
        other: { displayName: 'Ana' },
      });

      const mentorPending = await s
        .http()
        .get('/api/v1/me/reviews/pending')
        .set(ana.auth)
        .expect(200);
      expect(mentorPending.body[0].direction).toBe('MENTOR_TO_STUDENT');

      await review(lucas, id, studentScores()).expect(201);
      pending = await s.http().get('/api/v1/me/reviews/pending').set(lucas.auth).expect(200);
      expect(pending.body).toHaveLength(0);
    });

    it('as avaliações que recebi aparecem em /me/reviews', async () => {
      const id = await s.completed(lucas, ana, 'ingles');
      await review(lucas, id, studentScores()).expect(201);
      const mine = await s.http().get('/api/v1/me/reviews').set(ana.auth).expect(200);
      expect(mine.body.total).toBe(1);
      const others = await s.http().get('/api/v1/me/reviews').set(lucas.auth).expect(200);
      expect(others.body.total).toBe(0);
    });
  });
});
