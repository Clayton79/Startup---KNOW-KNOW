import { Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  SESSION_RULES,
  type AvailabilityRuleView,
  type AvailableSlots,
  type ReplaceAvailabilityInput,
  type SlotsQuery,
} from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../database/prisma.service';
import { SCHEDULE_BLOCKING_STATUSES } from '../sessions/session-state';
import { generateSlots } from './availability-rules';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string): Promise<AvailabilityRuleView[]> {
    return this.prisma.availabilityRule.findMany({
      where: { userId },
      orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
      select: { id: true, weekday: true, startMinute: true, endMinute: true },
    });
  }

  /** Substitui os horários semanais. Faixas do mesmo dia não podem se sobrepor. */
  async replace(userId: string, input: ReplaceAvailabilityInput): Promise<AvailabilityRuleView[]> {
    this.assertNoOverlap(input.rules);

    await this.prisma.$transaction(async (tx) => {
      await tx.availabilityRule.deleteMany({ where: { userId } });
      if (input.rules.length > 0) {
        await tx.availabilityRule.createMany({
          data: input.rules.map((rule) => ({ userId, ...rule })),
        });
      }
    });
    return this.list(userId);
  }

  /** Horários livres de um mentor (fora de aulas já marcadas), no fuso dele. */
  async getSlots(mentorId: string, query: SlotsQuery): Promise<AvailableSlots> {
    const mentor = await this.prisma.profile.findUnique({
      where: { id: mentorId },
      include: { availability: true },
    });
    if (!mentor || mentor.status !== 'ACTIVE' || mentor.onboardingCompletedAt === null) {
      throw AppException.notFound('Não encontramos essa pessoa.');
    }

    const now = new Date();
    const horizon = new Date(now.getTime() + query.days * 24 * 60 * 60_000);
    const busy = await this.prisma.session.findMany({
      where: {
        mentorId,
        status: { in: SCHEDULE_BLOCKING_STATUSES },
        startsAt: { lt: horizon },
        endsAt: { gt: now },
      },
      select: { startsAt: true, endsAt: true },
    });

    return {
      timezone: mentor.timezone,
      slots: generateSlots({
        rules: mentor.availability,
        timezone: mentor.timezone,
        from: now,
        days: query.days,
        durationMinutes: query.durationMinutes,
        busy,
        minLeadMinutes: SESSION_RULES.minLeadMinutes,
      }),
    };
  }

  private assertNoOverlap(rules: ReplaceAvailabilityInput['rules']): void {
    const byDay = new Map<number, { startMinute: number; endMinute: number }[]>();
    for (const rule of rules) {
      const day = byDay.get(rule.weekday) ?? [];
      day.push(rule);
      byDay.set(rule.weekday, day);
    }
    for (const day of byDay.values()) {
      day.sort((a, b) => a.startMinute - b.startMinute);
      for (let i = 1; i < day.length; i++) {
        if (day[i]!.startMinute < day[i - 1]!.endMinute) {
          throw AppException.unprocessable(
            ApiErrorCode.VALIDATION_ERROR,
            'Há horários que se sobrepõem no mesmo dia. Ajuste as faixas e tente de novo.',
          );
        }
      }
    }
  }
}
