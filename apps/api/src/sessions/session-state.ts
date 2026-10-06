import {
  SessionStatus,
  type Confirmation,
  type SessionAction,
  type SessionStatus as SessionStatusType,
} from '@know-know/shared';

/**
 * Regras de estado de uma aula, sem acesso a banco: ficam num só lugar para serem testadas
 * isoladamente e reaproveitadas pelo serviço e pelo mapeamento de respostas.
 *
 * Os estados IN_PROGRESS e AWAITING_CONFIRMATION são DERIVADOS do relógio a partir de ACCEPTED
 * (não há job agendado: o plano gratuito da hospedagem dorme). Só são gravados quando alguém age.
 */

export interface SessionTimes {
  status: SessionStatusType;
  startsAt: Date;
  endsAt: Date;
}

export function effectiveStatus(session: SessionTimes, now: Date): SessionStatusType {
  if (session.status === SessionStatus.ACCEPTED || session.status === SessionStatus.IN_PROGRESS) {
    if (now >= session.endsAt) return SessionStatus.AWAITING_CONFIRMATION;
    if (now >= session.startsAt) return SessionStatus.IN_PROGRESS;
  }
  return session.status;
}

/** Estados em que o horário da aula ocupa a agenda dos dois. */
export const SCHEDULE_BLOCKING_STATUSES: SessionStatusType[] = [
  SessionStatus.ACCEPTED,
  SessionStatus.IN_PROGRESS,
  SessionStatus.AWAITING_CONFIRMATION,
];

export interface ActionContext {
  userId: string;
  mentorId: string;
  studentId: string;
  lastProposedById: string;
  myConfirmation: Confirmation | null;
  reviewedByMe: boolean;
}

export function allowedActions(
  session: SessionTimes,
  context: ActionContext,
  now: Date,
): SessionAction[] {
  const status = effectiveStatus(session, now);
  const isMentor = context.userId === context.mentorId;

  switch (status) {
    case SessionStatus.PENDING: {
      if (session.startsAt <= now) return [];
      const myTurn = context.lastProposedById !== context.userId;
      return myTurn ? ['ACCEPT', 'REJECT', 'PROPOSE_TIME'] : ['CANCEL'];
    }
    case SessionStatus.ACCEPTED:
      return isMentor ? ['UPDATE_MEETING', 'CANCEL'] : ['CANCEL'];
    case SessionStatus.IN_PROGRESS:
      return isMentor ? ['UPDATE_MEETING'] : [];
    case SessionStatus.AWAITING_CONFIRMATION:
      return context.myConfirmation === null ? ['CONFIRM'] : [];
    case SessionStatus.COMPLETED:
      return context.reviewedByMe ? [] : ['REVIEW'];
    default:
      return [];
  }
}

export type ConfirmationOutcome = 'WAITING' | 'COMPLETED' | 'NO_SHOW' | 'DISPUTED';

/** Resultado da combinação das duas respostas de "essa aula aconteceu?". */
export function resolveConfirmations(
  student: Confirmation | null,
  mentor: Confirmation | null,
): ConfirmationOutcome {
  if (student === null || mentor === null) return 'WAITING';
  if (student === 'YES' && mentor === 'YES') return 'COMPLETED';
  if (student === 'NO' && mentor === 'NO') return 'NO_SHOW';
  return 'DISPUTED';
}

/** O link da reunião só é mostrado aos participantes de uma aula já aceita. */
export function meetingUrlVisible(status: SessionStatusType): boolean {
  return (
    status === SessionStatus.ACCEPTED ||
    status === SessionStatus.IN_PROGRESS ||
    status === SessionStatus.AWAITING_CONFIRMATION ||
    status === SessionStatus.COMPLETED
  );
}
