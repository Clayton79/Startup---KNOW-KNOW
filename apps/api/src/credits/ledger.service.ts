import { Injectable } from '@nestjs/common';
import { ApiErrorCode, type CreditTransactionType } from '@know-know/shared';
import { AppException } from '../common/errors/app-exception';
import type { Prisma } from '../generated/prisma/client';

export interface LedgerEntry {
  userId: string;
  type: CreditTransactionType;
  /** Positivo = entrada, negativo = saída. Nunca zero. */
  amount: number;
  description: string;
  sessionId?: string | null;
  createdById?: string | null;
}

export interface SettleInput {
  sessionId: string;
  studentId: string;
  mentorId: string;
  amount: number;
  skillName: string;
}

type Tx = Prisma.TransactionClient;

/**
 * Único ponto que movimenta créditos. Toda operação roda dentro de uma transação do chamador
 * (`tx`), usa UPDATE atômico condicionado (que trava a linha da carteira) e grava linhas
 * imutáveis no ledger com o saldo resultante.
 *
 * Modelo:
 *  - balance: créditos totais.
 *  - held: parte reservada por solicitações em andamento (escrow).
 *  - Disponível = balance − held. O banco ainda garante balance ≥ 0 e held ≤ balance (CHECK).
 */
@Injectable()
export class LedgerService {
  /** Entrada de créditos (bônus, ganho de aula, estorno, ajuste positivo). */
  async credit(tx: Tx, entry: LedgerEntry): Promise<number> {
    if (entry.amount <= 0) throw new Error('credit() exige valor positivo');

    const rows = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE wallets
      SET balance = balance + ${entry.amount}, updated_at = now()
      WHERE user_id = ${entry.userId}::uuid
      RETURNING balance`;
    const balance = rows[0]?.balance;
    if (balance === undefined) throw new Error('Carteira inexistente');

    await this.record(tx, entry, balance);
    return balance;
  }

  /** Reserva créditos para uma solicitação de aula. Falha se o disponível não cobrir. */
  async hold(tx: Tx, userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;

    const rows = await tx.$queryRaw<{ held: number }[]>`
      UPDATE wallets
      SET held = held + ${amount}, updated_at = now()
      WHERE user_id = ${userId}::uuid AND balance - held >= ${amount}
      RETURNING held`;
    if (rows.length > 0) return;

    const wallet = await tx.wallet.findUnique({ where: { userId } });
    const available = wallet ? wallet.balance - wallet.held : 0;
    const missing = Math.max(amount - available, 1);
    throw new AppException(
      ApiErrorCode.INSUFFICIENT_CREDITS,
      `Você precisa de mais ${missing} ${missing === 1 ? 'crédito' : 'créditos'} para marcar esta aula.`,
      409,
    );
  }

  /** Libera uma reserva (solicitação recusada, cancelada ou aula que não aconteceu). */
  async release(tx: Tx, userId: string, amount: number): Promise<void> {
    if (amount <= 0) return;

    const rows = await tx.$queryRaw<{ held: number }[]>`
      UPDATE wallets
      SET held = held - ${amount}, updated_at = now()
      WHERE user_id = ${userId}::uuid AND held >= ${amount}
      RETURNING held`;
    if (rows.length === 0) throw new Error('Reserva de créditos inconsistente');
  }

  /**
   * Liquida uma aula: o aluno gasta a reserva e o mentor recebe. As duas carteiras são atualizadas
   * em ordem fixa de id, para que liquidações cruzadas simultâneas não gerem deadlock.
   */
  async settle(tx: Tx, input: SettleInput): Promise<void> {
    const { sessionId, studentId, mentorId, amount, skillName } = input;
    if (amount <= 0) return;

    const spend = async (): Promise<number> => {
      const rows = await tx.$queryRaw<{ balance: number }[]>`
        UPDATE wallets
        SET balance = balance - ${amount}, held = held - ${amount}, updated_at = now()
        WHERE user_id = ${studentId}::uuid AND held >= ${amount} AND balance >= ${amount}
        RETURNING balance`;
      const balance = rows[0]?.balance;
      if (balance === undefined) throw new Error('Reserva do aluno inconsistente');
      return balance;
    };
    const earn = async (): Promise<number> => {
      const rows = await tx.$queryRaw<{ balance: number }[]>`
        UPDATE wallets
        SET balance = balance + ${amount}, updated_at = now()
        WHERE user_id = ${mentorId}::uuid
        RETURNING balance`;
      const balance = rows[0]?.balance;
      if (balance === undefined) throw new Error('Carteira do mentor inexistente');
      return balance;
    };

    let studentBalance: number;
    let mentorBalance: number;
    if (studentId < mentorId) {
      studentBalance = await spend();
      mentorBalance = await earn();
    } else {
      mentorBalance = await earn();
      studentBalance = await spend();
    }

    await this.record(
      tx,
      {
        userId: studentId,
        type: 'SPENT_CLASS',
        amount: -amount,
        sessionId,
        description: `Aula de ${skillName}`,
      },
      studentBalance,
    );
    await this.record(
      tx,
      {
        userId: mentorId,
        type: 'EARNED_CLASS',
        amount,
        sessionId,
        description: `Aula de ${skillName} que você ensinou`,
      },
      mentorBalance,
    );
  }

  /** Ajuste manual feito por um administrador (positivo ou negativo). Nunca deixa o saldo abaixo do reservado. */
  async adjust(
    tx: Tx,
    input: { userId: string; amount: number; description: string; adminId: string },
  ): Promise<number> {
    if (input.amount === 0) throw new Error('adjust() exige valor diferente de zero');

    const rows = await tx.$queryRaw<{ balance: number }[]>`
      UPDATE wallets
      SET balance = balance + ${input.amount}, updated_at = now()
      WHERE user_id = ${input.userId}::uuid AND balance + ${input.amount} >= held
      RETURNING balance`;
    const balance = rows[0]?.balance;
    if (balance === undefined) {
      throw AppException.unprocessable(
        ApiErrorCode.INSUFFICIENT_CREDITS,
        'O ajuste deixaria o saldo abaixo do que já está reservado para aulas.',
      );
    }

    await this.record(
      tx,
      {
        userId: input.userId,
        type: 'ADMIN_ADJUSTMENT',
        amount: input.amount,
        description: input.description,
        createdById: input.adminId,
      },
      balance,
    );
    return balance;
  }

  private async record(tx: Tx, entry: LedgerEntry, balanceAfter: number): Promise<void> {
    await tx.creditTransaction.create({
      data: {
        userId: entry.userId,
        type: entry.type,
        amount: entry.amount,
        balanceAfter,
        sessionId: entry.sessionId ?? null,
        description: entry.description,
        createdById: entry.createdById ?? null,
      },
    });
  }
}
