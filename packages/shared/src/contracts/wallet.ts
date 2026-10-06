import type { CreditTransactionType } from '../enums';

export interface WalletView {
  /** Créditos totais. */
  balance: number;
  /** Parte reservada por solicitações de aula em andamento. */
  held: number;
  /** O que dá para gastar agora (balance − held). */
  available: number;
}

export interface TransactionView {
  id: string;
  type: CreditTransactionType;
  /** Positivo = entrada, negativo = saída. */
  amount: number;
  balanceAfter: number;
  description: string;
  sessionId: string | null;
  createdAt: string;
}
