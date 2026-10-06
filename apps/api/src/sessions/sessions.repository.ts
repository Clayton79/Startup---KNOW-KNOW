import { Injectable } from '@nestjs/common';
import type { ListSessionsQuery } from '@know-know/shared';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { sessionInclude, type SessionRow } from './session.mapper';
import { SCHEDULE_BLOCKING_STATUSES } from './session-state';

type Client = Prisma.TransactionClient | PrismaService;

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForParticipant(id: string, userId: string): Promise<SessionRow | null> {
    return this.prisma.session.findFirst({
      where: { id, OR: [{ mentorId: userId }, { studentId: userId }] },
      include: sessionInclude,
    });
  }

  findByIdWithRelations(client: Client, id: string): Promise<SessionRow | null> {
    return client.session.findUnique({ where: { id }, include: sessionInclude });
  }

  async list(
    userId: string,
    query: ListSessionsQuery,
    now: Date,
  ): Promise<{ total: number; rows: SessionRow[] }> {
    const participant: Prisma.SessionWhereInput =
      query.role === 'MENTOR'
        ? { mentorId: userId }
        : query.role === 'STUDENT'
          ? { studentId: userId }
          : { OR: [{ mentorId: userId }, { studentId: userId }] };

    const scope: Prisma.SessionWhereInput =
      query.scope === 'pending'
        ? { status: 'PENDING', startsAt: { gt: now } }
        : query.scope === 'upcoming'
          ? { status: { in: ['ACCEPTED', 'IN_PROGRESS'] }, endsAt: { gt: now } }
          : query.scope === 'past'
            ? {
                OR: [
                  {
                    status: {
                      in: [
                        'REJECTED',
                        'CANCELLED',
                        'COMPLETED',
                        'NO_SHOW',
                        'DISPUTED',
                        'AWAITING_CONFIRMATION',
                      ],
                    },
                  },
                  { status: { in: ['ACCEPTED', 'IN_PROGRESS'] }, endsAt: { lte: now } },
                ],
              }
            : {};

    const range: Prisma.SessionWhereInput = {
      ...(query.from ? { startsAt: { gte: new Date(query.from) } } : {}),
      ...(query.to ? { endsAt: { lte: new Date(query.to) } } : {}),
    };

    const where: Prisma.SessionWhereInput = { AND: [participant, scope, range] };
    const ascending = query.scope === 'upcoming' || query.scope === 'pending';

    const [total, rows] = await Promise.all([
      this.prisma.session.count({ where }),
      this.prisma.session.findMany({
        where,
        include: sessionInclude,
        orderBy: [{ startsAt: ascending ? 'asc' : 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return { total, rows };
  }

  /** Aula confirmada de `userId` (mentor ou aluno) que se sobrepõe ao intervalo informado. */
  findScheduleConflict(
    client: Client,
    userId: string,
    startsAt: Date,
    endsAt: Date,
    excludeSessionId?: string,
  ) {
    return client.session.findFirst({
      where: {
        status: { in: SCHEDULE_BLOCKING_STATUSES },
        OR: [{ mentorId: userId }, { studentId: userId }],
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      select: { id: true },
    });
  }

  /** Trava a linha da aula até o fim da transação: serializa ações concorrentes sobre a mesma aula. */
  async lock(tx: Prisma.TransactionClient, id: string): Promise<void> {
    await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${id}::uuid FOR UPDATE`;
  }
}
