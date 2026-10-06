import type { PersonSummary, SessionView } from '@know-know/shared';
import type { Prisma } from '../generated/prisma/client';
import type { StorageService } from '../storage/storage.service';
import { allowedActions, effectiveStatus, meetingUrlVisible } from './session-state';

const personSelect = { select: { id: true, displayName: true, avatarPath: true } } as const;

export const sessionInclude = {
  skill: { select: { id: true, name: true } },
  mentor: personSelect,
  student: personSelect,
  reviews: { select: { authorId: true } },
} as const satisfies Prisma.SessionInclude;

export type SessionRow = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;

function toPerson(
  row: { id: string; displayName: string; avatarPath: string | null },
  storage: StorageService,
): PersonSummary {
  return {
    id: row.id,
    displayName: row.displayName,
    avatarUrl: storage.avatarPublicUrl(row.avatarPath),
  };
}

/**
 * Converte a aula para o formato da API do ponto de vista de `viewerId` (sempre um participante).
 * O link da reunião só sai aqui, nunca em listagens públicas.
 */
export function toSessionView(
  row: SessionRow,
  viewerId: string,
  storage: StorageService,
  now: Date = new Date(),
): SessionView {
  const isMentor = row.mentorId === viewerId;
  const status = effectiveStatus(row, now);
  const myConfirmation = isMentor ? row.mentorConfirmation : row.studentConfirmation;
  const otherConfirmation = isMentor ? row.studentConfirmation : row.mentorConfirmation;
  const reviewedByMe = row.reviews.some((review) => review.authorId === viewerId);

  return {
    id: row.id,
    status,
    skill: row.skill,
    mode: row.mode,
    meetingProvider: row.meetingProvider,
    meetingUrl: meetingUrlVisible(status) ? row.meetingUrl : null,
    locationNote: meetingUrlVisible(status) ? row.locationNote : null,
    note: row.note,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    durationMinutes: row.durationMinutes,
    creditCost: row.creditCost,
    mentor: toPerson(row.mentor, storage),
    student: toPerson(row.student, storage),
    myRole: isMentor ? 'MENTOR' : 'STUDENT',
    lastProposedById: row.lastProposedById,
    awaitingMyResponse:
      status === 'PENDING' && row.startsAt > now && row.lastProposedById !== viewerId,
    myConfirmation,
    otherHasConfirmed: otherConfirmation !== null,
    reviewedByMe,
    allowedActions: allowedActions(
      row,
      {
        userId: viewerId,
        mentorId: row.mentorId,
        studentId: row.studentId,
        lastProposedById: row.lastProposedById,
        myConfirmation,
        reviewedByMe,
      },
      now,
    ),
    createdAt: row.createdAt.toISOString(),
  };
}
