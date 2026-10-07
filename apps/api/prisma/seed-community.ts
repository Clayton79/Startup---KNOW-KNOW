/**
 * "Comunidade" FICTÍCIA: 10 pessoas com conhecimentos, horários, aulas em todos os estados,
 * créditos (via ledger de verdade), avaliações, notificações e denúncias. Serve para o site
 * parecer vivo e para testar todos os fluxos.
 *
 *   tsx prisma/seed-community.ts                      cria (se ainda não existir)
 *   tsx prisma/seed-community.ts --remove             apaga SÓ esses perfis e o que é deles
 *   tsx prisma/seed-community.ts --confirm-production  obrigatório quando o banco é do Supabase
 *
 * Lê DIRECT_URL (ou DATABASE_URL) do ambiente, sem ler arquivos .env, para nunca cair por engano
 * no banco de desenvolvimento. Os perfis NÃO têm conta de login: existem só no banco.
 * Todos têm "(perfil de demonstração)" na bio.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../src/generated/prisma/client';
import { LedgerService } from '../src/credits/ledger.service';
import { seedCatalog } from './catalog';

type Level = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';
type Mode = 'ONLINE' | 'IN_PERSON' | 'BOTH';
type Tx = Prisma.TransactionClient;

const DEMO_NOTE = ' (perfil de demonstração)';
const CREDITS_PER_HOUR = Number(process.env.CREDITS_PER_HOUR ?? 10);
const WELCOME_BONUS = Number(process.env.WELCOME_BONUS_CREDITS ?? 20);
const costFor = (minutes: number) => Math.ceil((CREDITS_PER_HOUR * minutes) / 60);

interface Person {
  key: string;
  name: string;
  city: string;
  state: string;
  mode: Mode;
  bio: string;
  teach: { slug: string; level: Level; description: string }[];
  learn: string[];
  /** weekday: 0 = domingo … 6 = sábado; horários em minutos, no fuso de São Paulo. */
  availability: [weekday: number, startHour: number, endHour: number][];
}

const PEOPLE: Person[] = [
  {
    key: 'beatriz',
    name: 'Beatriz Almeida',
    city: 'Recife',
    state: 'PE',
    mode: 'ONLINE',
    bio: 'Engenheira de dados. Gosto de explicar programação com exemplos do dia a dia. Quero aprender violão e melhorar meu inglês.',
    teach: [
      {
        slug: 'python',
        level: 'ADVANCED',
        description: 'Do zero à automação de planilhas e análise de dados com pandas.',
      },
      {
        slug: 'sql',
        level: 'INTERMEDIATE',
        description: 'Consultas, joins e modelagem de banco de dados sem complicação.',
      },
    ],
    learn: ['violao', 'ingles'],
    availability: [
      [1, 19, 22],
      [3, 19, 22],
      [6, 9, 12],
    ],
  },
  {
    key: 'thiago',
    name: 'Thiago Nogueira',
    city: 'Fortaleza',
    state: 'CE',
    mode: 'BOTH',
    bio: 'Músico e professor de violão há 10 anos. Estou começando em programação e quero aprender Python.',
    teach: [
      {
        slug: 'violao',
        level: 'ADVANCED',
        description: 'Do primeiro acorde ao repertório: MPB, pop e fingerstyle.',
      },
      {
        slug: 'canto',
        level: 'INTERMEDIATE',
        description: 'Respiração, afinação e confiança para cantar em público.',
      },
    ],
    learn: ['python'],
    availability: [
      [2, 18, 22],
      [4, 18, 22],
      [0, 14, 18],
    ],
  },
  {
    key: 'camila',
    name: 'Camila Rocha',
    city: 'Belo Horizonte',
    state: 'MG',
    mode: 'ONLINE',
    bio: 'Professora de espanhol e revisora de textos. Quero dominar Excel e organizar melhor minhas finanças.',
    teach: [
      {
        slug: 'espanhol',
        level: 'ADVANCED',
        description: 'Conversação para viagens e trabalho, com foco em ouvir e falar.',
      },
      {
        slug: 'redacao',
        level: 'ADVANCED',
        description: 'Estrutura, argumentação e correção de textos (ENEM e concursos).',
      },
    ],
    learn: ['excel', 'financas-pessoais'],
    availability: [
      [1, 18, 21],
      [5, 18, 21],
      [6, 10, 13],
    ],
  },
  {
    key: 'diego',
    name: 'Diego Martins',
    city: 'São Paulo',
    state: 'SP',
    mode: 'BOTH',
    bio: 'Consultor financeiro. Ajudo pessoas a sair do vermelho. Quero aprender espanhol e perder o medo de falar em público.',
    teach: [
      {
        slug: 'financas-pessoais',
        level: 'ADVANCED',
        description: 'Orçamento, reserva de emergência e primeiros investimentos.',
      },
      {
        slug: 'excel',
        level: 'INTERMEDIATE',
        description: 'Planilhas de controle financeiro e fórmulas essenciais.',
      },
    ],
    learn: ['espanhol', 'oratoria'],
    availability: [
      [2, 19, 22],
      [4, 19, 22],
      [6, 9, 12],
    ],
  },
  {
    key: 'fernanda',
    name: 'Fernanda Lima',
    city: 'Curitiba',
    state: 'PR',
    mode: 'ONLINE',
    bio: 'Designer e editora de vídeo freelancer. Quero aprender francês e entrar no mundo do React.',
    teach: [
      {
        slug: 'photoshop',
        level: 'ADVANCED',
        description: 'Retoque, montagem e artes para redes sociais.',
      },
      {
        slug: 'edicao-de-video',
        level: 'INTERMEDIATE',
        description: 'Cortes, ritmo e legendas para vídeos curtos.',
      },
      {
        slug: 'desenho',
        level: 'BASIC',
        description: 'Fundamentos de desenho: formas, luz e sombra.',
      },
    ],
    learn: ['frances', 'react'],
    availability: [
      [1, 20, 22],
      [3, 20, 22],
      [0, 15, 19],
    ],
  },
  {
    key: 'gustavo',
    name: 'Gustavo Pereira',
    city: 'Salvador',
    state: 'BA',
    mode: 'ONLINE',
    bio: 'Desenvolvedor front-end. Adoro ensinar React e JavaScript. Quero aprender Photoshop e conversar melhor em inglês.',
    teach: [
      {
        slug: 'react',
        level: 'ADVANCED',
        description: 'Componentes, hooks e como organizar um projeto de verdade.',
      },
      {
        slug: 'javascript',
        level: 'ADVANCED',
        description: 'Fundamentos da linguagem e lógica de programação.',
      },
      {
        slug: 'git',
        level: 'INTERMEDIATE',
        description: 'Branches, commits e pull requests no trabalho em equipe.',
      },
    ],
    learn: ['photoshop', 'ingles'],
    availability: [
      [2, 19, 23],
      [5, 19, 23],
      [6, 14, 18],
    ],
  },
  {
    key: 'helena',
    name: 'Helena Costa',
    city: 'Porto Alegre',
    state: 'RS',
    mode: 'BOTH',
    bio: 'Tradutora e professora de idiomas. Quero aprender piano e falar melhor em público.',
    teach: [
      {
        slug: 'frances',
        level: 'ADVANCED',
        description: 'Do básico à conversação, com música e cinema francês.',
      },
      {
        slug: 'alemao',
        level: 'INTERMEDIATE',
        description: 'Gramática sem trauma e vocabulário para o dia a dia.',
      },
    ],
    learn: ['piano', 'oratoria'],
    availability: [
      [3, 18, 21],
      [4, 18, 21],
      [0, 10, 14],
    ],
  },
  {
    key: 'igor',
    name: 'Igor Santos',
    city: 'Rio de Janeiro',
    state: 'RJ',
    mode: 'ONLINE',
    bio: 'Professor de matemática e física. Estou aprendendo a programar e a editar vídeos para criar aulas melhores.',
    teach: [
      {
        slug: 'matematica',
        level: 'ADVANCED',
        description: 'Da base ao pré-cálculo, com paciência e muitos exemplos.',
      },
      {
        slug: 'fisica',
        level: 'INTERMEDIATE',
        description: 'Mecânica e eletricidade explicadas com situações reais.',
      },
    ],
    learn: ['javascript', 'edicao-de-video'],
    availability: [
      [1, 19, 22],
      [3, 19, 22],
      [6, 15, 19],
    ],
  },
  {
    key: 'juliana',
    name: 'Juliana Barros',
    city: 'Brasília',
    state: 'DF',
    mode: 'BOTH',
    bio: 'Coach de comunicação. Quero reforçar minha matemática e aprender culinária de verdade.',
    teach: [
      {
        slug: 'oratoria',
        level: 'ADVANCED',
        description: 'Apresentações, entrevistas e como controlar o nervosismo.',
      },
      {
        slug: 'ingles',
        level: 'INTERMEDIATE',
        description: 'Inglês para reuniões e apresentações profissionais.',
      },
    ],
    learn: ['matematica', 'culinaria'],
    availability: [
      [2, 18, 21],
      [4, 18, 21],
      [6, 9, 12],
    ],
  },
  {
    key: 'leonardo',
    name: 'Leonardo Teixeira',
    city: 'Goiânia',
    state: 'GO',
    mode: 'BOTH',
    bio: 'Chef e pianista amador. Quero aprender SQL para organizar o estoque do meu restaurante e estudar alemão.',
    teach: [
      {
        slug: 'culinaria',
        level: 'ADVANCED',
        description: 'Técnicas de cozinha, temperos e como montar um cardápio.',
      },
      {
        slug: 'piano',
        level: 'INTERMEDIATE',
        description: 'Leitura de partitura e primeiras músicas, mesmo sem teclado caro.',
      },
    ],
    learn: ['sql', 'alemao'],
    availability: [
      [1, 18, 22],
      [5, 18, 22],
      [0, 9, 13],
    ],
  },
];

// ───────────── Datas (fuso de São Paulo, UTC-3, sem horário de verão) ─────────────

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const LOCAL_OFFSET_MS = -3 * HOUR;

function localParts(date: Date) {
  const local = new Date(date.getTime() + LOCAL_OFFSET_MS);
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), d: local.getUTCDate() };
}

/** Instante UTC de "hoje + dayOffset dias, às `startMinute` minutos do horário de São Paulo". */
function atLocal(dayOffset: number, startMinute: number): Date {
  const { y, m, d } = localParts(new Date());
  return new Date(Date.UTC(y, m, d + dayOffset, 0, startMinute) - LOCAL_OFFSET_MS);
}

function weekdayAt(dayOffset: number): number {
  const { y, m, d } = localParts(new Date());
  return new Date(Date.UTC(y, m, d + dayOffset)).getUTCDay();
}

/** Próxima ocorrência (a partir de amanhã) do dia da semana, `extraWeeks` semanas depois. */
function futureAt(weekday: number, startHour: number, extraWeeks = 0, startMinute = 0): Date {
  for (let offset = 1; offset <= 7; offset++) {
    if (weekdayAt(offset) === weekday) {
      return new Date(
        atLocal(offset, startHour * 60 + startMinute).getTime() + extraWeeks * 7 * DAY,
      );
    }
  }
  throw new Error('dia da semana inválido');
}

/** Ocorrência mais recente (até ontem) do dia da semana, `weeksBack` semanas antes. */
function pastAt(weekday: number, startHour: number, weeksBack = 0, startMinute = 0): Date {
  for (let offset = -1; offset >= -7; offset--) {
    if (weekdayAt(offset) === weekday) {
      return new Date(
        atLocal(offset, startHour * 60 + startMinute).getTime() - weeksBack * 7 * DAY,
      );
    }
  }
  throw new Error('dia da semana inválido');
}

function communityId(key: string): string {
  const hex = Buffer.from(key.padEnd(6, '0')).toString('hex').slice(0, 12).padEnd(12, '0');
  return `00000000-0000-4000-9000-${hex}`;
}

// ───────────── Execução ─────────────

async function main(): Promise<void> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Defina DIRECT_URL (ou DATABASE_URL) no ambiente.');
  const host = new URL(connectionString).host;
  const isRemote = /supabase|pooler/.test(host);
  if (isRemote && !process.argv.includes('--confirm-production')) {
    throw new Error(
      `O banco (${host}) é remoto. Rode de novo com --confirm-production se for intencional.`,
    );
  }
  console.log(`Banco: ${host}`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 3 }) });
  const ledger = new LedgerService();
  const ids = PEOPLE.map((person) => communityId(person.key));

  try {
    if (process.argv.includes('--remove')) {
      await removeCommunity(prisma, ids);
      return;
    }

    if (await prisma.profile.findUnique({ where: { id: communityId('beatriz') } })) {
      console.log('A comunidade de demonstração já existe. Use --remove para apagá-la e recriar.');
      return;
    }

    await seedCatalog(prisma);
    const skills = new Map((await prisma.skill.findMany()).map((skill) => [skill.slug, skill]));
    const skillOf = (slug: string) => {
      const skill = skills.get(slug);
      if (!skill) throw new Error(`Habilidade inexistente no catálogo: ${slug}`);
      return skill;
    };
    const idOf = (key: string) => communityId(key);

    // 1) Pessoas, carteira com bônus, conhecimentos e horários
    for (const person of PEOPLE) {
      const id = idOf(person.key);
      await prisma.$transaction(async (tx) => {
        await tx.profile.create({
          data: {
            id,
            displayName: person.name,
            bio: `${person.bio}${DEMO_NOTE}`,
            city: person.city,
            state: person.state,
            preferredMode: person.mode,
            timezone: 'America/Sao_Paulo',
            onboardingStep: 5,
            onboardingCompletedAt: new Date(Date.now() - 40 * DAY),
            termsAcceptedAt: new Date(Date.now() - 40 * DAY),
            createdAt: new Date(Date.now() - 40 * DAY),
            wallet: { create: {} },
          },
        });
        if (WELCOME_BONUS > 0) {
          await ledger.credit(tx, {
            userId: id,
            type: 'BONUS',
            amount: WELCOME_BONUS,
            description: 'Créditos de boas-vindas',
          });
        }
        for (const item of person.teach) {
          await tx.userTeachingSkill.create({
            data: {
              userId: id,
              skillId: skillOf(item.slug).id,
              level: item.level,
              description: item.description,
            },
          });
        }
        for (const slug of person.learn) {
          await tx.userLearningSkill.create({ data: { userId: id, skillId: skillOf(slug).id } });
        }
        await tx.availabilityRule.createMany({
          data: person.availability.map(([weekday, start, end]) => ({
            userId: id,
            weekday,
            startMinute: start * 60,
            endMinute: end * 60,
          })),
        });
      });
    }

    // 2) Aulas
    interface Base {
      mentor: string;
      student: string;
      slug: string;
      startsAt: Date;
      minutes?: number;
      mode?: 'ONLINE' | 'IN_PERSON';
      note?: string;
    }

    const common = (base: Base) => {
      const minutes = base.minutes ?? 60;
      const startsAt = base.startsAt;
      return {
        mentorId: idOf(base.mentor),
        studentId: idOf(base.student),
        skillId: skillOf(base.slug).id,
        mode: base.mode ?? ('ONLINE' as const),
        meetingProvider:
          (base.mode ?? 'ONLINE') === 'IN_PERSON'
            ? ('IN_PERSON' as const)
            : ('GOOGLE_MEET' as const),
        note: base.note ?? null,
        startsAt,
        endsAt: new Date(startsAt.getTime() + minutes * 60_000),
        durationMinutes: minutes,
        creditCost: costFor(minutes),
        createdAt: new Date(startsAt.getTime() - 3 * DAY),
      };
    };

    const notify = (
      tx: Tx,
      userId: string,
      type: Prisma.NotificationCreateManyInput['type'],
      sessionId: string,
      actor: string | null,
      options: { amount?: number; read?: boolean; at?: Date } = {},
    ) =>
      tx.notification.create({
        data: {
          userId: idOf(userId),
          type,
          sessionId,
          actorId: actor ? idOf(actor) : null,
          amount: options.amount ?? null,
          readAt: options.read ? new Date() : null,
          createdAt: options.at ?? new Date(),
        },
      });

    type Scores = [number, number, number];

    /** Aula concluída: créditos liquidados e as duas avaliações. */
    const completed = async (
      base: Base,
      toMentor: { scores: Scores; comment: string },
      toStudent: { scores: Scores; comment?: string },
    ) =>
      prisma.$transaction(async (tx) => {
        const data = common(base);
        await ledger.hold(tx, data.studentId, data.creditCost);
        const session = await tx.session.create({
          data: {
            ...data,
            status: 'COMPLETED',
            meetingUrl: 'https://meet.google.com/aula-demonstracao',
            lastProposedById: data.studentId,
            studentConfirmation: 'YES',
            studentConfirmedAt: data.endsAt,
            mentorConfirmation: 'YES',
            mentorConfirmedAt: data.endsAt,
            settledAt: data.endsAt,
          },
        });
        await ledger.settle(tx, {
          sessionId: session.id,
          studentId: data.studentId,
          mentorId: data.mentorId,
          amount: data.creditCost,
          skillName: skillOf(base.slug).name,
        });
        await tx.profile.update({
          where: { id: data.mentorId },
          data: { sessionsTaught: { increment: 1 } },
        });
        await tx.profile.update({
          where: { id: data.studentId },
          data: { sessionsLearned: { increment: 1 } },
        });

        const mean = (scores: Scores) =>
          Math.min(5, Math.max(1, Math.round(scores.reduce((a, b) => a + b, 0) / 3)));
        const mentorCategories = ['DIDACTICS', 'KNOWLEDGE', 'PUNCTUALITY'] as const;
        const studentCategories = ['PARTICIPATION', 'PUNCTUALITY', 'RESPECT'] as const;
        const reviewedAt = new Date(data.endsAt.getTime() + 2 * HOUR);

        await tx.review.create({
          data: {
            sessionId: session.id,
            authorId: data.studentId,
            targetId: data.mentorId,
            direction: 'STUDENT_TO_MENTOR',
            rating: mean(toMentor.scores),
            comment: toMentor.comment,
            createdAt: reviewedAt,
            scores: {
              create: mentorCategories.map((category, i) => ({
                category,
                score: toMentor.scores[i] as number,
              })),
            },
          },
        });
        await tx.profile.update({
          where: { id: data.mentorId },
          data: {
            mentorRatingSum: { increment: mean(toMentor.scores) },
            mentorRatingCount: { increment: 1 },
          },
        });
        await tx.review.create({
          data: {
            sessionId: session.id,
            authorId: data.mentorId,
            targetId: data.studentId,
            direction: 'MENTOR_TO_STUDENT',
            rating: mean(toStudent.scores),
            comment: toStudent.comment ?? null,
            createdAt: reviewedAt,
            scores: {
              create: studentCategories.map((category, i) => ({
                category,
                score: toStudent.scores[i] as number,
              })),
            },
          },
        });
        await tx.profile.update({
          where: { id: data.studentId },
          data: {
            studentRatingSum: { increment: mean(toStudent.scores) },
            studentRatingCount: { increment: 1 },
          },
        });

        await notify(tx, base.mentor, 'SESSION_COMPLETED', session.id, base.student, {
          read: true,
          at: reviewedAt,
        });
        await notify(tx, base.student, 'SESSION_COMPLETED', session.id, base.mentor, {
          read: true,
          at: reviewedAt,
        });
        await notify(tx, base.mentor, 'CREDITS_RECEIVED', session.id, base.student, {
          amount: data.creditCost,
          read: true,
          at: reviewedAt,
        });
        await notify(tx, base.mentor, 'REVIEW_RECEIVED', session.id, base.student, {
          read: true,
          at: reviewedAt,
        });
        await notify(tx, base.student, 'REVIEW_RECEIVED', session.id, base.mentor, {
          read: true,
          at: reviewedAt,
        });
        return session.id;
      });

    /** Pedido pendente ou aula confirmada, com os créditos reservados. */
    const open = async (
      base: Base,
      status: 'PENDING' | 'ACCEPTED',
      proposedBy: 'student' | 'mentor' = 'student',
    ) =>
      prisma.$transaction(async (tx) => {
        const data = common(base);
        await ledger.hold(tx, data.studentId, data.creditCost);
        const session = await tx.session.create({
          data: {
            ...data,
            status,
            meetingUrl:
              status === 'ACCEPTED' && data.mode === 'ONLINE'
                ? 'https://meet.google.com/aula-demonstracao'
                : null,
            lastProposedById: proposedBy === 'mentor' ? data.mentorId : data.studentId,
            createdAt: new Date(Date.now() - 6 * HOUR),
          },
        });
        if (status === 'PENDING') {
          // Pedido normal: avisa o mentor. Contraproposta do mentor: avisa o aluno.
          await notify(
            tx,
            proposedBy === 'mentor' ? base.student : base.mentor,
            proposedBy === 'mentor' ? 'SESSION_TIME_PROPOSED' : 'SESSION_REQUESTED',
            session.id,
            proposedBy === 'mentor' ? base.mentor : base.student,
          );
        } else {
          await notify(tx, base.student, 'SESSION_ACCEPTED', session.id, base.mentor);
        }
        return session.id;
      });

    /** Estados sem créditos presos: recusada, cancelada e "não aconteceu". */
    const closed = async (
      base: Base,
      status: 'REJECTED' | 'CANCELLED' | 'NO_SHOW',
      by?: 'mentor' | 'student',
    ) =>
      prisma.$transaction(async (tx) => {
        const data = common(base);
        const session = await tx.session.create({
          data: {
            ...data,
            status,
            lastProposedById: data.studentId,
            cancelledById:
              by === 'mentor' ? data.mentorId : by === 'student' ? data.studentId : null,
            ...(status === 'NO_SHOW'
              ? {
                  studentConfirmation: 'NO',
                  studentConfirmedAt: data.endsAt,
                  mentorConfirmation: 'NO',
                  mentorConfirmedAt: data.endsAt,
                }
              : {}),
          },
        });
        if (status === 'REJECTED')
          await notify(tx, base.student, 'SESSION_REJECTED', session.id, base.mentor, {
            read: true,
          });
        if (status === 'CANCELLED')
          await notify(
            tx,
            by === 'student' ? base.mentor : base.student,
            'SESSION_CANCELLED',
            session.id,
            by === 'student' ? base.student : base.mentor,
            { read: true },
          );
        return session.id;
      });

    // Concluídas (da mais antiga para a mais recente, para o saldo nunca faltar)
    await completed(
      { mentor: 'thiago', student: 'beatriz', slug: 'violao', startsAt: pastAt(2, 19, 4) },
      {
        scores: [5, 5, 5],
        comment: 'O Thiago tem uma paciência enorme. Em uma aula já toquei meus primeiros acordes!',
      },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'beatriz', student: 'thiago', slug: 'python', startsAt: pastAt(1, 19, 3) },
      {
        scores: [5, 5, 4],
        comment: 'Explicou variáveis e laços com exemplos de música. Muito didática.',
      },
      { scores: [5, 4, 5], comment: 'Aluno dedicado, fez toda a tarefa.' },
    );
    await completed(
      { mentor: 'camila', student: 'diego', slug: 'espanhol', startsAt: pastAt(5, 18, 3) },
      {
        scores: [5, 5, 5],
        comment: 'Conversamos 1 hora em espanhol e saí falando bem mais solto.',
      },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'diego', student: 'camila', slug: 'financas-pessoais', startsAt: pastAt(4, 19, 2) },
      { scores: [4, 5, 5], comment: 'Montamos meu orçamento do zero. Super prático.' },
      { scores: [5, 5, 5], comment: 'Chegou com tudo organizado.' },
    );
    await completed(
      { mentor: 'gustavo', student: 'fernanda', slug: 'react', startsAt: pastAt(5, 19, 2) },
      {
        scores: [5, 5, 5],
        comment: 'Explicação clara de hooks. Já criei meu primeiro componente.',
      },
      { scores: [5, 4, 5] },
    );
    await completed(
      { mentor: 'fernanda', student: 'gustavo', slug: 'photoshop', startsAt: pastAt(3, 20, 1) },
      {
        scores: [5, 5, 5],
        comment: 'A Fernanda é incrível! Aprendi máscaras de camada em minutos.',
      },
      { scores: [5, 5, 5] },
    );
    await completed(
      {
        mentor: 'juliana',
        student: 'gustavo',
        slug: 'ingles',
        startsAt: pastAt(2, 18, 1),
        minutes: 30,
      },
      { scores: [4, 4, 5], comment: 'Boa aula para treinar apresentação em inglês.' },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'igor', student: 'juliana', slug: 'matematica', startsAt: pastAt(1, 19, 1) },
      { scores: [5, 5, 5], comment: 'Revisei funções com muito mais segurança.' },
      { scores: [5, 5, 5] },
    );
    await completed(
      {
        mentor: 'helena',
        student: 'fernanda',
        slug: 'frances',
        startsAt: pastAt(3, 18, 1),
        minutes: 90,
      },
      { scores: [5, 5, 5], comment: 'Aula de 90 minutos que passou voando. Adorei a pronúncia!' },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'leonardo', student: 'helena', slug: 'piano', startsAt: pastAt(1, 18, 1) },
      { scores: [4, 4, 4], comment: 'Bom professor, ensinou a ler partitura de um jeito leve.' },
      { scores: [4, 4, 5] },
    );
    await completed(
      { mentor: 'beatriz', student: 'leonardo', slug: 'sql', startsAt: pastAt(3, 19, 0) },
      { scores: [5, 5, 5], comment: 'Já estou usando SELECT e JOIN no estoque do restaurante!' },
      { scores: [5, 5, 5], comment: 'Muito interessado e fez ótimas perguntas.' },
    );
    await completed(
      { mentor: 'juliana', student: 'diego', slug: 'oratoria', startsAt: pastAt(4, 18, 0) },
      { scores: [4, 4, 2], comment: 'Conteúdo bom, mas a aula começou 15 minutos atrasada.' },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'gustavo', student: 'igor', slug: 'javascript', startsAt: pastAt(2, 19, 0) },
      { scores: [5, 5, 5], comment: 'Do zero a uma função útil em uma hora. Recomendo!' },
      { scores: [5, 5, 5] },
    );
    await completed(
      { mentor: 'fernanda', student: 'igor', slug: 'edicao-de-video', startsAt: pastAt(1, 20, 0) },
      { scores: [4, 4, 5], comment: 'Aprendi a cortar e sincronizar áudio. Útil demais.' },
      { scores: [5, 5, 5] },
    );

    // Não aconteceu, recusada e cancelada
    const noShow = await closed(
      { mentor: 'camila', student: 'leonardo', slug: 'redacao', startsAt: pastAt(6, 10, 0) },
      'NO_SHOW',
    );
    await closed(
      { mentor: 'leonardo', student: 'juliana', slug: 'culinaria', startsAt: futureAt(5, 19, 1) },
      'REJECTED',
      'mentor',
    );
    await closed(
      { mentor: 'camila', student: 'diego', slug: 'espanhol', startsAt: futureAt(6, 11, 1) },
      'CANCELLED',
      'student',
    );

    // Aguardando confirmação e em revisão
    await prisma.$transaction(async (tx) => {
      const data = common({
        mentor: 'juliana',
        student: 'beatriz',
        slug: 'ingles',
        startsAt: pastAt(6, 9, 0),
      });
      await ledger.hold(tx, data.studentId, data.creditCost);
      const session = await tx.session.create({
        data: {
          ...data,
          status: 'AWAITING_CONFIRMATION',
          meetingUrl: 'https://meet.google.com/aula-demonstracao',
          lastProposedById: data.studentId,
          studentConfirmation: 'YES',
          studentConfirmedAt: new Date(data.endsAt.getTime() + 20 * 60_000),
        },
      });
      await notify(tx, 'juliana', 'SESSION_COMPLETED', session.id, 'beatriz');
    });
    await prisma.$transaction(async (tx) => {
      const data = common({
        mentor: 'leonardo',
        student: 'juliana',
        slug: 'culinaria',
        startsAt: pastAt(5, 18, 0),
      });
      await ledger.hold(tx, data.studentId, data.creditCost);
      const session = await tx.session.create({
        data: {
          ...data,
          status: 'DISPUTED',
          meetingUrl: 'https://meet.google.com/aula-demonstracao',
          lastProposedById: data.studentId,
          studentConfirmation: 'NO',
          studentConfirmedAt: data.endsAt,
          mentorConfirmation: 'YES',
          mentorConfirmedAt: data.endsAt,
        },
      });
      await notify(tx, 'leonardo', 'SESSION_DISPUTED', session.id, 'juliana');
      await notify(tx, 'juliana', 'SESSION_DISPUTED', session.id, 'leonardo');
    });

    // Confirmadas (próximos dias)
    await open(
      {
        mentor: 'juliana',
        student: 'gustavo',
        slug: 'ingles',
        startsAt: futureAt(2, 18, 0),
        minutes: 30,
      },
      'ACCEPTED',
    );
    await open(
      { mentor: 'thiago', student: 'beatriz', slug: 'violao', startsAt: futureAt(4, 18, 0) },
      'ACCEPTED',
    );
    await open(
      { mentor: 'leonardo', student: 'helena', slug: 'piano', startsAt: futureAt(5, 20, 0) },
      'ACCEPTED',
    );
    await open(
      { mentor: 'camila', student: 'diego', slug: 'espanhol', startsAt: futureAt(5, 18, 0) },
      'ACCEPTED',
    );
    await open(
      { mentor: 'gustavo', student: 'igor', slug: 'javascript', startsAt: futureAt(6, 14, 0) },
      'ACCEPTED',
    );
    await open(
      {
        mentor: 'helena',
        student: 'fernanda',
        slug: 'frances',
        startsAt: futureAt(4, 18, 0),
        minutes: 30,
      },
      'ACCEPTED',
    );
    await open(
      { mentor: 'helena', student: 'leonardo', slug: 'alemao', startsAt: futureAt(0, 10, 0) },
      'ACCEPTED',
    );

    // Pedidos aguardando resposta (um deles com contraproposta de horário do mentor)
    await open(
      {
        mentor: 'diego',
        student: 'camila',
        slug: 'excel',
        startsAt: futureAt(2, 19, 1),
        note: 'Oi, Diego! Quero montar uma planilha de gastos mensais. Pode ser?',
      },
      'PENDING',
    );
    await open(
      {
        mentor: 'igor',
        student: 'juliana',
        slug: 'matematica',
        startsAt: futureAt(3, 19, 0),
        note: 'Preciso revisar porcentagem e juros.',
      },
      'PENDING',
    );
    await open(
      { mentor: 'beatriz', student: 'thiago', slug: 'python', startsAt: futureAt(1, 19, 0) },
      'PENDING',
    );
    await open(
      { mentor: 'gustavo', student: 'fernanda', slug: 'react', startsAt: futureAt(6, 16, 1) },
      'PENDING',
      'mentor',
    );

    // Denúncias para o painel de administração
    await prisma.report.create({
      data: {
        reporterId: idOf('leonardo'),
        targetUserId: idOf('camila'),
        sessionId: noShow,
        reason: 'NO_SHOW',
        details: 'Combinamos o horário, esperei 20 minutos e ninguém entrou na sala.',
      },
    });
    await prisma.report.create({
      data: {
        reporterId: idOf('diego'),
        targetUserId: idOf('juliana'),
        reason: 'OTHER',
        details: 'A aula começou muito atrasada.',
        status: 'DISMISSED',
        resolutionNote: 'Conversamos com as duas pessoas; foi um imprevisto pontual.',
        resolvedAt: new Date(Date.now() - 2 * DAY),
      },
    });

    const totals = await prisma.$queryRaw<
      { profiles: bigint; sessions: bigint; reviews: bigint; ledger: bigint }[]
    >`
      SELECT (SELECT count(*) FROM profiles WHERE id = ANY(${ids}::uuid[])) AS profiles,
             (SELECT count(*) FROM sessions WHERE mentor_id = ANY(${ids}::uuid[])) AS sessions,
             (SELECT count(*) FROM reviews WHERE author_id = ANY(${ids}::uuid[])) AS reviews,
             (SELECT count(*) FROM credit_transactions WHERE user_id = ANY(${ids}::uuid[])) AS ledger`;
    const t = totals[0];
    console.log(
      `Comunidade criada: ${t?.profiles} perfis, ${t?.sessions} aulas, ${t?.reviews} avaliações, ${t?.ledger} lançamentos de crédito.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/** Remove SOMENTE a comunidade de demonstração. Recusa se alguém real interagiu com ela. */
async function removeCommunity(prisma: PrismaClient, ids: string[]): Promise<void> {
  const sessions = await prisma.session.findMany({
    where: { OR: [{ mentorId: { in: ids } }, { studentId: { in: ids } }] },
    select: { id: true, mentorId: true, studentId: true },
  });
  const demo = new Set(ids);
  const mixed = sessions.filter((s) => !(demo.has(s.mentorId) && demo.has(s.studentId)));
  const strangers = await prisma.report.count({
    where: {
      OR: [
        { reporterId: { in: ids }, targetUserId: { notIn: ids } },
        { targetUserId: { in: ids }, reporterId: { notIn: ids } },
      ],
    },
  });
  if (mixed.length > 0 || strangers > 0) {
    throw new Error(
      `Não removi nada: ${mixed.length} aula(s) e ${strangers} denúncia(s) envolvem pessoas reais. ` +
        'Apagar isso mexeria nos créditos e no histórico delas.',
    );
  }

  const sessionIds = sessions.map((s) => s.id);
  await prisma.$transaction(async (tx) => {
    // O ledger é imutável por gatilho; o dono do banco o desliga só dentro desta transação.
    await tx.$executeRawUnsafe(
      'ALTER TABLE credit_transactions DISABLE TRIGGER credit_transactions_no_update_delete',
    );
    await tx.report.deleteMany({
      where: { OR: [{ reporterId: { in: ids } }, { targetUserId: { in: ids } }] },
    });
    await tx.notification.deleteMany({ where: { userId: { in: ids } } });
    await tx.review.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await tx.creditTransaction.deleteMany({ where: { userId: { in: ids } } });
    await tx.session.deleteMany({ where: { id: { in: sessionIds } } });
    await tx.profile.deleteMany({ where: { id: { in: ids } } });
    await tx.$executeRawUnsafe(
      'ALTER TABLE credit_transactions ENABLE TRIGGER credit_transactions_no_update_delete',
    );
  });
  console.log(
    `Comunidade de demonstração removida (${ids.length} perfis, ${sessionIds.length} aulas).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
