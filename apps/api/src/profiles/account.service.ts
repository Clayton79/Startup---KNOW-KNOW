import { Injectable, Logger } from '@nestjs/common';
import { ApiErrorCode } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { AppConfig } from '../config/app-config.service';
import { PrismaService } from '../database/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

/**
 * Exclusão de conta (LGPD). Não apagamos linhas que sustentam o histórico financeiro e as
 * avaliações dos outros: anonimizamos a pessoa e removemos o que a identifica.
 */
@Injectable()
export class AccountService {
  private readonly logger = new Logger(AccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionsService,
    private readonly config: AppConfig,
  ) {}

  async deleteAccount(userId: string): Promise<void> {
    const now = new Date();
    const participant = [{ mentorId: userId }, { studentId: userId }];

    // Aulas em andamento, esperando confirmação ou em revisão envolvem créditos de outra pessoa.
    const blocking = await this.prisma.session.findFirst({
      where: {
        OR: participant,
        AND: [
          {
            OR: [
              { status: 'DISPUTED' },
              {
                status: { in: ['ACCEPTED', 'IN_PROGRESS', 'AWAITING_CONFIRMATION'] },
                startsAt: { lte: now },
              },
            ],
          },
        ],
      },
      select: { id: true },
    });
    if (blocking) {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Você tem aulas em andamento ou esperando confirmação. Conclua-as antes de excluir a conta.',
      );
    }

    // Solicitações e aulas futuras são canceladas, liberando os créditos reservados.
    const open = await this.prisma.session.findMany({
      where: {
        OR: participant,
        AND: [{ OR: [{ status: 'PENDING' }, { status: 'ACCEPTED', startsAt: { gt: now } }] }],
      },
      select: { id: true },
    });
    for (const { id } of open) {
      try {
        await this.sessions.cancel(userId, id);
      } catch (error) {
        if (!(error instanceof AppException)) throw error;
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userTeachingSkill.deleteMany({ where: { userId } });
      await tx.userLearningSkill.deleteMany({ where: { userId } });
      await tx.availabilityRule.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.profile.update({
        where: { id: userId },
        data: {
          displayName: 'Usuário removido',
          bio: null,
          city: null,
          state: null,
          avatarPath: null,
          status: 'DELETED',
          deletedAt: now,
        },
      });
    });

    await this.deleteAuthUser(userId);
  }

  /** Remove o login no Supabase Auth. Se falhar, a conta já está bloqueada (status DELETED). */
  private async deleteAuthUser(userId: string): Promise<void> {
    const base = this.config.get('SUPABASE_URL').replace(/\/$/, '');
    const key = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    try {
      const response = await fetch(`${base}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok)
        this.logger.warn(`Supabase Auth recusou a exclusão (HTTP ${response.status}).`);
    } catch (error) {
      this.logger.warn(`Não foi possível remover o login no Supabase: ${String(error)}`);
    }
  }
}
