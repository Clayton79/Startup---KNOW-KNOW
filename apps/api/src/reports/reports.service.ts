import { Injectable } from '@nestjs/common';
import { ApiErrorCode, type CreateReportInput } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, input: CreateReportInput): Promise<void> {
    if (input.targetUserId === reporterId) {
      throw AppException.unprocessable(
        ApiErrorCode.VALIDATION_ERROR,
        'Você não pode denunciar a si mesmo.',
      );
    }

    const target = await this.prisma.profile.findUnique({
      where: { id: input.targetUserId },
      select: { id: true },
    });
    if (!target) throw AppException.notFound('Não encontramos essa pessoa.');

    // Se a denúncia cita uma aula, ela precisa ser uma aula dos dois (evita denúncias forjadas).
    if (input.sessionId) {
      const session = await this.prisma.session.findFirst({
        where: {
          id: input.sessionId,
          OR: [
            { mentorId: reporterId, studentId: input.targetUserId },
            { studentId: reporterId, mentorId: input.targetUserId },
          ],
        },
        select: { id: true },
      });
      if (!session) throw AppException.notFound('Não encontramos essa aula entre vocês.');
    }

    const recentDuplicate = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetUserId: input.targetUserId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
      select: { id: true },
    });
    if (recentDuplicate) {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Você já tem uma denúncia em análise sobre essa pessoa. Nossa equipe vai olhar com atenção.',
      );
    }

    await this.prisma.report.create({
      data: {
        reporterId,
        targetUserId: input.targetUserId,
        sessionId: input.sessionId ?? null,
        reason: input.reason,
        details: input.details ?? null,
      },
    });
  }
}
