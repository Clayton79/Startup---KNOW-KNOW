import { Injectable } from '@nestjs/common';
import type {
  NotificationType,
  NotificationView,
  Paginated,
  PaginationQuery,
} from '@know-know/shared';
import { PrismaService } from '../database/prisma.service';
import type { Prisma } from '../generated/prisma/client';
import { StorageService } from '../storage/storage.service';

export interface NewNotification {
  userId: string;
  type: NotificationType;
  sessionId?: string | null;
  actorId?: string | null;
  amount?: number | null;
}

type Client = Prisma.TransactionClient | PrismaService;

interface Rendered {
  title: string;
  body: string;
  link: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Cria uma notificação. Passe `tx` para que ela só exista se a operação principal for confirmada. */
  async create(client: Client, input: NewNotification): Promise<void> {
    await client.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        sessionId: input.sessionId ?? null,
        actorId: input.actorId ?? null,
        amount: input.amount ?? null,
      },
    });
  }

  async list(
    userId: string,
    { page, pageSize }: PaginationQuery,
  ): Promise<Paginated<NotificationView>> {
    const [total, rows] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { session: { select: { skill: { select: { name: true } } } } },
      }),
    ]);

    const actorIds = [
      ...new Set(rows.map((row) => row.actorId).filter((id): id is string => !!id)),
    ];
    const actors = actorIds.length
      ? await this.prisma.profile.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, displayName: true, avatarPath: true },
        })
      : [];
    const actorById = new Map(actors.map((actor) => [actor.id, actor]));

    const items = rows.map((row): NotificationView => {
      const actor = row.actorId ? (actorById.get(row.actorId) ?? null) : null;
      const rendered = this.render(
        row.type,
        actor?.displayName ?? null,
        row.session?.skill.name ?? 'um conhecimento',
        row.amount,
        row.sessionId,
      );
      return {
        id: row.id,
        type: row.type,
        ...rendered,
        read: row.readAt !== null,
        createdAt: row.createdAt.toISOString(),
        actor: actor
          ? {
              id: actor.id,
              displayName: actor.displayName,
              avatarUrl: this.storage.avatarPublicUrl(actor.avatarPath),
            }
          : null,
      };
    });

    return { items, page, pageSize, total };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /** Só marca se a notificação for do próprio usuário (a condição de dono vai na própria query). */
  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private render(
    type: NotificationType,
    actorName: string | null,
    skill: string,
    amount: number | null,
    sessionId: string | null,
  ): Rendered {
    const actor = actorName ?? 'Alguém';
    const sessionLink = sessionId ? `/aulas/${sessionId}` : '/aulas';
    switch (type) {
      case 'SESSION_REQUESTED':
        return {
          title: 'Nova solicitação de aula',
          body: `${actor} gostaria de aprender ${skill} com você.`,
          link: sessionLink,
        };
      case 'SESSION_ACCEPTED':
        return {
          title: 'Aula aceita',
          body: `${actor} aceitou a aula de ${skill}.`,
          link: sessionLink,
        };
      case 'SESSION_REJECTED':
        return {
          title: 'Solicitação recusada',
          body: `${actor} não poderá fazer a aula de ${skill} dessa vez. Seus créditos foram liberados.`,
          link: sessionLink,
        };
      case 'SESSION_CANCELLED':
        return {
          title: 'Aula cancelada',
          body: actorName
            ? `${actor} cancelou a aula de ${skill}.`
            : `A aula de ${skill} não aconteceu e foi encerrada. Os créditos reservados foram liberados.`,
          link: sessionLink,
        };
      case 'SESSION_EXPIRED':
        return {
          title: 'Solicitação expirada',
          body: `O horário da aula de ${skill} passou sem resposta. Os créditos reservados foram liberados.`,
          link: sessionLink,
        };
      case 'SESSION_TIME_PROPOSED':
        return {
          title: 'Novo horário sugerido',
          body: `${actor} sugeriu outro horário para a aula de ${skill}.`,
          link: sessionLink,
        };
      case 'SESSION_REMINDER':
        return {
          title: 'Sua aula é em breve',
          body: `A aula de ${skill} com ${actor} está chegando.`,
          link: sessionLink,
        };
      case 'SESSION_COMPLETED':
        return {
          title: 'Aula concluída',
          body: `A aula de ${skill} com ${actor} foi concluída. Que tal deixar sua avaliação?`,
          link: sessionLink,
        };
      case 'SESSION_DISPUTED':
        return {
          title: 'Aula em revisão',
          body: `Você e ${actor} responderam diferente sobre a aula de ${skill}. Nossa equipe vai analisar.`,
          link: sessionLink,
        };
      case 'REVIEW_RECEIVED':
        return {
          title: 'Você recebeu uma avaliação',
          body: `${actor} avaliou a aula de ${skill}.`,
          link: '/avaliacoes',
        };
      case 'CREDITS_RECEIVED':
        return {
          title: 'Créditos recebidos',
          body: `Você recebeu ${amount ?? 0} ${amount === 1 ? 'crédito' : 'créditos'} pela aula de ${skill}.`,
          link: '/carteira',
        };
    }
  }
}
