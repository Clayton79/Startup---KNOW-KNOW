import type { INestApplication } from '@nestjs/common';
import type { PrismaService } from '../src/database/prisma.service';
import { createTestApp, resetDatabase } from './helpers/app';
import { Scenario, type TestUser } from './helpers/scenario';

describe('Explorar e match', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let s: Scenario;

  beforeAll(async () => {
    ({ app, prisma } = await createTestApp());
    s = new Scenario(app, prisma);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  const explore = (query = '', user?: TestUser) => {
    const req = s.http().get(`/api/v1/explore${query}`);
    return user ? req.set(user.auth) : req;
  };

  describe('busca aberta', () => {
    it('qualquer pessoa vê quem ensina, sem dados pessoais', async () => {
      await s.user('Ana', { teach: [['ingles', 'ADVANCED']], city: 'Curitiba' });
      const res = await explore('?q=ingl').expect(200);

      expect(res.body).toMatchObject({ page: 1, pageSize: 12, total: 1 });
      const card = res.body.items[0];
      expect(card).toMatchObject({
        displayName: 'Ana',
        skill: { name: 'Inglês' },
        level: 'ADVANCED',
        creditsPerHour: 10,
        match: null,
        reputation: { average: null, count: 0 },
      });
      expect(card.availability.length).toBeGreaterThan(0);
      for (const hidden of ['email', 'role', 'status', 'timezone', 'avatarPath']) {
        expect(card).not.toHaveProperty(hidden);
      }
    });

    it('esconde quem não terminou o onboarding, quem está suspenso e quem foi excluído', async () => {
      await s.user('Visível', { teach: [['ingles']] });
      await s.user('Sem onboarding', { teach: [['ingles']], onboarded: false });
      const suspended = await s.user('Suspensa', { teach: [['ingles']] });
      await prisma.profile.update({ where: { id: suspended.id }, data: { status: 'SUSPENDED' } });
      const deleted = await s.user('Excluída', { teach: [['ingles']] });
      await prisma.profile.update({ where: { id: deleted.id }, data: { status: 'DELETED' } });

      const res = await explore().expect(200);
      expect(res.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Visível',
      ]);
    });

    it('não lista habilidades desativadas', async () => {
      await s.user('Ana', { teach: [['ingles']] });
      await prisma.skill.update({ where: { slug: 'ingles' }, data: { isActive: false } });
      const res = await explore().expect(200);
      expect(res.body.total).toBe(0);
    });

    it('filtra por habilidade e nível mínimo', async () => {
      await s.user('Ana', { teach: [['ingles', 'ADVANCED']] });
      await s.user('Beto', { teach: [['ingles', 'BASIC']] });
      await s.user('Carla', { teach: [['java', 'ADVANCED']] });
      const inglesId = await s.skillId('ingles');

      const all = await explore(`?skillId=${inglesId}`).expect(200);
      expect(all.body.items.map((c: { displayName: string }) => c.displayName).sort()).toEqual([
        'Ana',
        'Beto',
      ]);

      const advanced = await explore(`?skillId=${inglesId}&level=ADVANCED`).expect(200);
      expect(advanced.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Ana',
      ]);

      const intermediate = await explore(`?skillId=${inglesId}&level=INTERMEDIATE`).expect(200);
      expect(intermediate.body.total).toBe(1);
    });

    it('filtra por modalidade, disponibilidade e avaliação mínima', async () => {
      const online = await s.user('Online', { teach: [['ingles']], mode: 'ONLINE' });
      const presencial = await s.user('Presencial', { teach: [['ingles']], mode: 'IN_PERSON' });
      const ambos = await s.user('Ambos', { teach: [['ingles']], mode: 'BOTH' });
      const semHorario = await s.user('SemHorario', { teach: [['ingles']], availability: 'none' });
      await prisma.profile.update({
        where: { id: online.id },
        data: { mentorRatingSum: 48, mentorRatingCount: 10 },
      });
      void presencial;
      void ambos;
      void semHorario;

      const names = (res: { body: { items: { displayName: string }[] } }) =>
        res.body.items.map((c) => c.displayName).sort();

      expect(names(await explore('?mode=ONLINE'))).toEqual(
        ['Ambos', 'Online', 'SemHorario'].sort(),
      );
      expect(names(await explore('?mode=IN_PERSON'))).toEqual(
        ['Ambos', 'Presencial', 'SemHorario'].sort(),
      );
      expect(names(await explore('?available=true'))).toEqual(['Ambos', 'Online', 'Presencial']);
      expect(names(await explore('?minRating=4.5'))).toEqual(['Online']);
      expect(names(await explore('?minRating=5'))).toEqual([]);
    });

    it('busca por nome da habilidade ou da pessoa, sem diferenciar maiúsculas', async () => {
      await s.user('Ana Souza', { teach: [['ingles']] });
      await s.user('Rafael', { teach: [['java']] });
      const bySkill = await explore('?q=JAVA').expect(200);
      expect(bySkill.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Rafael',
      ]);
      const byName = await explore('?q=souza').expect(200);
      expect(byName.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Ana Souza',
      ]);
    });

    it('a busca ignora acentos: "violao" acha Violão e "ingles" acha Inglês', async () => {
      await s.user('Thiago', { teach: [['violao']] });
      await s.user('Ana', { teach: [['ingles']] });
      const guitar = await explore('?q=violao').expect(200);
      expect(guitar.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Thiago',
      ]);
      const english = await explore('?q=INGLES').expect(200);
      expect(english.body.items.map((c: { displayName: string }) => c.displayName)).toEqual([
        'Ana',
      ]);
    });

    it('pagina e limita o tamanho da página', async () => {
      for (let i = 1; i <= 5; i++) await s.user(`Mentor ${i}`, { teach: [['ingles']] });
      const page = await explore('?pageSize=2&page=3').expect(200);
      expect(page.body).toMatchObject({ page: 3, pageSize: 2, total: 5 });
      expect(page.body.items).toHaveLength(1);
      await explore('?pageSize=500').expect(400);
      await explore('?minRating=9').expect(400);
      await explore('?skillId=nao-e-uuid').expect(400);
    });

    it('trata entradas maliciosas como texto comum (sem injeção)', async () => {
      await s.user('Ana', { teach: [['ingles']] });
      const res = await explore(`?q=${encodeURIComponent("'; DROP TABLE profiles; --")}`).expect(
        200,
      );
      expect(res.body.total).toBe(0);
      expect(await prisma.profile.count()).toBe(1);
    });
  });

  describe('com login: match', () => {
    it('troca mútua é "match excelente" e aparece primeiro', async () => {
      // Cenário do enunciado: Clayton ensina Java e quer inglês; Ana ensina inglês e quer Java.
      const clayton = await s.user('Clayton', { teach: [['java']], learn: ['ingles'] });
      await s.user('Ana', { teach: [['ingles']], learn: ['java'] });
      await s.user('Marina', { teach: [['ingles']], learn: ['excel'] }); // ensina o que ele quer, sem reciprocidade
      await s.user('Rafael', { teach: [['excel']], learn: ['java'] }); // não ensina o que ele quer

      const res = await explore('?pageSize=10', clayton).expect(200);
      const cards = res.body.items as {
        displayName: string;
        match: { score: number; label: string | null; mutual: boolean; headline: string | null };
      }[];
      expect(cards.map((c) => c.displayName).slice(0, 2)).toEqual(['Ana', 'Marina']);

      const ana = cards[0]!;
      expect(ana.match).toMatchObject({
        label: 'EXCELLENT',
        mutual: true,
        headline: 'Vocês podem aprender um com o outro.',
      });
      expect(ana.match.score).toBeGreaterThanOrEqual(80);

      const marina = cards[1]!;
      expect(marina.match.mutual).toBe(false); // troca direta NÃO é obrigatória
      expect(marina.match.label).toBe('GOOD');
      expect(marina.match.score).toBeLessThan(ana.match.score);
    });

    it('não mostra a própria pessoa nos resultados', async () => {
      const ana = await s.user('Ana', { teach: [['ingles']] });
      const res = await explore('', ana).expect(200);
      expect(res.body.total).toBe(0);
    });

    it('token inválido em rota opcional dá 401 (não vira anônimo em silêncio)', async () => {
      await s.http().get('/api/v1/explore').set({ Authorization: 'Bearer lixo' }).expect(401);
    });
  });

  describe('GET /matches', () => {
    it('exige login', async () => {
      await s.http().get('/api/v1/matches').expect(401);
    });

    it('recomenda quem ensina o que eu quero, uma vez por pessoa e por compatibilidade', async () => {
      const clayton = await s.user('Clayton', { teach: [['java']], learn: ['ingles', 'excel'] });
      await s.user('Ana', { teach: [['ingles'], ['excel']], learn: ['java'] });
      await s.user('Marina', { teach: [['excel']] });
      await s.user('Rafael', { teach: [['java']] }); // não ensina nada do que Clayton quer

      const res = await s.http().get('/api/v1/matches').set(clayton.auth).expect(200);
      const names = res.body.map((c: { displayName: string }) => c.displayName);
      expect(names).toEqual(['Ana', 'Marina']);
      expect(new Set(names).size).toBe(names.length);
      expect(res.body[0].match.label).toBe('EXCELLENT');
    });

    it('sem nada para aprender, não há recomendações', async () => {
      const ana = await s.user('Ana', { teach: [['ingles']] });
      const res = await s.http().get('/api/v1/matches').set(ana.auth).expect(200);
      expect(res.body).toEqual([]);
    });
  });
});
