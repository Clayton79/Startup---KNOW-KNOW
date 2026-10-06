import { Injectable } from '@nestjs/common';
import type { DashboardView } from '@know-know/shared';
import { CreditsService } from '../credits/credits.service';
import { PrismaService } from '../database/prisma.service';
import { ExploreService } from '../explore/explore.service';
import { toReputation } from '../profiles/profile.mapper';
import { sessionInclude, toSessionView } from '../sessions/session.mapper';
import { SessionsService } from '../sessions/sessions.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credits: CreditsService,
    private readonly sessions: SessionsService,
    private readonly explore: ExploreService,
    private readonly storage: StorageService,
  ) {}

  async get(userId: string): Promise<DashboardView> {
    await this.sessions.expireStale(userId);
    const now = new Date();

    const upcoming = (role: 'mentorId' | 'studentId') =>
      this.prisma.session.findFirst({
        where: { [role]: userId, status: { in: ['ACCEPTED', 'IN_PROGRESS'] }, endsAt: { gt: now } },
        include: sessionInclude,
        orderBy: { startsAt: 'asc' },
      });

    const [
      wallet,
      nextLearning,
      nextTeaching,
      profile,
      taught,
      learned,
      requestsForMe,
      awaitingConfirmation,
      reviewsToWrite,
      recommendations,
    ] = await Promise.all([
      this.credits.getWallet(userId),
      upcoming('studentId'),
      upcoming('mentorId'),
      this.prisma.profile.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.session.aggregate({
        where: { mentorId: userId, status: 'COMPLETED' },
        _sum: { durationMinutes: true },
      }),
      this.prisma.session.aggregate({
        where: { studentId: userId, status: 'COMPLETED' },
        _sum: { durationMinutes: true },
      }),
      this.prisma.session.count({
        where: {
          status: 'PENDING',
          startsAt: { gt: now },
          lastProposedById: { not: userId },
          OR: [{ mentorId: userId }, { studentId: userId }],
        },
      }),
      this.prisma.session.count({
        where: {
          status: { in: ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'] },
          endsAt: { lte: now },
          OR: [
            { mentorId: userId, mentorConfirmation: null },
            { studentId: userId, studentConfirmation: null },
          ],
        },
      }),
      this.prisma.session.count({
        where: {
          status: 'COMPLETED',
          OR: [{ mentorId: userId }, { studentId: userId }],
          reviews: { none: { authorId: userId } },
        },
      }),
      this.explore.recommendations(userId, 3),
    ]);

    const reputation = toReputation(
      profile.mentorRatingSum,
      profile.mentorRatingCount,
      profile.studentRatingSum,
      profile.studentRatingCount,
    );
    const hours = (minutes: number | null) => Math.round(((minutes ?? 0) / 60) * 10) / 10;

    return {
      wallet,
      nextLearning: nextLearning ? toSessionView(nextLearning, userId, this.storage, now) : null,
      nextTeaching: nextTeaching ? toSessionView(nextTeaching, userId, this.storage, now) : null,
      stats: {
        hoursTaught: hours(taught._sum.durationMinutes),
        hoursLearned: hours(learned._sum.durationMinutes),
        ratingAverage: reputation.average,
        ratingCount: reputation.count,
      },
      pending: { requestsForMe, awaitingMyConfirmation: awaitingConfirmation, reviewsToWrite },
      recommendations,
    };
  }
}
