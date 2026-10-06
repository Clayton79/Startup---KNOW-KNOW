import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { walletApi } from './wallet-api';

export const walletQueryKey = ['wallet'] as const;

export function useWallet() {
  return useQuery({ queryKey: walletQueryKey, queryFn: walletApi.get, staleTime: 15_000 });
}

export function useTransactions(page: number) {
  return useQuery({
    queryKey: ['wallet', 'transactions', page],
    queryFn: () => walletApi.transactions(page),
    placeholderData: keepPreviousData,
  });
}
