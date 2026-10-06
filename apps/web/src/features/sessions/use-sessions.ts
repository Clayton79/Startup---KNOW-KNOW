import type { SessionView } from '@know-know/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sessionsApi } from './sessions-api';

type ListParams = Parameters<typeof sessionsApi.list>[0];

export const sessionKeys = {
  all: ['sessions'] as const,
  list: (params: ListParams) => ['sessions', 'list', params] as const,
  detail: (id: string) => ['sessions', 'detail', id] as const,
};

export function useSessions(params: ListParams) {
  return useQuery({
    queryKey: sessionKeys.list(params),
    queryFn: () => sessionsApi.list(params),
    placeholderData: keepPreviousData,
  });
}

export function useSession(id: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(id ?? ''),
    queryFn: () => sessionsApi.get(id as string),
    enabled: Boolean(id),
  });
}

export function useSlots(userId: string | undefined, durationMinutes: number) {
  return useQuery({
    queryKey: ['slots', userId, durationMinutes],
    queryFn: () => sessionsApi.slots(userId as string, durationMinutes),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
}

/**
 * Qualquer mudança em uma aula afeta listas, painel, saldo (reserva/liberação) e notificações:
 * depois de uma ação, tudo isso é recarregado, e a aula afetada já entra no cache com a resposta.
 */
export function useSessionMutation<TInput>(mutationFn: (input: TInput) => Promise<SessionView>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async (session) => {
      queryClient.setQueryData(sessionKeys.detail(session.id), session);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: sessionKeys.all, refetchType: 'active' }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['wallet'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
        queryClient.invalidateQueries({ queryKey: ['slots'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
      ]);
    },
  });
}
