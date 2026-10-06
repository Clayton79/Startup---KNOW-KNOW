import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { reviewsApi } from './reviews-api';

export function useReceivedReviews(page: number) {
  return useQuery({
    queryKey: ['reviews', 'received', page],
    queryFn: () => reviewsApi.received(page),
    placeholderData: keepPreviousData,
  });
}

export function usePendingReviews() {
  return useQuery({ queryKey: ['reviews', 'pending'], queryFn: reviewsApi.pending });
}

export function useUserReviews(userId: string | undefined, page: number) {
  return useQuery({
    queryKey: ['reviews', 'user', userId, page],
    queryFn: () => reviewsApi.forUser(userId as string, page),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}
