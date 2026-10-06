import { Injectable } from '@nestjs/common';
import type { Paginated, PaginationQuery, TransactionView, WalletView } from '@know-know/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class CreditsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(userId: string): Promise<WalletView> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const balance = wallet?.balance ?? 0;
    const held = wallet?.held ?? 0;
    return { balance, held, available: balance - held };
  }

  async listTransactions(
    userId: string,
    { page, pageSize }: PaginationQuery,
  ): Promise<Paginated<TransactionView>> {
    const [total, rows] = await Promise.all([
      this.prisma.creditTransaction.count({ where: { userId } }),
      this.prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        type: row.type,
        amount: row.amount,
        balanceAfter: row.balanceAfter,
        description: row.description,
        sessionId: row.sessionId,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      pageSize,
      total,
    };
  }
}
