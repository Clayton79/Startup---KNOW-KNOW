import type { NotificationView, Paginated, UnreadCount } from '@know-know/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

const unreadKey = ['notifications', 'unread'] as const;

/** Atualiza o contador em segundo plano, sem recarregar a página. */
export function useUnreadCount() {
  return useQuery({
    queryKey: unreadKey,
    queryFn: () => api.get<UnreadCount>('/notifications/unread-count'),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });
}

export function useNotifications(page: number) {
  return useQuery({
    queryKey: ['notifications', 'list', page],
    queryFn: () => api.get<Paginated<NotificationView>>('/notifications', { page, pageSize: 20 }),
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<void>(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<void>('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}
