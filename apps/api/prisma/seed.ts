/**
 * Dados FICTÍCIOS de demonstração (Ana, Lucas, Marina, Rafael + um admin).
 *
 *   pnpm db:seed            cria o catálogo e, se ainda não existirem, os perfis de demonstração
 *   pnpm db:seed -- --reset apaga TODOS os dados (inclusive o ledger) e recria tudo
 *
 * Para esses perfis conseguirem LOGAR, o seed cria as contas no Supabase Auth quando
 * SEED_DEMO_PASSWORD está definida (usa a service role key; rode só na sua máquina).
 * Sem isso, os perfis existem só no banco (úteis para ver Explorar, match e histórico).
 */
import path from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client';
import { LedgerService } from '../src/credits/ledger.service';
import { CATALOG, seedCatalog } from './catalog';

const nodeEnv = process.env.NODE_ENV ?? 'development';
loadEnv({ path: path.resolve(__dirname, `../.env.${nodeEnv}`), quiet: true });
loadEnv({ path: path.resolve(__dirname, '../.env'), quiet: true });

const DEMO_NOTE = ' (perfil de demonstração)';

interface DemoUser {
  key: string;
  email: string;
  name: string;
  bio: string;
  city: string;
  state: string;
  mode: 'ONLINE' | 'IN_PERSON' | 'BOTH';
  role?: 'USER' | 'ADMIN';
  teach: { slug: string; level: 'BASIC' | 'INTERMEDIATE' | 'ADVANCED'; description: string }[];
  learn: string[];
  availability: { weekday: number; start: number; end: number }[];
}

const USERS: DemoUser[] = [
  {
    key: 'ana',
    email: 'ana@demo.know-know.app',
    name: 'Ana Ribeiro',
    bio: 'Professora de inglês há 8 anos. Gosto de aulas leves, com conversação de verdade.',
    city: 'São Paulo',
    state: 'SP',
    mode: 'ONLINE',
    teach: [
      {
        slug: 'ingles',
        level: 'ADVANCED',
        description: 'Conversação, preparação para entrevistas e inglês para o trabalho.',
      },
    ],
    learn: ['java'],
    availability: [
      { weekday: 1, start: 19 * 60, end: 22 * 60 },
      { weekday: 3, start: 18 * 60, end: 21 * 60 },
      { weekday: 6, start: 9 * 60, end: 12 * 60 },
    ],
  },
  {
    key: 'lucas',
    email: 'lucas@demo.know-know.app',
    name: 'Lucas Ferreira',
    bio: 'Analista financeiro apaixonado por planilhas. Quero melhorar meu inglês para viajar.',
    city: 'Curitiba',
    state: 'PR',
    mode: 'BOTH',
    teach: [
      {
        slug: 'excel',
        level: 'ADVANCED',
        description: 'Fórmulas, tabelas dinâmicas e dashboards do zero.',
      },
    ],
    learn: ['ingles'],
    availability: [
      { weekday: 2, start: 19 * 60, end: 22 * 60 },
      { weekday: 4, start: 19 * 60, end: 22 * 60 },
      { weekday: 0, start: 14 * 60, end: 18 * 60 },
    ],
  },
  {
    key: 'marina',
    email: 'marina@demo.know-know.app',
    name: 'Marina Duarte',
    bio: 'Designer gráfica. Ensino design e Photoshop com projetos práticos.',
    city: 'Belo Horizonte',
    state: 'MG',
    mode: 'ONLINE',
    teach: [
      {
        slug: 'design',
        level: 'ADVANCED',
        description: 'Identidade visual, tipografia e portfólio.',
      },
      {
        slug: 'photoshop',
        level: 'INTERMEDIATE',
        description: 'Retoque, montagem e artes para redes sociais.',
      },
    ],
    learn: ['excel'],
    availability: [
      { weekday: 1, start: 20 * 60, end: 22 * 60 },
      { weekday: 3, start: 20 * 60, end: 22 * 60 },
      { weekday: 6, start: 10 * 60, end: 13 * 60 },
    ],
  },
  {
    key: 'rafael',
    email: 'rafael@demo.know-know.app',
    name: 'Rafael Moreira',
    bio: 'Desenvolvedor back-end. Ensino Java e Git de um jeito direto. Quero aprender design.',
    city: 'Porto Alegre',
    state: 'RS',
    mode: 'ONLINE',
    teach: [
      {
        slug: 'java',
        level: 'ADVANCED',
        description: 'Orientação a objetos, Spring Boot e boas práticas.',
      },
      {
        slug: 'git',
        level: 'INTERMEDIATE',
        description: 'Fluxo de trabalho em equipe, branches e pull requests.',
      },
    ],
    learn: ['design'],
    availability: [
      { weekday: 2, start: 18 * 60, end: 22 * 60 },
      { weekday: 4, start: 18 * 60, end: 22 * 60 },
      { weekday: 6, start: 8 * 60, end: 12 * 60 },
    ],
  },
  {
    key: 'admin',
    email: 'admin@demo.know-know.app',
    name: 'Equipe KNOW-KNOW',
    bio: 'Conta de administração da demonstração.',
    city: 'São Paulo',
    state: 'SP',
    mode: 'ONLINE',
    role: 'ADMIN',
    teach: [{ slug: 'oratoria', level: 'INTERMEDIATE', description: 'Falar bem em público.' }],
    learn: [],
    availability: [],
  },
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Cria (ou reaproveita) a conta no Supabase Auth e devolve o id. Null se não houver como criar. */
async function ensureAuthUser(email: string, name: string): Promise<string | null> {
  const password = process.env.SEED_DEMO_PASSWORD;
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!password || !base || !key) return null;

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
  const created = await fetch(`${base}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, accepted_terms_at: new Date().toISOString() },
    }),
  });
  if (created.ok) return ((await created.json()) as { id: string }).id;

  // Já existe: procura pelo e-mail.
  const list = await fetch(`${base}/auth/v1/admin/users?per_page=200`, { headers });
  if (list.ok) {
    const body = (await list.json()) as { users?: { id: string; email?: string }[] };
    const found = body.users?.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
  }
  throw new Error(`Não foi possível criar/encontrar a conta ${email} no Supabase Auth.`);
}

function deterministicId(key: string): string {
  // UUID v4 fixo e legível por usuário de demonstração (só para o banco local).
  const hex = Buffer.from(key.padEnd(6, '0')).toString('hex').slice(0, 12).padEnd(12, '0');
  return `00000000-0000-4000-8000-${hex}`;
}

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Defina DATABASE_URL (ou DIRECT_URL) para rodar o seed.');
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PRODUCTION_SEED !== 'true') {
    throw new Error(
      'Seed bloqueado em produção. Defina ALLOW_PRODUCTION_SEED=true se for intencional.',
    );
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const ledger = new LedgerService();
  const welcomeBonus = Number(process.env.WELCOME_BONUS_CREDITS ?? 20);
  const creditsPerHour = Number(process.env.CREDITS_PER_HOUR ?? 10);
  const costFor = (minutes: number) => Math.ceil((creditsPerHour * minutes) / 60);

  try {
    if (process.argv.includes('--reset')) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE reports, notifications, review_scores, reviews, credit_transactions, wallets,
          sessions, availability_rules, user_learning_skills, user_teaching_skills, skills,
          skill_categories, profiles RESTART IDENTITY CASCADE`,
      );
      console.log('Banco limpo.');
    }

    await seedCatalog(prisma);
    console.log(`Catálogo: ${CATALOG.length} categorias.`);
    // Produção: só o catálogo (categorias e habilidades), sem os perfis fictícios.
    if (process.argv.includes('--catalog-only')) return;

    const skillBySlug = new Map(
      (await prisma.skill.findMany()).map((skill) => [skill.slug, skill]),
    );
    const ids = new Map<string, string>();
    let created = 0;

    for (const user of USERS) {
      const authId = await ensureAuthUser(user.email, user.name);
      const id = authId ?? deterministicId(user.key);
      ids.set(user.key, id);

      if (await prisma.profile.findUnique({ where: { id } })) continue;
      created++;

      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id,
            displayName: user.name,
            bio: `${user.bio}${DEMO_NOTE}`,
            city: user.city,
            state: user.state,
            preferredMode: user.mode,
            role: user.role ?? 'USER',
            timezone: 'America/Sao_Paulo',
            onboardingStep: 5,
            onboardingCompletedAt: new Date(),
            termsAcceptedAt: new Date(),
            wallet: { create: {} },
          },
        });
        if (welcomeBonus > 0) {
          await ledger.credit(tx, {
            userId: id,
            type: 'BONUS',
            amount: welcomeBonus,
            description: 'Créditos de boas-vindas',
          });
        }
        for (const item of user.teach) {
          const skill = skillBySlug.get(item.slug);
          if (!skill) throw new Error(`Habilidade inexistente no catálogo: ${item.slug}`);
          await tx.userTeachingSkill.create({
            data: {
              userId: id,
              skillId: skill.id,
              level: item.level,
              description: item.description,
            },
          });
        }
        for (const slug of user.learn) {
          const skill = skillBySlug.get(slug);
          if (!skill) throw new Error(`Habilidade inexistente no catálogo: ${slug}`);
          await tx.userLearningSkill.create({ data: { userId: id, skillId: skill.id } });
        }
        if (user.availability.length > 0) {
          await tx.availabilityRule.createMany({
            data: user.availability.map((rule) => ({
              userId: id,
              weekday: rule.weekday,
              startMinute: rule.start,
              endMinute: rule.end,
            })),
          });
        }
      });
    }

    if (created === 0) {
      console.log('Perfis de demonstração já existem. Use --reset para recriar do zero.');
      return;
    }

    const id = (key: string) => ids.get(key) as string;
    const skillId = (slug: string) => (skillBySlug.get(slug) as { id: string }).id;
    const now = Date.now();

    /** Aula concluída, com créditos liquidados e as duas avaliações. */
    const completedLesson = async (
      mentor: string,
      student: string,
      slug: string,
      daysAgo: number,
      minutes: number,
      ratings: { toMentor: number; toStudent: number; comment: string },
    ) => {
      const startsAt = new Date(now - daysAgo * DAY);
      const endsAt = new Date(startsAt.getTime() + minutes * 60_000);
      const cost = costFor(minutes);
      await prisma.$transaction(async (tx) => {
        await ledger.hold(tx, id(student), cost);
        const session = await tx.session.create({
          data: {
            mentorId: id(mentor),
            studentId: id(student),
            skillId: skillId(slug),
            status: 'COMPLETED',
            mode: 'ONLINE',
            meetingProvider: 'GOOGLE_MEET',
            meetingUrl: 'https://meet.google.com/demo-aula-concluida',
            startsAt,
            endsAt,
            durationMinutes: minutes,
            creditCost: cost,
            lastProposedById: id(student),
            studentConfirmation: 'YES',
            studentConfirmedAt: endsAt,
            mentorConfirmation: 'YES',
            mentorConfirmedAt: endsAt,
            settledAt: endsAt,
          },
        });
        await ledger.settle(tx, {
          sessionId: session.id,
          studentId: id(student),
          mentorId: id(mentor),
          amount: cost,
          skillName: (skillBySlug.get(slug) as { name: string }).name,
        });
        await tx.profile.update({
          where: { id: id(mentor) },
          data: { sessionsTaught: { increment: 1 } },
        });
        await tx.profile.update({
          where: { id: id(student) },
          data: { sessionsLearned: { increment: 1 } },
        });

        const toMentor = [
          ['DIDACTICS', ratings.toMentor],
          ['KNOWLEDGE', ratings.toMentor],
          ['PUNCTUALITY', 5],
        ] as const;
        await tx.review.create({
          data: {
            sessionId: session.id,
            authorId: id(student),
            targetId: id(mentor),
            direction: 'STUDENT_TO_MENTOR',
            rating: Math.round(toMentor.reduce((sum, [, score]) => sum + score, 0) / 3),
            comment: ratings.comment,
            scores: { create: toMentor.map(([category, score]) => ({ category, score })) },
          },
        });
        await tx.profile.update({
          where: { id: id(mentor) },
          data: {
            mentorRatingSum: {
              increment: Math.round(toMentor.reduce((sum, [, s]) => sum + s, 0) / 3),
            },
            mentorRatingCount: { increment: 1 },
          },
        });

        const toStudent = [
          ['PARTICIPATION', ratings.toStudent],
          ['PUNCTUALITY', 5],
          ['RESPECT', 5],
        ] as const;
        const studentRating = Math.round(toStudent.reduce((sum, [, score]) => sum + score, 0) / 3);
        await tx.review.create({
          data: {
            sessionId: session.id,
            authorId: id(mentor),
            targetId: id(student),
            direction: 'MENTOR_TO_STUDENT',
            rating: studentRating,
            scores: { create: toStudent.map(([category, score]) => ({ category, score })) },
          },
        });
        await tx.profile.update({
          where: { id: id(student) },
          data: {
            studentRatingSum: { increment: studentRating },
            studentRatingCount: { increment: 1 },
          },
        });
      });
    };

    // Histórico: Lucas aprendeu inglês com Ana; Ana aprendeu Java com Rafael.
    await completedLesson('ana', 'lucas', 'ingles', 9, 60, {
      toMentor: 5,
      toStudent: 5,
      comment: 'A Ana tem uma didática incrível. Perdi o medo de falar inglês!',
    });
    await completedLesson('rafael', 'ana', 'java', 6, 60, {
      toMentor: 5,
      toStudent: 4,
      comment: 'Explicou orientação a objetos com exemplos muito claros.',
    });
    await completedLesson('lucas', 'marina', 'excel', 4, 30, {
      toMentor: 4,
      toStudent: 5,
      comment: 'Direto ao ponto, aprendi tabela dinâmica em meia hora.',
    });

    /** Solicitação em aberto ou aula confirmada, com reserva de créditos. */
    const openLesson = async (
      mentor: string,
      student: string,
      slug: string,
      status: 'PENDING' | 'ACCEPTED',
      startsInDays: number,
      hourUtc: number,
    ) => {
      const startsAt = new Date(now + startsInDays * DAY);
      startsAt.setUTCHours(hourUtc, 0, 0, 0);
      const endsAt = new Date(startsAt.getTime() + HOUR);
      const cost = costFor(60);
      await prisma.$transaction(async (tx) => {
        await ledger.hold(tx, id(student), cost);
        const session = await tx.session.create({
          data: {
            mentorId: id(mentor),
            studentId: id(student),
            skillId: skillId(slug),
            status,
            mode: 'ONLINE',
            meetingProvider: 'GOOGLE_MEET',
            meetingUrl: status === 'ACCEPTED' ? 'https://meet.google.com/demo-aula-agendada' : null,
            note: 'Oi! Quero aprender do zero, pode ser?',
            startsAt,
            endsAt,
            durationMinutes: 60,
            creditCost: cost,
            lastProposedById: id(student),
          },
        });
        await tx.notification.create({
          data: {
            userId: id(status === 'PENDING' ? mentor : student),
            type: status === 'PENDING' ? 'SESSION_REQUESTED' : 'SESSION_ACCEPTED',
            sessionId: session.id,
            actorId: id(status === 'PENDING' ? student : mentor),
          },
        });
      });
    };

    await openLesson('rafael', 'ana', 'java', 'ACCEPTED', 2, 22); // Ana aprende Java (19h em SP)
    await openLesson('ana', 'lucas', 'ingles', 'ACCEPTED', 3, 22); // Lucas aprende inglês
    await openLesson('lucas', 'marina', 'excel', 'PENDING', 3, 23); // pedido aguardando o Lucas
    await openLesson('marina', 'rafael', 'design', 'PENDING', 4, 23); // pedido aguardando a Marina

    console.log(`Perfis de demonstração criados: ${created}.`);
    console.log(
      process.env.SEED_DEMO_PASSWORD
        ? `Login: e-mails @demo.know-know.app (ex.: ana@demo.know-know.app) com a senha definida em SEED_DEMO_PASSWORD.`
        : 'Sem SEED_DEMO_PASSWORD: perfis criados só no banco (não é possível logar com eles).',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
