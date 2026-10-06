import { Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  type ReplaceTeachingSkillsInput,
  type TeachingSkillView,
} from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../database/prisma.service';
import { toSkillSummary } from '../profiles/profile.mapper';
import { SkillsService } from '../skills/skills.service';

@Injectable()
export class TeachingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly skills: SkillsService,
  ) {}

  /** Substitui a lista de conhecimentos que o usuário ensina (o cliente envia a lista final). */
  async replace(userId: string, input: ReplaceTeachingSkillsInput): Promise<TeachingSkillView[]> {
    const ids = input.skills.map((item) => item.skillId);
    const valid = await this.skills.findActiveIds(ids);
    if (valid.size !== ids.length) {
      throw AppException.unprocessable(
        ApiErrorCode.VALIDATION_ERROR,
        'Algum dos conhecimentos escolhidos não existe mais. Atualize a página e tente de novo.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userTeachingSkill.deleteMany({ where: { userId, skillId: { notIn: ids } } });
      for (const item of input.skills) {
        await tx.userTeachingSkill.upsert({
          where: { userId_skillId: { userId, skillId: item.skillId } },
          create: {
            userId,
            skillId: item.skillId,
            level: item.level,
            description: item.description ?? null,
          },
          update: { level: item.level, description: item.description ?? null },
        });
      }
    });

    const rows = await this.prisma.userTeachingSkill.findMany({
      where: { userId },
      include: { skill: { include: { category: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      skill: toSkillSummary(row.skill),
      level: row.level,
      description: row.description,
    }));
  }
}
