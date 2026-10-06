import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  ApiErrorCode,
  SESSION_RULES,
  type AcceptSessionInput,
  type ConfirmSessionInput,
  type CreateSessionInput,
  type ListSessionsQuery,
  type Paginated,
  type ProposeTimeInput,
  type SessionView,
  type UpdateMeetingInput,
} from '@know-know/shared';
import { fitsAvailability } from '../availability/availability-rules';
import { AppException } from '../common/errors/app-exception';
import { AppConfig } from '../config/app-config.service';
import { LedgerService } from '../credits/ledger.service';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { toSessionView } from './session.mapper';
import { effectiveStatus, resolveConfirmations } from './session-state';
import { SessionsRepository } from './sessions.repository';

type Tx = Prisma.TransactionClient;

/** Aula como carregada dentro das transações de mudança de estado. */
type LockedSession = Prisma.SessionGetPayload<{ include: { skill: { select: { name: true } } } }>;

interface MutationContext {
  tx: Tx;
  session: LockedSession;
  now: Date;
  isMentor: boolean;
  otherId: string;
}

/** Violação das constraints de exclusão do banco (dois horários confirmados sobrepostos). */
function isScheduleOverlap(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const meta =
    'meta' in error && error.meta !== undefined
      ? JSON.stringify(error.meta, (_k, v: unknown) => v)
      : '';
  return /no_overlap|23P01/.test(`${error.message} ${meta}`);
}

const invalidState = (message: string) =>
  AppException.conflict(ApiErrorCode.INVALID_SESSION_STATE, message);

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SessionsRepository,
    private readonly ledger: LedgerService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly config: AppConfig,
  ) {}

  // ───────────────────────── Consultas ─────────────────────────

  async list(userId: string, query: ListSessionsQuery): Promise<Paginated<SessionView>> {
    await this.expireStale(userId);
    const now = new Date();
    const { total, rows } = await this.repository.list(userId, query, now);
    return {
      items: rows.map((row) => toSessionView(row, userId, this.storage, now)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async get(userId: string, id: string): Promise<SessionView> {
    await this.expireStale(userId);
    return this.view(userId, id);
  }

  private async view(userId: string, id: string): Promise<SessionView> {
    const row = await this.repository.findForParticipant(id, userId);
    if (!row) throw AppException.notFound('Não encontramos essa aula.');
    return toSessionView(row, userId, this.storage);
  }

  // ───────────────────────── Solicitação ─────────────────────────

  async create(studentId: string, input: CreateSessionInput): Promise<SessionView> {
    if (input.mentorId === studentId) {
      throw AppException.unprocessable(
        ApiErrorCode.SELF_SESSION,
        'Você não pode marcar uma aula com você mesmo.',
      );
    }
    await this.expireStale(studentId);

    const mentor = await this.prisma.profile.findUnique({
      where: { id: input.mentorId },
      include: { availability: true },
    });
    if (!mentor || mentor.status !== 'ACTIVE' || mentor.onboardingCompletedAt === null) {
      throw AppException.notFound('Não encontramos essa pessoa.');
    }

    const teaches = await this.prisma.userTeachingSkill.findUnique({
      where: { userId_skillId: { userId: mentor.id, skillId: input.skillId } },
      include: { skill: true },
    });
    if (!teaches || !teaches.skill.isActive) {
      throw AppException.unprocessable(
        ApiErrorCode.SKILL_NOT_TAUGHT,
        `${mentor.displayName} não ensina isso no momento.`,
      );
    }

    const now = new Date();
    const startsAt = new Date(input.startsAt);
    this.assertSchedulable(startsAt, now);
    const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);

    if (!fitsAvailability(mentor.availability, mentor.timezone, startsAt, input.durationMinutes)) {
      throw AppException.unprocessable(
        ApiErrorCode.OUTSIDE_AVAILABILITY,
        `Esse horário está fora da disponibilidade de ${mentor.displayName}. Escolha um dos horários livres.`,
      );
    }

    if (await this.repository.findScheduleConflict(this.prisma, mentor.id, startsAt, endsAt)) {
      throw AppException.conflict(
        ApiErrorCode.TIME_CONFLICT,
        `${mentor.displayName} já tem uma aula nesse horário. Escolha outro.`,
      );
    }
    if (await this.repository.findScheduleConflict(this.prisma, studentId, startsAt, endsAt)) {
      throw AppException.conflict(
        ApiErrorCode.TIME_CONFLICT,
        'Você já tem uma aula nesse horário. Escolha outro.',
      );
    }

    const pending = await this.prisma.session.count({
      where: { studentId, status: 'PENDING', startsAt: { gt: now } },
    });
    if (pending >= SESSION_RULES.maxPendingPerStudent) {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Você já tem muitas solicitações aguardando resposta. Espere algumas serem respondidas.',
      );
    }
    const duplicate = await this.prisma.session.findFirst({
      where: {
        studentId,
        mentorId: mentor.id,
        skillId: input.skillId,
        status: 'PENDING',
        startsAt,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Você já enviou essa solicitação. Aguarde a resposta.',
      );
    }

    const inPerson = input.mode === 'IN_PERSON';
    const creditCost = this.config.creditCostFor(input.durationMinutes);

    try {
      const session = await this.prisma.$transaction(async (tx) => {
        await this.ledger.hold(tx, studentId, creditCost);
        const created = await tx.session.create({
          data: {
            mentorId: mentor.id,
            studentId,
            skillId: input.skillId,
            mode: input.mode,
            meetingProvider: inPerson
              ? 'IN_PERSON'
              : input.meetingProvider && input.meetingProvider !== 'IN_PERSON'
                ? input.meetingProvider
                : 'GOOGLE_MEET',
            note: input.note ?? null,
            startsAt,
            endsAt,
            durationMinutes: input.durationMinutes,
            creditCost,
            lastProposedById: studentId,
          },
        });
        await this.notifications.create(tx, {
          userId: mentor.id,
          type: 'SESSION_REQUESTED',
          sessionId: created.id,
          actorId: studentId,
        });
        return created;
      });
      return await this.view(studentId, session.id);
    } catch (error) {
      return this.translate(error);
    }
  }

  // ───────────────────────── Respostas do mentor/aluno ─────────────────────────

  async accept(userId: string, id: string, input: AcceptSessionInput): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, now, isMentor, otherId }) => {
      this.assertPersistedStatus(session, ['PENDING']);
      if (session.lastProposedById === userId) {
        throw invalidState('Essa proposta é sua. Agora é a vez da outra pessoa responder.');
      }
      if (session.startsAt <= now) throw invalidState('O horário dessa aula já passou.');
      await this.assertNoScheduleConflict(tx, session);

      await tx.session.update({
        where: { id },
        data: {
          status: 'ACCEPTED',
          // Só quem ensina define o link ou o local; o aluno que aceita uma contraproposta não altera.
          ...(isMentor ? this.meetingPatch(session, input) : {}),
        },
      });
      await this.notifications.create(tx, {
        userId: otherId,
        type: 'SESSION_ACCEPTED',
        sessionId: id,
        actorId: userId,
      });
    });
    return this.view(userId, id);
  }

  async reject(userId: string, id: string): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, otherId }) => {
      this.assertPersistedStatus(session, ['PENDING']);
      if (session.lastProposedById === userId) {
        throw invalidState('Você fez essa proposta. Para desistir, cancele a solicitação.');
      }
      await tx.session.update({
        where: { id },
        data: { status: 'REJECTED', cancelledById: userId },
      });
      await this.ledger.release(tx, session.studentId, session.creditCost);
      await this.notifications.create(tx, {
        userId: otherId,
        type: 'SESSION_REJECTED',
        sessionId: id,
        actorId: userId,
      });
    });
    return this.view(userId, id);
  }

  async proposeTime(userId: string, id: string, input: ProposeTimeInput): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, now, otherId }) => {
      this.assertPersistedStatus(session, ['PENDING']);
      if (session.lastProposedById === userId) {
        throw invalidState('Você já sugeriu um horário. Aguarde a resposta da outra pessoa.');
      }

      const startsAt = new Date(input.startsAt);
      this.assertSchedulable(startsAt, now);
      const endsAt = new Date(startsAt.getTime() + session.durationMinutes * 60_000);

      const mentor = await tx.profile.findUniqueOrThrow({
        where: { id: session.mentorId },
        include: { availability: true },
      });
      if (
        !fitsAvailability(mentor.availability, mentor.timezone, startsAt, session.durationMinutes)
      ) {
        throw AppException.unprocessable(
          ApiErrorCode.OUTSIDE_AVAILABILITY,
          'Esse horário está fora da disponibilidade de quem vai ensinar. Escolha um horário livre.',
        );
      }
      await this.assertNoScheduleConflict(tx, { ...session, startsAt, endsAt });

      await tx.session.update({
        where: { id },
        data: { startsAt, endsAt, lastProposedById: userId },
      });
      await this.notifications.create(tx, {
        userId: otherId,
        type: 'SESSION_TIME_PROPOSED',
        sessionId: id,
        actorId: userId,
      });
    });
    return this.view(userId, id);
  }

  async cancel(userId: string, id: string): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, now, otherId }) => {
      const status = effectiveStatus(session, now);
      const cancellable =
        session.status === 'PENDING' || (session.status === 'ACCEPTED' && status === 'ACCEPTED');
      if (!cancellable) {
        throw invalidState(
          status === 'IN_PROGRESS' || status === 'AWAITING_CONFIRMATION'
            ? 'A aula já começou. Quando terminar, confirme se ela aconteceu.'
            : 'Essa aula não pode mais ser cancelada.',
        );
      }
      await tx.session.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledById: userId },
      });
      await this.ledger.release(tx, session.studentId, session.creditCost);
      await this.notifications.create(tx, {
        userId: otherId,
        type: 'SESSION_CANCELLED',
        sessionId: id,
        actorId: userId,
      });
    });
    return this.view(userId, id);
  }

  async updateMeeting(userId: string, id: string, input: UpdateMeetingInput): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, isMentor }) => {
      if (!isMentor)
        throw AppException.forbidden('Só quem vai ensinar define o link ou o local da aula.');
      this.assertPersistedStatus(session, ['ACCEPTED', 'IN_PROGRESS']);
      await tx.session.update({ where: { id }, data: this.meetingPatch(session, input) });
    });
    return this.view(userId, id);
  }

  // ───────────────────────── Depois da aula ─────────────────────────

  async confirm(userId: string, id: string, input: ConfirmSessionInput): Promise<SessionView> {
    await this.mutate(id, userId, async ({ tx, session, now, isMentor }) => {
      const status = effectiveStatus(session, now);
      if (status === 'ACCEPTED' || status === 'IN_PROGRESS') {
        throw AppException.conflict(
          ApiErrorCode.SESSION_NOT_FINISHED,
          'Você poderá confirmar quando a aula terminar.',
        );
      }
      if (status !== 'AWAITING_CONFIRMATION') {
        throw invalidState('Essa aula não está esperando confirmação.');
      }

      const mine = isMentor ? session.mentorConfirmation : session.studentConfirmation;
      if (mine !== null) {
        throw AppException.conflict(
          ApiErrorCode.ALREADY_CONFIRMED,
          'Você já respondeu sobre essa aula. Aguarde a outra pessoa.',
        );
      }

      const answer = input.happened ? 'YES' : 'NO';
      const updated = await tx.session.update({
        where: { id },
        data: isMentor
          ? { mentorConfirmation: answer, mentorConfirmedAt: now, status: 'AWAITING_CONFIRMATION' }
          : {
              studentConfirmation: answer,
              studentConfirmedAt: now,
              status: 'AWAITING_CONFIRMATION',
            },
      });

      const outcome = resolveConfirmations(updated.studentConfirmation, updated.mentorConfirmation);
      if (outcome === 'WAITING') return;

      if (outcome === 'COMPLETED') {
        await this.settleAndComplete(tx, session, now);
      } else if (outcome === 'NO_SHOW') {
        await tx.session.update({ where: { id }, data: { status: 'NO_SHOW' } });
        await this.ledger.release(tx, session.studentId, session.creditCost);
        for (const recipient of [session.mentorId, session.studentId]) {
          await this.notifications.create(tx, {
            userId: recipient,
            type: 'SESSION_CANCELLED',
            sessionId: id,
          });
        }
      } else {
        await tx.session.update({ where: { id }, data: { status: 'DISPUTED' } });
        for (const [recipient, other] of [
          [session.mentorId, session.studentId],
          [session.studentId, session.mentorId],
        ] as const) {
          await this.notifications.create(tx, {
            userId: recipient,
            type: 'SESSION_DISPUTED',
            sessionId: id,
            actorId: other,
          });
        }
      }
    });
    return this.view(userId, id);
  }

  /** Estrutura para o admin resolver uma aula em revisão (sem arbitragem automática no MVP). */
  async resolveDispute(adminId: string, id: string, outcome: 'COMPLETE' | 'CANCEL'): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.repository.lock(tx, id);
        const session = await tx.session.findUnique({
          where: { id },
          include: { skill: { select: { name: true } } },
        });
        if (!session) throw AppException.notFound('Não encontramos essa aula.');
        if (session.status !== 'DISPUTED') throw invalidState('Essa aula não está em revisão.');

        if (outcome === 'COMPLETE') {
          await this.settleAndComplete(tx, session, new Date());
        } else {
          await tx.session.update({
            where: { id },
            data: { status: 'CANCELLED', cancelledById: adminId },
          });
          await this.ledger.release(tx, session.studentId, session.creditCost);
          for (const recipient of [session.mentorId, session.studentId]) {
            await this.notifications.create(tx, {
              userId: recipient,
              type: 'SESSION_CANCELLED',
              sessionId: id,
            });
          }
        }
      });
    } catch (error) {
      this.translate(error);
    }
  }

  /**
   * Libera as reservas de solicitações que ninguém respondeu até o horário passar.
   * Roda "preguiçosamente" nas consultas do usuário (não há job agendado no plano gratuito).
   */
  async expireStale(userId: string): Promise<void> {
    const now = new Date();
    const stale = await this.prisma.session.findMany({
      where: {
        status: 'PENDING',
        startsAt: { lte: now },
        OR: [{ mentorId: userId }, { studentId: userId }],
      },
      select: { id: true },
    });

    for (const { id } of stale) {
      await this.prisma.$transaction(async (tx) => {
        await this.repository.lock(tx, id);
        const session = await tx.session.findUnique({ where: { id } });
        if (!session || session.status !== 'PENDING' || session.startsAt > now) return;

        await tx.session.update({ where: { id }, data: { status: 'CANCELLED' } });
        await this.ledger.release(tx, session.studentId, session.creditCost);
        for (const recipient of [session.mentorId, session.studentId]) {
          await this.notifications.create(tx, {
            userId: recipient,
            type: 'SESSION_EXPIRED',
            sessionId: id,
          });
        }
      });
    }
  }

  // ───────────────────────── Internos ─────────────────────────

  /** Liquidação única: o filtro `settledAt IS NULL` garante que créditos nunca sejam pagos duas vezes. */
  private async settleAndComplete(tx: Tx, session: LockedSession, now: Date): Promise<void> {
    const gate = await tx.session.updateMany({
      where: {
        id: session.id,
        settledAt: null,
        status: { in: ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION', 'DISPUTED'] },
      },
      data: { status: 'COMPLETED', settledAt: now },
    });
    if (gate.count === 0) return;

    await this.ledger.settle(tx, {
      sessionId: session.id,
      studentId: session.studentId,
      mentorId: session.mentorId,
      amount: session.creditCost,
      skillName: session.skill.name,
    });
    await tx.profile.update({
      where: { id: session.mentorId },
      data: { sessionsTaught: { increment: 1 } },
    });
    await tx.profile.update({
      where: { id: session.studentId },
      data: { sessionsLearned: { increment: 1 } },
    });

    await this.notifications.create(tx, {
      userId: session.mentorId,
      type: 'SESSION_COMPLETED',
      sessionId: session.id,
      actorId: session.studentId,
    });
    await this.notifications.create(tx, {
      userId: session.studentId,
      type: 'SESSION_COMPLETED',
      sessionId: session.id,
      actorId: session.mentorId,
    });
    await this.notifications.create(tx, {
      userId: session.mentorId,
      type: 'CREDITS_RECEIVED',
      sessionId: session.id,
      actorId: session.studentId,
      amount: session.creditCost,
    });
  }

  /** Abre uma transação, trava a aula e confirma que quem pede é participante (senão, 404). */
  private async mutate<T>(
    sessionId: string,
    userId: string,
    action: (context: MutationContext) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await this.repository.lock(tx, sessionId);
          const session = await tx.session.findFirst({
            where: { id: sessionId, OR: [{ mentorId: userId }, { studentId: userId }] },
            include: { skill: { select: { name: true } } },
          });
          if (!session) throw AppException.notFound('Não encontramos essa aula.');

          const isMentor = session.mentorId === userId;
          return action({
            tx,
            session,
            now: new Date(),
            isMentor,
            otherId: isMentor ? session.studentId : session.mentorId,
          });
        },
        { timeout: 15_000 },
      );
    } catch (error) {
      return this.translate(error);
    }
  }

  private translate(error: unknown): never {
    if (isScheduleOverlap(error)) {
      throw AppException.conflict(
        ApiErrorCode.TIME_CONFLICT,
        'Esse horário acabou de ser ocupado por outra aula. Escolha outro.',
      );
    }
    throw error;
  }

  private assertPersistedStatus(session: LockedSession, allowed: LockedSession['status'][]): void {
    if (!allowed.includes(session.status)) {
      throw invalidState('Essa ação não está disponível para o estado atual da aula.');
    }
  }

  private assertSchedulable(startsAt: Date, now: Date): void {
    const earliest = now.getTime() + SESSION_RULES.minLeadMinutes * 60_000;
    const latest = now.getTime() + SESSION_RULES.maxHorizonDays * 24 * 60 * 60_000;
    if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < earliest) {
      throw AppException.unprocessable(
        ApiErrorCode.VALIDATION_ERROR,
        `Escolha um horário com pelo menos ${SESSION_RULES.minLeadMinutes} minutos de antecedência.`,
      );
    }
    if (startsAt.getTime() > latest) {
      throw AppException.unprocessable(
        ApiErrorCode.VALIDATION_ERROR,
        `Só dá para marcar aulas nos próximos ${SESSION_RULES.maxHorizonDays} dias.`,
      );
    }
  }

  private async assertNoScheduleConflict(
    tx: Tx,
    session: { id: string; mentorId: string; studentId: string; startsAt: Date; endsAt: Date },
  ): Promise<void> {
    for (const [userId, message] of [
      [session.mentorId, 'Quem vai ensinar já tem uma aula nesse horário.'],
      [session.studentId, 'Quem vai aprender já tem uma aula nesse horário.'],
    ] as const) {
      const conflict = await this.repository.findScheduleConflict(
        tx,
        userId,
        session.startsAt,
        session.endsAt,
        session.id,
      );
      if (conflict) throw AppException.conflict(ApiErrorCode.TIME_CONFLICT, message);
    }
  }

  /** Campos de reunião a gravar. `undefined` = não mexe; `null` = apaga. Presencial nunca tem link. */
  private meetingPatch(
    session: Pick<LockedSession, 'mode' | 'meetingProvider'>,
    input: {
      meetingProvider?: AcceptSessionInput['meetingProvider'];
      meetingUrl?: string | null;
      locationNote?: string | null | undefined;
    },
  ): Prisma.SessionUpdateInput {
    if (session.mode === 'IN_PERSON') {
      return input.locationNote !== undefined ? { locationNote: input.locationNote } : {};
    }
    return {
      ...(input.meetingProvider && input.meetingProvider !== 'IN_PERSON'
        ? { meetingProvider: input.meetingProvider }
        : {}),
      ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
    };
  }
}
