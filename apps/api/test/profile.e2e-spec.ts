import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { bearer, mintToken } from './helpers/auth';

describe('Perfil, onboarding e conhecimentos', () => {
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

  async function newUser(fullName = 'Pessoa Teste') {
    const { token, sub } = await mintToken({ fullName });
    await http().get('/api/v1/me').set(bearer(token)).expect(200);
    return { token, id: sub, auth: bearer(token) };
  }

  async function skillId(slug: string): Promise<string> {
    return (await prisma.skill.findUniqueOrThrow({ where: { slug } })).id;
  }

  describe('PATCH /me', () => {
    it('atualiza os próprios dados', async () => {
      const user = await newUser();
      const res = await http()
        .patch('/api/v1/me')
        .set(user.auth)
        .send({
          displayName: '  Clayton  ',
          bio: 'Dev apaixonado por ensinar.',
          city: 'Curitiba',
          state: 'pr',
          preferredMode: 'ONLINE',
          timezone: 'America/Sao_Paulo',
        })
        .expect(200);

      expect(res.body).toMatchObject({
        displayName: 'Clayton',
        bio: 'Dev apaixonado por ensinar.',
        city: 'Curitiba',
        state: 'PR',
        preferredMode: 'ONLINE',
      });
    });

    it('rejeita campos que o usuário não pode alterar (mass assignment)', async () => {
      const user = await newUser();
      const res = await http()
        .patch('/api/v1/me')
        .set(user.auth)
        .send({ displayName: 'Hacker', role: 'ADMIN', status: 'ACTIVE', mentorRatingSum: 999 })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');

      const profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id } });
      expect(profile.role).toBe('USER');
      expect(profile.mentorRatingSum).toBe(0);
    });

    it('valida campos e devolve os detalhes por campo', async () => {
      const user = await newUser();
      const res = await http()
        .patch('/api/v1/me')
        .set(user.auth)
        .send({ displayName: 'A', timezone: 'Marte/Olympus', bio: 'x'.repeat(501) })
        .expect(400);

      const paths = (res.body.error.details as { path: string }[]).map((d) => d.path).sort();
      expect(paths).toEqual(['bio', 'displayName', 'timezone']);
    });

    it('só altera o perfil de quem está logado', async () => {
      const alice = await newUser('Alice');
      const bob = await newUser('Bob');
      await http()
        .patch('/api/v1/me')
        .set(alice.auth)
        .send({ displayName: 'Alice Nova' })
        .expect(200);

      const bobProfile = await prisma.profile.findUniqueOrThrow({ where: { id: bob.id } });
      expect(bobProfile.displayName).toBe('Bob');
    });

    it('não aceita avatar na pasta de outro usuário', async () => {
      const alice = await newUser('Alice');
      const bob = await newUser('Bob');
      const res = await http()
        .patch('/api/v1/me')
        .set(alice.auth)
        .send({ avatarPath: `${bob.id}/foto.png` })
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');

      await http()
        .patch('/api/v1/me')
        .set(alice.auth)
        .send({ avatarPath: `${alice.id}/foto.png` })
        .expect(200);
    });
  });

  describe('conhecimentos que ensino e quero aprender', () => {
    it('salva, devolve no /me e substitui a lista anterior', async () => {
      const user = await newUser();
      const java = await skillId('java');
      const ingles = await skillId('ingles');

      await http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: java, level: 'ADVANCED', description: 'Spring e JPA' }] })
        .expect(200);
      await http()
        .put('/api/v1/me/learning-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: ingles, desiredLevel: 'INTERMEDIATE' }] })
        .expect(200);

      let me = (await http().get('/api/v1/me').set(user.auth).expect(200)).body;
      expect(me.teachingSkills).toHaveLength(1);
      expect(me.teachingSkills[0]).toMatchObject({
        level: 'ADVANCED',
        description: 'Spring e JPA',
        skill: { name: 'Java', categoryName: 'Tecnologia' },
      });
      expect(me.learningSkills[0]).toMatchObject({
        desiredLevel: 'INTERMEDIATE',
        skill: { name: 'Inglês' },
      });

      // Trocar a lista remove o que saiu e atualiza o que ficou.
      const python = await skillId('python');
      await http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: python, level: 'BASIC' }] })
        .expect(200);
      me = (await http().get('/api/v1/me').set(user.auth).expect(200)).body;
      expect(me.teachingSkills.map((t: { skill: { slug: string } }) => t.skill.slug)).toEqual([
        'python',
      ]);
    });

    it('recusa habilidade inexistente ou repetida', async () => {
      const user = await newUser();
      const java = await skillId('java');

      await http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: '00000000-0000-4000-8000-000000000000', level: 'BASIC' }] })
        .expect(422);

      await http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({
          skills: [
            { skillId: java, level: 'BASIC' },
            { skillId: java, level: 'ADVANCED' },
          ],
        })
        .expect(400);
    });

    it('não lista habilidade desativada pelo admin no catálogo nem permite escolhê-la', async () => {
      const user = await newUser();
      const java = await skillId('java');
      await prisma.skill.update({ where: { id: java }, data: { isActive: false } });

      const catalog = (await http().get('/api/v1/skills').expect(200)).body as {
        skills: { slug: string }[];
      }[];
      expect(catalog.flatMap((c) => c.skills.map((s) => s.slug))).not.toContain('java');

      await http()
        .put('/api/v1/me/teaching-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: java, level: 'BASIC' }] })
        .expect(422);
    });
  });

  describe('disponibilidade', () => {
    it('salva faixas semanais', async () => {
      const user = await newUser();
      const res = await http()
        .put('/api/v1/me/availability')
        .set(user.auth)
        .send({
          rules: [
            { weekday: 1, startMinute: 19 * 60, endMinute: 22 * 60 },
            { weekday: 3, startMinute: 18 * 60, endMinute: 21 * 60 },
          ],
        })
        .expect(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toMatchObject({ weekday: 1, startMinute: 1140, endMinute: 1320 });
    });

    it('recusa faixas sobrepostas no mesmo dia', async () => {
      const user = await newUser();
      const res = await http()
        .put('/api/v1/me/availability')
        .set(user.auth)
        .send({
          rules: [
            { weekday: 1, startMinute: 600, endMinute: 720 },
            { weekday: 1, startMinute: 700, endMinute: 800 },
          ],
        })
        .expect(422);
      expect(res.body.error.message).toMatch(/sobrep/);
    });

    it('recusa horário final antes do inicial', async () => {
      const user = await newUser();
      await http()
        .put('/api/v1/me/availability')
        .set(user.auth)
        .send({ rules: [{ weekday: 2, startMinute: 900, endMinute: 600 }] })
        .expect(400);
    });
  });

  describe('onboarding', () => {
    it('não conclui sem nenhum conhecimento informado', async () => {
      const user = await newUser();
      const res = await http().post('/api/v1/me/onboarding/complete').set(user.auth).expect(422);
      expect(res.body.error.code).toBe('ONBOARDING_REQUIRED');
    });

    it('registra o passo e conclui quando há ao menos um conhecimento', async () => {
      const user = await newUser();
      await http().patch('/api/v1/me/onboarding').set(user.auth).send({ step: 2 }).expect(200);

      await http()
        .put('/api/v1/me/learning-skills')
        .set(user.auth)
        .send({ skills: [{ skillId: await skillId('ingles') }] })
        .expect(200);

      const res = await http().post('/api/v1/me/onboarding/complete').set(user.auth).expect(200);
      expect(res.body.onboarding).toEqual({ step: 5, completed: true });
    });

    it('recusa passo fora do intervalo', async () => {
      const user = await newUser();
      await http().patch('/api/v1/me/onboarding').set(user.auth).send({ step: 9 }).expect(400);
    });
  });

  describe('perfil público (GET /users/:id)', () => {
    it('exige login', async () => {
      const user = await newUser();
      await http().get(`/api/v1/users/${user.id}`).expect(401);
    });

    it('esconde quem ainda não terminou o onboarding', async () => {
      const alice = await newUser('Alice');
      const bob = await newUser('Bob');
      await http().get(`/api/v1/users/${bob.id}`).set(alice.auth).expect(404);
    });

    it('mostra só o necessário depois do onboarding, sem dados de conta', async () => {
      const alice = await newUser('Alice');
      const bob = await newUser('Bob');
      await http()
        .put('/api/v1/me/teaching-skills')
        .set(bob.auth)
        .send({ skills: [{ skillId: await skillId('java'), level: 'ADVANCED' }] })
        .expect(200);
      await http().post('/api/v1/me/onboarding/complete').set(bob.auth).expect(200);

      const res = await http().get(`/api/v1/users/${bob.id}`).set(alice.auth).expect(200);
      expect(res.body.displayName).toBe('Bob');
      expect(res.body.teachingSkills).toHaveLength(1);
      for (const hidden of ['email', 'role', 'status', 'avatarPath', 'onboarding']) {
        expect(res.body).not.toHaveProperty(hidden);
      }
    });

    it('rejeita id que não é UUID', async () => {
      const alice = await newUser('Alice');
      await http().get('/api/v1/users/nao-e-uuid').set(alice.auth).expect(400);
    });

    it('contas desativadas viram 404', async () => {
      const alice = await newUser('Alice');
      const bob = await newUser('Bob');
      await http()
        .put('/api/v1/me/teaching-skills')
        .set(bob.auth)
        .send({ skills: [{ skillId: await skillId('java'), level: 'BASIC' }] })
        .expect(200);
      await http().post('/api/v1/me/onboarding/complete').set(bob.auth).expect(200);
      await prisma.profile.update({ where: { id: bob.id }, data: { status: 'SUSPENDED' } });

      await http().get(`/api/v1/users/${bob.id}`).set(alice.auth).expect(404);
    });
  });
});
