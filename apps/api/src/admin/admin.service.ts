import { Injectable } from '@nestjs/common';
import {
  ApiErrorCode,
  type AdminDisputeView,
  type AdminListReportsQuery,
  type AdminListUsersQuery,
  type AdminReportView,
  type AdminSkillView,
  type AdminStats,
  type AdminUserView,
  type Paginated,
} from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import { LedgerService } from '../credits/ledger.service';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { slugify } from '../common/slug';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async stats(): Promise<AdminStats> {
    const [users, activeUsers, sessionsCompleted, sessionsDisputed, openReports, credits] =
      await Promise.all([
        this.prisma.profile.count(),
        this.prisma.profile.count({ where: { status: 'ACTIVE' } }),
        this.prisma.session.count({ where: { status: 'COMPLETED' } }),
        this.prisma.session.count({ where: { status: 'DISPUTED' } }),
        this.prisma.report.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
        this.prisma.wallet.aggregate({ _sum: { balance: true } }),
      ]);
    return {
      users,
      activeUsers,
      sessionsCompleted,
      sessionsDisputed,
      openReports,
      creditsInCirculation: credits._sum.balance ?? 0,
    };
  }

  async listUsers(query: AdminListUsersQuery): Promise<Paginated<AdminUserView>> {
    const where: Prisma.ProfileWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { displayName: { contains: query.q, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.profile.count({ where }),
      this.prisma.profile.findMany({
        where,
        include: { wallet: { select: { balance: true } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        role: row.role,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        sessionsTaught: row.sessionsTaught,
        sessionsLearned: row.sessionsLearned,
        balance: row.wallet?.balance ?? 0,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async setUserStatus(
    adminId: string,
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED',
  ): Promise<void> {
    if (adminId === userId) {
      throw AppException.unprocessable(
        ApiErrorCode.VALIDATION_ERROR,
        'Você não pode alterar a sua própria conta.',
      );
    }
    const target = await this.prisma.profile.findUnique({ where: { id: userId } });
    if (!target) throw AppException.notFound('Não encontramos essa pessoa.');
    if (target.status === 'DELETED') {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Essa conta foi excluída pela própria pessoa.',
      );
    }
    await this.prisma.profile.update({ where: { id: userId }, data: { status } });
  }

  async listReports(query: AdminListReportsQuery): Promise<Paginated<AdminReportView>> {
    const where: Prisma.ReportWhereInput = query.status ? { status: query.status } : {};
    const [total, rows] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, displayName: true } },
          target: { select: { id: true, displayName: true, status: true } },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => ({
        id: row.id,
        reason: row.reason,
        details: row.details,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        resolutionNote: row.resolutionNote,
        reporter: row.reporter,
        target: row.target,
        sessionId: row.sessionId,
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async updateReport(
    adminId: string,
    id: string,
    input: {
      status: 'OPEN' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
      resolutionNote?: string | null | undefined;
    },
  ): Promise<void> {
    const closed = input.status === 'RESOLVED' || input.status === 'DISMISSED';
    const result = await this.prisma.report.updateMany({
      where: { id },
      data: {
        status: input.status,
        resolutionNote: input.resolutionNote ?? null,
        resolvedById: closed ? adminId : null,
        resolvedAt: closed ? new Date() : null,
      },
    });
    if (result.count === 0) throw AppException.notFound('Não encontramos essa denúncia.');
  }

  async listSkills(): Promise<AdminSkillView[]> {
    const rows = await this.prisma.skill.findMany({
      include: { category: { select: { name: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      isActive: row.isActive,
      categoryId: row.categoryId,
      categoryName: row.category.name,
    }));
  }

  async createSkill(input: { categoryId: string; name: string }): Promise<void> {
    const category = await this.prisma.skillCategory.findUnique({
      where: { id: input.categoryId },
    });
    if (!category) throw AppException.notFound('Categoria não encontrada.');
    const slug = slugify(input.name);
    if (await this.prisma.skill.findUnique({ where: { slug } })) {
      throw AppException.conflict(
        ApiErrorCode.CONFLICT,
        'Já existe um conhecimento com esse nome.',
      );
    }
    await this.prisma.skill.create({
      data: { name: input.name, slug, categoryId: input.categoryId },
    });
  }

  async updateSkill(
    id: string,
    input: {
      name?: string | undefined;
      categoryId?: string | undefined;
      isActive?: boolean | undefined;
    },
  ): Promise<void> {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw AppException.notFound('Conhecimento não encontrado.');
    // O slug (identificador estável) não muda ao renomear.
    await this.prisma.skill.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
  }

  async listCategories(): Promise<{ id: string; name: string }[]> {
    return this.prisma.skillCategory.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    });
  }

  /** Ajuste manual de créditos: único caminho "manual", sempre auditado no ledger com o id do admin. */
  async adjustCredits(
    adminId: string,
    input: { userId: string; amount: number; description: string },
  ): Promise<number> {
    const exists = await this.prisma.wallet.findUnique({ where: { userId: input.userId } });
    if (!exists) throw AppException.notFound('Não encontramos essa carteira.');
    return this.prisma.$transaction((tx) => this.ledger.adjust(tx, { ...input, adminId }));
  }

  async listDisputes(): Promise<AdminDisputeView[]> {
    const rows = await this.prisma.session.findMany({
      where: { status: 'DISPUTED' },
      include: {
        skill: { select: { name: true } },
        mentor: { select: { id: true, displayName: true } },
        student: { select: { id: true, displayName: true } },
      },
      orderBy: { startsAt: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({
      id: row.id,
      skillName: row.skill.name,
      startsAt: row.startsAt.toISOString(),
      durationMinutes: row.durationMinutes,
      creditCost: row.creditCost,
      mentor: row.mentor,
      student: row.student,
    }));
  }
}
