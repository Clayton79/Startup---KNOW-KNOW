import { Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  REVIEW_CATEGORIES_BY_DIRECTION,
  type CreateReviewInput,
  type Paginated,
  type PaginationQuery,
  type PendingReviewView,
  type ReviewView,
} from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { SessionsRepository } from '../sessions/sessions.repository';
import { StorageService } from '../storage/storage.service';

const reviewInclude = {
  scores: true,
  author: { select: { id: true, displayName: true, avatarPath: true } },
  session: { select: { skill: { select: { name: true } } } },
} as const satisfies Prisma.ReviewInclude;

type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsRepository,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  /**
   * Avalia o outro participante de uma aula concluída. Regras (também reforçadas por trigger no banco):
   * só participantes, só aula COMPLETED, uma avaliação por autor, categorias da direção correta.
   */
  async create(authorId: string, sessionId: string, input: CreateReviewInput): Promise<ReviewView> {
    try {
      const review = await this.prisma.$transaction(async (tx) => {
        await this.sessions.lock(tx, sessionId);
        const session = await tx.session.findFirst({
          where: { id: sessionId, OR: [{ mentorId: authorId }, { studentId: authorId }] },
        });
        if (!session) throw AppException.notFound('Não encontramos essa aula.');

        if (session.status !== 'COMPLETED') {
          throw AppException.conflict(
            ApiErrorCode.REVIEW_NOT_ALLOWED,
            'Só dá para avaliar depois que a aula for concluída pelos dois.',
          );
        }

        const isMentor = session.mentorId === authorId;
        const direction = isMentor ? 'MENTOR_TO_STUDENT' : 'STUDENT_TO_MENTOR';
        const targetId = isMentor ? session.studentId : session.mentorId;

        const expected = [...REVIEW_CATEGORIES_BY_DIRECTION[direction]].sort();
        const received = input.scores.map((item) => item.category).sort();
        if (expected.join() !== received.join()) {
          throw AppException.unprocessable(
            ApiErrorCode.VALIDATION_ERROR,
            'Avalie todos os critérios pedidos, uma vez cada.',
          );
        }

        const rating = Math.min(
          5,
          Math.max(
            1,
            Math.round(
              input.scores.reduce((sum, item) => sum + item.score, 0) / input.scores.length,
            ),
          ),
        );

        const created = await tx.review.create({
          data: {
            sessionId,
            authorId,
            targetId,
            direction,
            rating,
            comment: input.comment ?? null,
            scores: { create: input.scores.map(({ category, score }) => ({ category, score })) },
          },
          include: reviewInclude,
        });

        // Reputação materializada na mesma transação (evita agregar a cada card do Explorar).
        await tx.profile.update({
          where: { id: targetId },
          data: isMentor
            ? { studentRatingSum: { increment: rating }, studentRatingCount: { increment: 1 } }
            : { mentorRatingSum: { increment: rating }, mentorRatingCount: { increment: 1 } },
        });

        await this.notifications.create(tx, {
          userId: targetId,
          type: 'REVIEW_RECEIVED',
          sessionId,
          actorId: authorId,
        });
        return created;
      });
      return this.toView(review);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw AppException.conflict(
          ApiErrorCode.ALREADY_REVIEWED,
          'Você já avaliou essa aula. Cada pessoa avalia uma vez.',
        );
      }
      throw error;
    }
  }

  async listReceived(
    targetId: string,
    { page, pageSize }: PaginationQuery,
  ): Promise<Paginated<ReviewView>> {
    const [total, rows] = await Promise.all([
      this.prisma.review.count({ where: { targetId } }),
      this.prisma.review.findMany({
        where: { targetId },
        include: reviewInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: rows.map((row) => this.toView(row)), page, pageSize, total };
  }

  /** Aulas concluídas em que eu ainda não avaliei a outra pessoa. */
  async listPending(userId: string): Promise<PendingReviewView[]> {
    const rows = await this.prisma.session.findMany({
      where: {
        status: 'COMPLETED',
        OR: [{ mentorId: userId }, { studentId: userId }],
        reviews: { none: { authorId: userId } },
      },
      include: {
        skill: { select: { name: true } },
        mentor: { select: { id: true, displayName: true, avatarPath: true } },
        student: { select: { id: true, displayName: true, avatarPath: true } },
      },
      orderBy: { endsAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => {
      const isMentor = row.mentorId === userId;
      const other = isMentor ? row.student : row.mentor;
      return {
        sessionId: row.id,
        skillName: row.skill.name,
        endedAt: row.endsAt.toISOString(),
        direction: isMentor ? 'MENTOR_TO_STUDENT' : 'STUDENT_TO_MENTOR',
        other: {
          id: other.id,
          displayName: other.displayName,
          avatarUrl: this.storage.avatarPublicUrl(other.avatarPath),
        },
      };
    });
  }

  private toView(row: ReviewRow): ReviewView {
    return {
      id: row.id,
      sessionId: row.sessionId,
      direction: row.direction,
      rating: row.rating,
      scores: row.scores.map(({ category, score }) => ({ category, score })),
      comment: row.comment,
      skillName: row.session.skill.name,
      author: {
        id: row.author.id,
        displayName: row.author.displayName,
        avatarUrl: this.storage.avatarPublicUrl(row.author.avatarPath),
      },
      createdAt: row.createdAt.toISOString(),
    };
  }
}
