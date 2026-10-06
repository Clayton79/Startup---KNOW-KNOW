import type {
  CreateReviewInput,
  Paginated,
  PendingReviewView,
  ReviewView,
} from '@know-know/shared';
import { api } from '@/lib/api-client';

export const reviewsApi = {
  create: (sessionId: string, input: CreateReviewInput) =>
    api.post<ReviewView>(`/sessions/${sessionId}/reviews`, input),
  received: (page: number) => api.get<Paginated<ReviewView>>('/me/reviews', { page, pageSize: 10 }),
  pending: () => api.get<PendingReviewView[]>('/me/reviews/pending'),
  forUser: (userId: string, page: number) =>
    api.get<Paginated<ReviewView>>(`/users/${userId}/reviews`, { page, pageSize: 5 }),
};
