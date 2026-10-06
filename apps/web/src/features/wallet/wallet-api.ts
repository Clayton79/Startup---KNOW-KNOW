import type { Paginated, TransactionView, WalletView } from '@know-know/shared';
import { api } from '@/lib/api-client';

export const walletApi = {
  get: () => api.get<WalletView>('/wallet'),
  transactions: (page: number) =>
    api.get<Paginated<TransactionView>>('/wallet/transactions', { page, pageSize: 15 }),
};
